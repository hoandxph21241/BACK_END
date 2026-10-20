(function () {
  'use strict';
  if (window.MediaHzPasswordSettings) return;
  const views = new Map();
  async function api(path, options = {}) {
    const response = await fetch('/api/auth/password' + path, { credentials: 'same-origin', cache: 'no-store', ...options,
      signal: options.signal || AbortSignal.timeout(35000), headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
    const data = await response.json();
    // Previous errors only retained status, so the UI always guessed a 60-second cooldown.
    if (!response.ok || !data.success) {
      const header = response.headers.get('Retry-After');
      const headerSeconds = header && /^\d+$/.test(header) ? Number(header) : Math.ceil((Date.parse(header) - Date.now()) / 1000);
      throw Object.assign(new Error(data.message || data.msg || 'Không thể xử lý yêu cầu.'), {
        status: response.status, code: data.code, retryAfter: data.retryAfter ?? headerSeconds,
      });
    }
    return data;
  }
  function signedOut(nav) {
    const slot = document.getElementById('navAuthControls');
    if (slot && typeof nav === 'string') slot.innerHTML = nav; // Escaped partial rendered by our own endpoint.
    else if (slot) {
      const link = document.createElement('a'); link.href = '/auth/signin'; link.dataset.openLogin = ''; link.className = 'btn'; link.textContent = 'Login'; slot.replaceChildren(link);
    }
    window.dispatchEvent(new CustomEvent('mediahz:authenticated', { detail: { user: null } }));
    document.getElementById('mediaPlayerFrame')?.contentWindow.postMessage({ type: 'authChanged' }, location.origin);
  }
  function init(root) {
    const find = selector => root.querySelector(selector), form = find('[data-password-form]'), fields = form.elements;
    const status = find('[data-password-status]'), send = find('[data-password-send-otp]'), submit = find('[data-password-submit]'), login = find('[data-password-login]');
    const tabs = Array.from(root.querySelectorAll('[data-password-method]'));
    let method = 'password', changing = false, sending = false, complete = false, needsLogin = false;
    let loaded = false, canEmail = false, optionsLoading = false, challengeId = null, expiresAt = 0, retryAt = 0, generation = 0, controller;
    const message = (text, success = false) => { status.textContent = text; status.hidden = !text; status.classList.toggle('is-success', success); };
    function setRetry(info, fallback = 0) {
      const seconds = Number(info.retryAfter);
      retryAt = Date.now() + (Number.isFinite(seconds) && seconds >= 0 ? seconds : fallback) * 1000;
    }
    function controls() {
      tabs.forEach(tab => { const active = tab.dataset.passwordMethod === method; tab.disabled = changing || sending || complete; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
      find('[data-password-current]').hidden = method !== 'password'; find('[data-password-email]').hidden = method !== 'otp';
      find('#passwordProof').setAttribute('aria-labelledby', method === 'otp' ? 'passwordMethodOtp' : 'passwordMethodCurrent');
      fields.oldPassword.disabled = changing || complete || method !== 'password'; fields.oldPassword.required = method === 'password';
      fields.otp.disabled = changing || complete || method !== 'otp' || !challengeId; fields.otp.required = method === 'otp';
      fields.newPassword.disabled = changing || complete; fields.confirmPassword.disabled = changing || complete;
      submit.disabled = changing || sending || complete || needsLogin; submit.textContent = changing ? 'Đang cập nhật...' : 'Đổi mật khẩu';
      const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      send.disabled = changing || sending || complete || needsLogin || optionsLoading || (loaded && !canEmail) || seconds > 0;
      // Previous countdown displayed seconds only, including a hard-coded 60s for hourly limits.
      const wait = seconds >= 60 ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') : seconds + 's';
      send.textContent = sending ? 'Đang gửi...' : optionsLoading ? 'Đang tải...' : seconds ? 'Gửi lại (' + wait + ')' : !loaded ? 'Thử lại' : challengeId ? 'Gửi lại OTP' : 'Gửi OTP';
      root.querySelectorAll('[data-password-reveal]').forEach(button => { button.disabled = changing || complete; });
      if (challengeId) {
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        find('[data-password-otp-status]').textContent = remaining ? 'Mã còn hiệu lực ' + Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0') : 'OTP đã hết hạn. Vui lòng gửi mã mới.';
      }
      form.setAttribute('aria-busy', String(changing || sending));
    }
    async function loadOptions() {
      const request = ++generation; controller?.abort(); controller = new AbortController(); optionsLoading = true; controls();
      try {
        const data = (await api('/options', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })).data;
        if (request !== generation || !root.isConnected) return;
        loaded = true; canEmail = data.canUseEmail; find('[data-password-destination]').textContent = data.email || 'Chưa có email';
        setRetry(data);
        challengeId = data.challenge?.challengeId || null;
        expiresAt = challengeId ? new Date(data.challenge.expiresAt).getTime() : 0;
        find('[data-password-otp-status]').textContent = canEmail ? '' : 'Tài khoản chưa có email nhận OTP hợp lệ. Hãy dùng mật khẩu hiện tại.';
      } catch (error) {
        if (request !== generation || error.name === 'AbortError' || !root.isConnected) return;
        find('[data-password-destination]').textContent = 'Chưa tải được email';
        if (error.status === 401) { needsLogin = true; login.hidden = false; }
        if (error.status === 429) setRetry(error, 60);
        message(error.message);
      } finally { if (request === generation) { optionsLoading = false; controls(); } }
    }
    function reset() {
      generation++; controller?.abort(); form.reset(); challengeId = null; expiresAt = 0; retryAt = 0; complete = false; needsLogin = false; loaded = false; canEmail = false;
      method = 'password'; message(''); login.hidden = true; form.hidden = false; find('[data-password-otp-status]').textContent = '';
      root.querySelectorAll('[data-password-reveal]').forEach(button => { find('#' + button.dataset.passwordReveal).type = 'password'; button.setAttribute('aria-pressed', 'false'); button.title = 'Hiện mật khẩu'; button.setAttribute('aria-label', button.title); });
      controls(); loadOptions();
    }
    tabs.forEach(tab => tab.addEventListener('click', () => {
      if (changing || sending) return; method = tab.dataset.passwordMethod; fields.oldPassword.value = ''; fields.otp.value = ''; message(''); controls();
    }));
    root.querySelector('.password-methods').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || changing || sending || complete) return;
      event.preventDefault(); const tab = tabs.find(tab => tab.dataset.passwordMethod !== method); tab.click(); tab.focus();
    });
    root.querySelectorAll('[data-password-reveal]').forEach(button => button.addEventListener('click', () => {
      const input = find('#' + button.dataset.passwordReveal), visible = input.type === 'password'; input.type = visible ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(visible)); button.title = visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'; button.setAttribute('aria-label', button.title);
    }));
    send.addEventListener('click', async () => {
      if (sending || changing || send.disabled) return;
      if (!loaded) { message(''); return loadOptions(); }
      const request = generation; sending = true; message(''); controls();
      try {
        const result = (await api('/otp', { method: 'POST', body: '{}' })).data;
        if (request !== generation || !root.isConnected) return;
        // Previous: retryAt = Date.now() + result.retryAfter * 1000;
        challengeId = result.challengeId; expiresAt = new Date(result.expiresAt).getTime(); setRetry(result, 60);
        fields.otp.value = ''; message('OTP đã được gửi đến ' + result.email + '.', true);
      } catch (error) {
        if (request !== generation || !root.isConnected) return;
        if (error.status === 401) { needsLogin = true; login.hidden = false; }
        // Previous: if (error.status === 429 || error.status === 503) retryAt = Date.now() + 60000;
        if (error.status === 429 || error.status === 503) setRetry(error, 60);
        message(error.message || 'Chưa gửi được OTP. Vui lòng thử lại.');
      } finally { sending = false; controls(); if (challengeId && method === 'otp' && root.isConnected) fields.otp.focus(); }
    });
    form.addEventListener('input', () => { fields.confirmPassword.setCustomValidity(''); fields.newPassword.setCustomValidity(''); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (changing || sending || complete || needsLogin) return;
      fields.confirmPassword.setCustomValidity(fields.newPassword.value === fields.confirmPassword.value ? '' : 'Xác nhận mật khẩu chưa trùng khớp.');
      fields.newPassword.setCustomValidity(new TextEncoder().encode(fields.newPassword.value).length <= 72 ? '' : 'Mật khẩu mới vượt quá 72 byte.');
      if (!form.reportValidity()) return;
      if (method === 'otp' && (!challengeId || Date.now() >= expiresAt)) { message('Vui lòng gửi và nhập OTP còn hiệu lực.'); return; }
      const request = generation, payload = { method, newPassword: fields.newPassword.value, confirmPassword: fields.confirmPassword.value,
        ...(method === 'otp' ? { challengeId, otp: fields.otp.value } : { oldPassword: fields.oldPassword.value }) };
      changing = true; message(''); controls();
      try {
        const result = await api('', { method: 'PUT', body: JSON.stringify(payload) });
        if (request !== generation) return;
        complete = true; form.reset(); signedOut(result.nav);
        if (root.isConnected) { form.hidden = true; login.hidden = false; message(result.data.message, true); }
      } catch (error) {
        if (request !== generation || !root.isConnected) return;
        if (error.status === 401) { needsLogin = true; login.hidden = false; }
        message(['TimeoutError', 'TypeError', 'AbortError'].includes(error.name) ? 'Chưa xác nhận kết quả đổi mật khẩu. Hãy thử đăng nhập bằng mật khẩu mới trước khi gửi lại.' : error.message);
      } finally { changing = false; controls(); }
    });
    login.addEventListener('click', () => window.MediaHzLogin ? window.MediaHzLogin.open() : location.assign('/auth/signin'));
    const timer = setInterval(() => { if (root.isConnected) controls(); }, 1000);
    views.set(root, { authChanged(user) { if (complete && !user) return; reset(); }, dispose() { generation++; controller?.abort(); clearInterval(timer); form.reset(); } });
    loadOptions();
  }
  function scan() {
    for (const [root, state] of views) if (!root.isConnected) { state.dispose(); views.delete(root); }
    document.querySelectorAll('[data-password-settings]').forEach(root => { if (!views.has(root)) init(root); });
  }
  new MutationObserver(scan).observe(document.getElementById('main') || document.body, { childList: true, subtree: true });
  window.addEventListener('mediahz:authenticated', event => { for (const state of views.values()) state.authChanged(event.detail?.user); });
  window.addEventListener('pagehide', () => { for (const state of views.values()) state.dispose(); views.clear(); });
  window.MediaHzPasswordSettings = Object.freeze({ refresh: scan }); scan();
})();
