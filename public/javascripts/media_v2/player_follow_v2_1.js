(function () {
  'use strict';
  let initialized = false;
  const isId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  function init({ player }) {
    const button = document.getElementById('mediaFollowBtn');
    if (initialized || !button || !player) return;
    initialized = true;
    let creator = null, owner = document.querySelector('[data-player-owner]')?.dataset.playerOwner || '';
    let ready = false, following = false, self = false, loading = false, pending = null;
    let reading, readVersion = 0, authVersion = 0;
    const writes = new Set();
    const busyKey = (id, actor = owner) => actor + ':' + id;
    const notify = message => window.UserFollowEvents?.notify(message);
    function paint() {
      const busy = loading || writes.has(busyKey(creator?.id));
      button.disabled = !creator || self || busy;
      button.setAttribute('aria-busy', String(busy));
      button.setAttribute('aria-pressed', String(Boolean(creator && following)));
      const label = !creator ? 'Không có thông tin người đăng' : self ? 'Bạn là người đăng'
        : !ready && !loading ? 'Thử tải lại trạng thái theo dõi'
          : (following ? 'Bỏ theo dõi ' : 'Theo dõi ') + creator.name;
      button.title = label; button.setAttribute('aria-label', label);
    }
    function apply(data) {
      if (data.creatorId !== creator?.id) return;
      owner = data.userId || ''; ready = true; following = Boolean(data.following); self = Boolean(data.isSelf);
    }
    async function request(id, desired, actor = owner, signal) {
      const writing = typeof desired === 'boolean';
      const response = await fetch('/api/users/' + encodeURIComponent(id) + '/follow', {
        method: writing ? 'PUT' : 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json', ...(writing ? { 'Content-Type': 'application/json', 'X-Follow-Owner': actor } : {}) },
        ...(writing ? { body: JSON.stringify({ following: desired }) } : {}),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw Object.assign(new Error(result.message || 'Không thể cập nhật theo dõi.'), { status: response.status });
      return result.data;
    }
    async function refresh() {
      reading?.abort();
      const id = creator?.id, revision = ++readVersion, version = authVersion;
      if (!id) { loading = false; paint(); return; }
      const controller = reading = new AbortController();
      loading = true; paint();
      try {
        const data = await request(id, undefined, undefined, controller.signal);
        if (revision === readVersion && version === authVersion && !controller.signal.aborted) apply(data);
      } catch (error) {
        if (controller.signal.aborted || revision !== readVersion || version !== authVersion) return;
        if (error.status === 401) { owner = ''; following = false; self = false; ready = true; }
        else ready = false;
      } finally {
        if (revision === readVersion) { reading = null; loading = false; paint(); }
      }
    }
    function login(intent) {
      pending = intent;
      if (window.parent !== window) window.parent.postMessage({ type: 'followAuthRequired', creatorId: intent.id }, location.origin);
      else location.assign('/auth/signin');
    }
    async function write(intent) {
      const actor = owner, version = authVersion, key = busyKey(intent.id, actor);
      if (!isId(actor) || actor === intent.id || writes.has(key)) return;
      if (creator?.id === intent.id) { reading?.abort(); readVersion++; loading = false; }
      writes.add(key); paint();
      try {
        const data = await request(intent.id, intent.following, actor);
        if (version !== authVersion || owner !== actor) return;
        apply(data); window.UserFollowEvents?.publish(data);
      } catch (error) {
        if (version !== authVersion || owner !== actor) return;
        if (error.status === 401) { owner = ''; following = false; login(intent); }
        else {
          notify(error.status ? error.message : 'Chưa xác nhận kết quả theo dõi. Vui lòng kiểm tra lại.');
          if (error.status === 409 || !error.status) refresh();
        }
      } finally { writes.delete(key); paint(); }
    }
    button.addEventListener('click', () => {
      if (!creator || self) return;
      if (!ready) { refresh(); return; }
      const intent = { id: creator.id, following: !following };
      if (!owner) login(intent); else write(intent);
    });
    const unsubscribe = player.subscribe(state => {
      const candidate = state.currentSong?.creator;
      const next = isId(candidate?.id) ? { id: candidate.id, name: candidate.name || 'MediaHz' } : null;
      if (creator?.id === next?.id) return;
      creator = next; ready = false; following = false; self = Boolean(next && owner === next.id);
      refresh();
    });
    window.addEventListener('message', event => {
      if (event.source !== window.parent || event.origin !== location.origin) return;
      const data = event.data;
      if (data?.type === 'followLoginCancelled') pending = null;
      if (data?.type === 'authChanged') {
        const intent = pending; pending = null; authVersion++;
        owner = isId(data.userId) ? data.userId : '';
        ready = false; following = false; self = Boolean(creator && owner === creator.id);
        refresh();
        // The explicit login action belongs to the clicked creator, not a newly restored song.
        if (intent && owner) write(intent);
      }
      if (data?.type === 'playerSessionCheck' && !loading && !writes.size) refresh();
    });
    window.addEventListener('userFollowChanged', event => {
      const data = event.detail;
      if (data?.creatorId !== creator?.id) return;
      if (owner && owner !== data.userId) refresh(); else { apply(data); paint(); }
    });
    window.addEventListener('pagehide', event => {
      reading?.abort(); readVersion++; loading = false; pending = null;
      if (!event.persisted) unsubscribe?.();
    });
    window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
    paint();
  }
  window.PlayerFollowV2_1 = Object.freeze({ init });
})();
