(function (window) {
  'use strict';

  // The previous implementation is commented in player_persistence_session_legacy.js.
  const KEY = 'mediahz.currentSong.v2.1', API = '/api/users/me/player';
  const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  let instance;

  function create({ player, playlist, ownerId, storage: suppliedStorage }) {
    let storage;
    try { storage = suppliedStorage || window.sessionStorage; storage.removeItem(KEY); } catch { /* DB persistence does not depend on browser storage. */ }
    let owner = validId(ownerId) ? ownerId : null, epoch = 0, ready = false, suspended = false, applying = false;
    let desired = null, acknowledged = null, dirty = false, timer, writing = null, reading = null;
    let revision = 0, lastSong = player.getState().currentSong?.id || null, lastStatus = player.getState().status;
    const cacheKey = id => KEY + ':' + (id || 'guest');
    function cache(id, account = owner) {
      try { if (id) storage?.setItem(cacheKey(account), id); else storage?.removeItem(cacheKey(account)); } catch { }
    }
    function cached() {
      try { const id = storage?.getItem(cacheKey(owner)); return validId(id) ? id : null; } catch { return null; }
    }
    function stop() {
      applying = true;
      try { player.stop(); playlist.clear(); } finally { applying = false; }
      lastSong = null; lastStatus = 'idle';
    }
    function reset(nextOwner) {
      clearTimeout(timer); reading?.abort(); reading = null;
      cache(null); cache(null, null);
      epoch++; revision++; owner = nextOwner; ready = false; dirty = false; suspended = false;
      desired = acknowledged = null;
      stop();
    }
    async function api(options = {}) {
      const response = await window.fetch(API, { credentials: 'same-origin', cache: 'no-store',
        ...options, signal: options.signal || AbortSignal.timeout(10000),
        headers: { Accept: 'application/json', ...(options.headers || {}) },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw Object.assign(new Error(result.message || 'Cannot sync the selected song.'), { status: response.status });
      if (!validId(result.data?.userId) || (result.data.currentSongId !== null && !validId(result.data.currentSongId))) {
        throw new Error('Invalid player state response.');
      }
      return result.data;
    }
    function schedule() {
      clearTimeout(timer);
      if (ready && owner && !suspended && dirty) timer = setTimeout(save, 300);
    }
    function save(force = false) {
      if (writing || !ready || !owner || (!force && suspended) || !dirty) return writing || Promise.resolve();
      const account = owner, generation = epoch, songId = desired;
      dirty = false;
      const task = api({ method: 'PUT', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'X-Player-Owner': account },
        body: JSON.stringify({ currentSongId: songId }),
      }).then(data => {
        if (generation !== epoch || account !== owner) return;
        if (data.userId !== account) throw new Error('Player account changed.');
        acknowledged = songId; dirty = desired !== acknowledged;
      }).catch(error => {
        if (generation !== epoch || account !== owner) return;
        dirty = desired !== acknowledged;
        if (!suspended && (error.status === 401 || error.status === 409)) refresh();
        else console.warn('Cannot save selected song:', error.message);
      }).finally(() => {
        if (writing === task) writing = null;
        // Retry a newer selection, but do not loop on a failing unchanged request.
        if (dirty && (generation !== epoch || desired !== songId)) schedule();
      });
      writing = task;
      return task;
    }
    async function flush(force = false) {
      clearTimeout(timer);
      if (writing) await writing;
      if (dirty) await save(force);
    }
    async function restore(songId, generation) {
      if (!songId || generation !== epoch || player.getState().currentSong || player.getState().status === 'loading') return;
      lastSong = songId; cache(songId);
      try {
        const state = await player.playSong(songId, { autoplay: false });
        if (generation !== epoch || state?.currentSong?.id !== songId || player.getState().currentSong?.id !== songId) return;
        if (!playlist.getState().initialized) playlist.setPlaylist([state.currentSong], { currentSongId: songId });
      } catch (error) {
        if (generation !== epoch || player.getState().currentSong) return;
        if (error.status === 404 || error.status === 410) {
          lastSong = desired = null; cache(null); dirty = Boolean(owner); schedule();
        }
        console.warn('Cannot restore saved song:', error.message);
      }
    }
    async function refresh(initial = false) {
      if (suspended) return;
      reading?.abort();
      const controller = new AbortController(); reading = controller;
      let generation = epoch;
      const selectedAtStart = revision;
      try {
        const data = await api({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
        if (generation !== epoch || controller.signal.aborted || suspended) return;
        const accountChanged = data.userId !== owner;
        if (accountChanged) { reset(data.userId); generation = epoch; }
        // A local selection made while GET was pending must win over restoration.
        const hydrate = !ready && !dirty && (revision === selectedAtStart || accountChanged);
        acknowledged = data.currentSongId;
        if (dirty) dirty = desired !== acknowledged;
        ready = true;
        if (hydrate && !player.getState().currentSong && player.getState().status !== 'loading') {
          desired = data.currentSongId; cache(desired);
          await restore(data.currentSongId, generation);
        }
        if (generation === epoch) schedule();
      } catch (error) {
        if (generation !== epoch || controller.signal.aborted || suspended) return;
        if (error.status === 401) {
          if (owner) reset(null);
          ready = true;
          if (initial && revision === selectedAtStart) await restore(cached(), epoch);
        } else {
          if (initial && revision === selectedAtStart) await restore(cached(), epoch);
          console.warn('Cannot load saved player state:', error.message);
        }
      } finally { if (reading === controller) reading = null; }
    }
    player.subscribe(state => {
      const previousStatus = lastStatus; lastStatus = state.status;
      if (applying || suspended) return;
      if (state.status === 'loading') { if (previousStatus !== 'loading') revision++; return; }
      const songId = validId(state.currentSong?.id) ? state.currentSong.id : state.status === 'idle' ? null : undefined;
      if (songId === undefined || songId === lastSong) return;
      lastSong = songId; revision++; desired = songId; cache(songId);
      dirty = Boolean(owner) && (!ready || desired !== acknowledged); schedule();
    });
    async function changeAccount(id) {
      const next = validId(id) ? id : null;
      if (next !== owner || suspended) reset(next);
      return refresh();
    }
    async function signOut() {
      const generation = epoch;
      suspended = true; reading?.abort(); clearTimeout(timer);
      cache(null); cache(null, null);
      stop();
      await flush(true);
      if (generation !== epoch) return;
      epoch++; owner = null; ready = false; desired = acknowledged = null; dirty = false;
    }
    window.addEventListener('online', () => refresh());
    window.addEventListener('pagehide', event => { if (!event.persisted && !suspended) flush(); });
    return { start: () => refresh(true), changeAccount, signOut, refresh, flush };
  }
  function init(options) {
    if (!instance) { instance = create(options); instance.ready = instance.start(); }
    return instance.ready;
  }
  window.PlayerPersistenceV2_1 = Object.freeze({ init,
    changeAccount: id => instance?.changeAccount(id),
    signOut: () => instance?.signOut(),
    refresh: () => instance?.refresh(),
    flush: () => instance?.flush(),
  });
})(window);
