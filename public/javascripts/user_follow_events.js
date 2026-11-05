(function () {
  'use strict';
  if (window.UserFollowEvents) return;
  const isId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  const embedded = window.parent !== window;
  const target = () => embedded ? window.parent : document.getElementById('mediaPlayerFrame')?.contentWindow;
  let authenticated = false;
  const valid = state => state && isId(state.creatorId) && isId(state.userId)
    && typeof state.following === 'boolean' && typeof state.isSelf === 'boolean'
    && Number.isSafeInteger(state.followers) && state.followers >= 0;
  function deliver(state) { window.dispatchEvent(new CustomEvent('userFollowChanged', { detail: state })); }
  function notify(message) {
    if (embedded) { target()?.postMessage({ type: 'followNotice', message }, location.origin); return; }
    let toast = document.getElementById('songEngagementStatus');
    if (!toast) { toast = document.createElement('div'); toast.id = 'songEngagementStatus'; toast.setAttribute('role', 'status'); document.body.append(toast); }
    toast.textContent = message; toast.hidden = false;
    clearTimeout(notify.timer); notify.timer = setTimeout(() => { toast.hidden = true; }, 4000);
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== target()) return;
    const data = event.data;
    if (data?.type === 'userFollowChanged' && valid(data.state)) deliver(data.state);
    if (!embedded && data?.type === 'followAuthRequired' && isId(data.creatorId)) {
      authenticated = false;
      if (window.MediaHzLogin) window.MediaHzLogin.open(); else location.assign('/auth/signin');
    }
    if (!embedded && data?.type === 'followNotice' && typeof data.message === 'string') notify(data.message.slice(0, 300));
  });
  if (!embedded) {
    window.addEventListener('mediahz:authenticated', event => { authenticated = isId(event.detail?.user?.id); });
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('loginPopup')?.addEventListener('close', () => {
        if (!authenticated) target()?.postMessage({ type: 'followLoginCancelled' }, location.origin);
      });
    });
  }
  window.UserFollowEvents = Object.freeze({
    publish(state) {
      if (!valid(state)) return;
      const value = { creatorId: state.creatorId, userId: state.userId, followers: state.followers,
        following: state.following, isSelf: state.isSelf };
      deliver(value); target()?.postMessage({ type: 'userFollowChanged', state: value }, location.origin);
    },
    notify,
  });
})();
