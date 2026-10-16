(function () {
  if (window.MediaHzNotifications) return;
  const storageKey = 'mediahz-upload-notifications';
  const ownerKey = storageKey + '-owner';
  const owner = document.querySelector('[data-notification-owner]')?.dataset.notificationOwner;
  let entries = [];
  try {
    if (owner !== undefined && sessionStorage.getItem(ownerKey) !== owner) {
      sessionStorage.removeItem(storageKey);
      sessionStorage.setItem(ownerKey, owner);
    }
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) entries = saved.filter(item => item &&
      typeof item.id === 'string' && typeof item.title === 'string' &&
      typeof item.message === 'string' && ['success', 'error', 'warning'].includes(item.status) &&
      Number.isFinite(item.time)).slice(0, 20);
  } catch { /* Storage is optional, including in private browsing. */ }
  let panel, list, badge, toast, toastTimer;
  const bell = document.getElementById('notification');
  function save() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(entries)); } catch {}
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function close() {
    if (!panel) return;
    panel.hidden = true;
    bell?.setAttribute('aria-expanded', 'false');
  }
  function render() {
    const unread = entries.filter(item => !item.read).length;
    if (badge) { badge.textContent = unread > 9 ? '9+' : String(unread); badge.hidden = !unread; }
    bell?.setAttribute('aria-label', unread ? 'Thông báo, ' + unread + ' chưa đọc' : 'Thông báo');
    if (!list) return;
    list.replaceChildren();
    if (!entries.length) list.append(element('li', 'upload-notification-empty', 'Chưa có thông báo'));
    entries.forEach(item => {
      const row = element('li', 'upload-notification-item is-' + item.status);
      row.append(element('span', 'upload-notification-symbol', item.status === 'success' ? '\u2713' : '!'));
      const content = element('div', 'upload-notification-content');
      content.append(element('strong', '', item.title), element('p', '', item.message));
      const time = element('time', '', new Date(item.time).toLocaleString('vi-VN'));
      time.dateTime = new Date(item.time).toISOString();
      content.append(time); row.append(content); list.append(row);
    });
  }
  function init() {
    if (bell) {
      bell.classList.add('upload-notification-bell');
      bell.setAttribute('aria-controls', 'uploadNotificationPanel');
      bell.setAttribute('aria-expanded', 'false');
      badge = element('span', 'upload-notification-badge');
      badge.setAttribute('aria-hidden', 'true'); bell.append(badge);
      panel = element('section', 'upload-notification-panel');
      panel.id = 'uploadNotificationPanel'; panel.hidden = true;
      panel.setAttribute('aria-label', 'Thông báo upload');
      const header = element('header', 'upload-notification-header');
      header.append(element('strong', '', 'Thông báo'));
      const clear = element('button', 'upload-notification-clear', 'Xóa tất cả'); clear.type = 'button';
      clear.addEventListener('click', () => { entries = []; save(); render(); });
      const dismiss = element('button', 'upload-notification-close', '\u00d7'); dismiss.type = 'button';
      dismiss.title = 'Đóng'; dismiss.setAttribute('aria-label', 'Đóng thông báo');
      dismiss.addEventListener('click', () => { close(); bell.focus(); });
      header.append(clear, dismiss);
      list = element('ul', 'upload-notification-list'); panel.append(header, list); document.body.append(panel);
      bell.addEventListener('click', () => {
        if (!panel.hidden) { close(); return; }
        entries.forEach(item => { item.read = true; }); save(); render();
        panel.hidden = false; bell.setAttribute('aria-expanded', 'true');
        const bounds = bell.getBoundingClientRect();
        const left = Math.max(8, Math.min(bounds.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 8));
        panel.style.left = left + 'px'; panel.style.top = Math.min(bounds.bottom + 8, innerHeight - 80) + 'px';
      });
      document.addEventListener('click', event => { if (!bell.contains(event.target) && !panel.contains(event.target)) close(); });
      document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { close(); bell.focus(); } });
      window.addEventListener('resize', close);
    }
    toast = element('div', 'upload-notification-toast'); toast.hidden = true;
    toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
    document.body.append(toast); render();
  }
  function publish(detail) {
    if (!detail || !['success', 'error', 'warning'].includes(detail.status)) return;
    if (entries.some(item => item.id === detail.id)) return;
    const item = {
      id: detail.id || crypto.randomUUID(), status: detail.status,
      title: String(detail.title || 'Upload').slice(0, 200),
      message: String(detail.message || '').slice(0, 600), time: Date.now(), read: false,
    };
    entries.unshift(item); entries = entries.slice(0, 20); save(); render();
    if (toast) {
      clearTimeout(toastTimer); toast.replaceChildren(element('strong', '', item.title), element('span', '', item.message));
      toast.className = 'upload-notification-toast is-' + item.status; toast.hidden = false;
      toastTimer = setTimeout(() => { toast.hidden = true; }, 6500);
    }
  }
  window.MediaHzNotifications = { publish };
  init();
})();
