(function (window) {
  'use strict';

  const API = '/api/account/preferences';
  const DEFAULTS = Object.freeze({ rememberSong: true, rememberVolume: true, autoNext: true, volume: 1 });
  const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  let instance;

  function create({ player, ownerId }) {
    let owner = validId(ownerId) ? ownerId : null, epoch = 0, readVersion = 0;
    let playback = { ...DEFAULTS }, ready = false, suspended = false, supported = true;
    let applying = false, dirty = false, revision = 0, settingsVersion = 0, reading = null, writing = null, timer;
    let lastVolume = player.getState().volume;
    const listeners = new Set();
    const getState = () => ({ viewerId: owner, ready, playback: { ...playback } });
    const emit = () => listeners.forEach(listener => listener(getState()));

    function setVolume(volume) {
      applying = true;
      try { player.setVolume(volume); } finally { lastVolume = player.getState().volume; applying = false; }
    }
    function reset(id) {
      clearTimeout(timer); writing?.controller.abort();
      epoch++; owner = id; ready = false; dirty = false; revision++; settingsVersion++;
      playback = { ...DEFAULTS }; supported = true;
      setVolume(1); emit();
    }
    function normalize(preferences) {
      const source = preferences?.playback || {}, next = { ...DEFAULTS };
      for (const key of ['rememberSong', 'rememberVolume', 'autoNext']) {
        if (typeof source[key] === 'boolean') next[key] = source[key];
      }
      if (Number.isFinite(source.volume) && source.volume >= 0 && source.volume <= 1) next.volume = source.volume;
      return next;
    }
    function schedule() {
      clearTimeout(timer);
      if (ready && supported && owner && !suspended && playback.rememberVolume && dirty) timer = setTimeout(save, 350);
    }
    function accept(preferences, initial = false, keepVolume = false) {
      playback = normalize(preferences); ready = true; settingsVersion++;
      if (!playback.rememberVolume) {
        clearTimeout(timer); dirty = false; writing?.controller.abort();
        // A settings toggle keeps the live volume. A new owner starts at the default.
        if (initial) setVolume(1);
      } else if (!dirty) {
        if (keepVolume) playback.volume = lastVolume;
        else setVolume(playback.volume);
      }
      else dirty = lastVolume !== playback.volume;
      emit(); schedule();
    }
    async function api(options = {}) {
      const response = await window.fetch(API, { credentials: 'same-origin', cache: 'no-store', ...options,
        headers: { Accept: 'application/json', ...(options.headers || {}) } });
      const result = await response.json();
      if (!response.ok || !result.success) throw Object.assign(new Error('Cannot sync playback preferences.'), { status: response.status });
      return result.data;
    }
    function refresh() {
      if (suspended) return Promise.resolve(getState());
      reading?.controller.abort();
      reading?.release();
      const controller = new AbortController(), requestVersion = ++readVersion, generation = epoch;
      const selectedRevision = revision, savingAtStart = Boolean(writing && !writing.controller.signal.aborted);
      const task = (async () => {
        try {
          const data = await api({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
          if (generation !== epoch || requestVersion !== readVersion || controller.signal.aborted || suspended) return getState();
          // Legacy fixtures/deployments may have no preferences endpoint or field.
          if (!data?.preferences) { supported = false; accept(null, !ready); return getState(); }
          if (!validId(data.viewerId)) throw new Error('Invalid playback preferences owner.');
          const accountChanged = data.viewerId !== owner;
          if (accountChanged) reset(data.viewerId);
          // A GET snapshot may predate a volume PATCH that finished while the
          // read was pending, or one already in flight when that read began.
          supported = true; accept(data.preferences, !ready,
            !accountChanged && (selectedRevision !== revision || savingAtStart));
        } catch (error) {
          if (generation !== epoch || requestVersion !== readVersion || controller.signal.aborted || suspended) return getState();
          if (error.status === 401) { if (owner) reset(null); ready = true; emit(); }
          else if (!ready) { supported = false; accept(null, true); }
        }
        return getState();
      })();
      // An authoritative settings event can finish hydration immediately even
      // if a legacy fetch/mock ignores AbortSignal and leaves its GET pending.
      let release;
      const replaced = new Promise(resolve => { release = resolve; });
      const completion = Promise.race([task, replaced]);
      reading = { controller, promise: completion, release: () => release(getState()) };
      task.finally(() => { if (reading?.promise === completion) reading = null; });
      return completion;
    }
    function apply(data) {
      if (suspended || !validId(data?.viewerId) || data.viewerId !== owner || !data.preferences) return;
      const pending = reading;
      readVersion++; pending?.controller.abort(); reading = null;
      supported = true; accept(data.preferences, !ready);
      pending?.release();
    }
    function save() {
      if (writing || !ready || !supported || !owner || suspended || !playback.rememberVolume || !dirty) return writing?.promise || Promise.resolve();
      const account = owner, generation = epoch, selectedRevision = revision, selectedSettings = settingsVersion, volume = lastVolume;
      const controller = new AbortController();
      dirty = false;
      const task = api({ method: 'PATCH', keepalive: true,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        headers: { 'Content-Type': 'application/json', 'X-Settings-Owner': account },
        body: JSON.stringify({ playback: { volume } }),
      }).then(data => {
        if (generation !== epoch || account !== owner || controller.signal.aborted || suspended) return;
        if (data?.viewerId !== account) throw new Error('Playback preferences owner changed.');
        // Never reapply a PATCH response: newer settings events and volume drags win.
        if (selectedRevision === revision && selectedSettings === settingsVersion) playback.volume = volume;
      }).catch(error => {
        if (generation !== epoch || account !== owner || controller.signal.aborted || suspended) return;
        // A later input/refresh can retry; unchanged failures must not loop.
        dirty = true;
        if (error.status === 401 || error.status === 409) refresh();
      }).finally(() => {
        if (writing?.promise === task) writing = null;
        if (generation !== epoch || selectedRevision !== revision) schedule();
      });
      writing = { controller, promise: task };
      return task;
    }
    player.subscribe(state => {
      if (state.volume === lastVolume) return;
      lastVolume = state.volume;
      if (applying || suspended) return;
      revision++;
      dirty = Boolean(owner) && (!ready || playback.rememberVolume);
      schedule();
    });
    async function changeAccount(id) {
      const next = validId(id) ? id : null;
      if (next !== owner || suspended) {
        readVersion++; reading?.controller.abort(); suspended = false; reset(next);
      }
      return refresh();
    }
    function signOut() {
      suspended = true; readVersion++; reading?.controller.abort(); reset(null);
      reading?.release();
    }
    async function flush() {
      clearTimeout(timer);
      if (writing) await writing.promise;
      if (dirty) await save();
    }
    const event = event => apply(event.detail);
    window.addEventListener('mediahz:preferences', event);
    try { if (window.parent !== window) window.parent.addEventListener('mediahz:preferences', event); } catch { /* postMessage handles other frame boundaries. */ }
    window.addEventListener('pagehide', event => { if (!event.persisted) flush(); });
    return { getState, refresh, changeAccount, signOut, apply, flush,
      whenReady: () => reading?.promise || Promise.resolve(getState()),
      subscribe(listener) { listeners.add(listener); listener(getState()); return () => listeners.delete(listener); },
    };
  }
  window.PlayerPreferencesV2_1 = Object.freeze({
    init(options) { if (!instance) { instance = create(options); return instance.refresh(); } return instance.whenReady(); },
    getState: () => instance?.getState(),
    whenReady: () => instance?.whenReady(),
    subscribe: listener => instance?.subscribe(listener),
    refresh: () => instance?.refresh(),
    changeAccount: id => instance?.changeAccount(id),
    signOut: () => instance?.signOut(),
    apply: data => instance?.apply(data),
    flush: () => instance?.flush(),
  });
})(window);
