(function () {
  "use strict";
  const dialog = document.getElementById('loginPopup');
  if (!dialog || window.MediaHzLogin) return;
  const form = dialog.querySelector('[data-login-form]');
  const password = form.elements.namePassword;
  const error = dialog.querySelector('[data-login-error]');
  const submit = dialog.querySelector('[data-login-submit]');
  const google = dialog.querySelector('[data-login-google]');
  let busy = false, pendingSong = null, previousFocus, oauth, pollTimer, generation = 0;
  function showError(message) { error.textContent = message; error.hidden = false; }
  function setBusy(value) {
    busy = value; submit.disabled = value; google.disabled = value;
    submit.textContent = value ? 'Đang đăng nhập...' : 'Đăng nhập';
    form.setAttribute('aria-busy', String(value));
  }
  function open(options = {}) {
    if (dialog.open) return;
    pendingSong = typeof options.songId === 'string' && /^[a-f0-9]{24}$/i.test(options.songId) ? options.songId : null;
    previousFocus = document.activeElement; error.hidden = true;
    dialog.showModal(); form.elements.nameAccount.focus();
  }
  function close() {
    if (oauth) { generation++; clearTimeout(pollTimer); oauth.close(); oauth = null; setBusy(false); }
    if (!busy) dialog.close();
  }
  async function finish(data) {
    if (!data?.authenticated || typeof data.nav !== 'string') throw new Error('Chưa xác nhận được tài khoản. Vui lòng thử lại.');
    const slot = document.getElementById('navAuthControls');
    if (slot) {
      // This is an escaped, server-rendered partial from our own authentication endpoint.
      slot.innerHTML = data.nav;
      slot.querySelectorAll('[data-avatar-fallback]').forEach(image => image.addEventListener('error', () => { image.src = image.dataset.avatarFallback; }, { once: true }));
    }
    const songId = pendingSong;
    generation++; clearTimeout(pollTimer); oauth?.close(); oauth = null;
    window.dispatchEvent(new CustomEvent('mediahz:authenticated', { detail: { user: data.user } }));
    // Previous message did not identify the newly signed-in account.
    // document.getElementById('mediaPlayerFrame')?.contentWindow.postMessage({ type: 'authChanged' }, location.origin);
    document.getElementById('mediaPlayerFrame')?.contentWindow.postMessage({ type: 'authChanged', userId: data.user?.id || null }, location.origin);
    setBusy(false); dialog.close();
    if (songId) await window.SongEngagementV2_1?.toggle(songId, true);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    error.hidden = true; setBusy(true);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/auth/signin', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ nameAccount: form.elements.nameAccount.value.trim(), namePassword: password.value }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Đăng nhập thất bại.');
      await finish(data);
    } catch (failure) { showError(failure.name === 'AbortError' ? 'Kết nối quá chậm. Vui lòng thử lại.' : failure.message || 'Không thể đăng nhập lúc này.'); }
    finally { clearTimeout(timer); setBusy(false); }
  });
  google.addEventListener('click', () => {
    if (busy) return;
    oauth = window.open('/auth/google', 'mediahz-google-login', 'popup=yes,width=520,height=700');
    if (!oauth) { showError('Trình duyệt đang chặn cửa sổ Google. Vui lòng cho phép popup.'); return; }
    error.hidden = true; setBusy(true); submit.textContent = 'Đang chờ Google...';
    const token = ++generation, started = Date.now();
    async function poll() {
      if (token !== generation) return;
      try {
        const response = await fetch('/auth/session', { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(10000) });
        const data = await response.json();
        if (token !== generation) return;
        if (response.ok && data.authenticated) { await finish(data); return; }
        if (oauth?.closed || Date.now() - started > 120000) {
          setBusy(false); showError('Đăng nhập Google chưa hoàn tất. Bạn có thể thử lại.'); return;
        }
      } catch { if (token !== generation) return; }
      if (Date.now() - started > 120000) { setBusy(false); showError('Hết thời gian chờ Google. Vui lòng thử lại.'); return; }
      pollTimer = setTimeout(poll, 1500);
    }
    pollTimer = setTimeout(poll, 700);
  });
  dialog.querySelector('[data-login-close]').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  let outside = false;
  const isOutside = event => { const r = dialog.getBoundingClientRect(); return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom; };
  dialog.addEventListener('pointerdown', event => { outside = event.target === dialog && isOutside(event); });
  dialog.addEventListener('pointerup', event => { if (outside && event.target === dialog && isOutside(event)) close(); outside = false; });
  dialog.addEventListener('close', () => {
    generation++; clearTimeout(pollTimer); pendingSong = null; form.reset(); password.type = 'password';
    const reveal = dialog.querySelector('[data-login-reveal]'); reveal.setAttribute('aria-pressed', 'false'); reveal.setAttribute('aria-label', 'Hiện mật khẩu'); reveal.title = 'Hiện mật khẩu';
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  });
  dialog.querySelector('[data-login-reveal]').addEventListener('click', event => {
    const button = event.currentTarget, visible = password.type === 'password';
    password.type = visible ? 'text' : 'password'; button.setAttribute('aria-pressed', String(visible));
    button.title = visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'; button.setAttribute('aria-label', button.title);
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-open-login]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); open();
  });
  window.addEventListener('message', event => {
    const frame = document.getElementById('mediaPlayerFrame');
    if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === 'authRequired') open({ songId: event.data.songId });
  });
  window.MediaHzLogin = Object.freeze({ open });
})();
