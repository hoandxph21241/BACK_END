(function () {
  "use strict";
  const trigger = document.getElementById('mail');
  if (!trigger || window.MediaHzMail) return;
  let userId = document.querySelector('[data-mail-user]')?.dataset.mailUser || '';
  let ownerId = userId;
  let box = 'inbox', page = 0, hasMore = false, unread = 0, sending = false, waitingForLogin = false;
  let listRequest = 0, detailRequest = 0, authVersion = 0, listController, selected, clientId, replyTo = null;
  let returnFocus, outside = false;
  let recipientSelection = null, recipientTimer, recipientController, recipientRequest = 0, recipientIndex = -1, recipientItems = [];
  const names = { message: 'Tin nhắn', complaint: 'Khiếu nại', request: 'Yêu cầu' };
  const element = (tag, className, text) => {
    const node = document.createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const icon = (name, label) => {
    const button = element('button', 'mail-icon-button'); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label);
    const image = element('span', 'mail-icon mail-icon-' + name); image.setAttribute('aria-hidden', 'true'); button.append(image); return button;
  };
  const date = value => new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  const panel = element('section', 'mail-panel'); panel.id = 'mailPanel'; panel.hidden = true; panel.setAttribute('aria-label', 'Hộp thư');
  const header = element('header', 'mail-panel-header'); header.append(element('strong', '', 'Hộp thư'));
  const refresh = icon('refresh', 'Làm mới hộp thư'), compose = icon('compose', 'Soạn thư'), dismiss = icon('close', 'Đóng hộp thư');
  header.append(refresh, compose, dismiss);
  const tabs = element('div', 'mail-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Thư mục');
  const tabButtons = ['inbox', 'sent'].map((value, index) => {
    const button = element('button', '', index ? 'Đã gửi' : 'Thư đến'); button.type = 'button'; button.dataset.box = value;
    button.id = 'mailTab-' + value; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'mailListPanel');
    button.addEventListener('click', () => { box = value; loadList(true); }); tabs.append(button); return button;
  });
  const listPanel = element('div', 'mail-list-panel'); listPanel.id = 'mailListPanel'; listPanel.setAttribute('role', 'tabpanel');
  const list = element('ul', 'mail-list');
  const listStatus = element('p', 'mail-list-status'); listStatus.setAttribute('role', 'status');
  const more = element('button', 'mail-more', 'Xem thêm'); more.type = 'button'; more.hidden = true;
  listPanel.append(list, listStatus); panel.append(header, tabs, listPanel, more);
  const badge = element('span', 'mail-badge'); badge.hidden = true; badge.setAttribute('aria-hidden', 'true'); trigger.append(badge);
  trigger.classList.add('mail-trigger'); trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false');
  const dialog = element('dialog', 'mail-dialog'); dialog.setAttribute('aria-labelledby', 'mailDialogTitle');
  // Previous recipient field: <div data-mail-recipient><label for="mailRecipient">Người nhận</label><input id="mailRecipient" name="recipient" maxlength="254" placeholder="Tài khoản hoặc #hz231" autocomplete="off" required></div>
  dialog.innerHTML = '<header class="mail-dialog-header"><h2 id="mailDialogTitle">Soạn thư</h2></header>' +
    '<p class="mail-dialog-status" data-mail-status role="status" hidden></p>' +
    '<form data-mail-form><label for="mailKind">Loại thư</label><select id="mailKind" name="kind"><option value="message">Gửi tài khoản khác</option><option value="complaint">Khiếu nại</option><option value="request">Yêu cầu hỗ trợ</option></select>' +
    '<div data-mail-recipient><label id="mailRecipientLabel" for="mailRecipient">Người nhận</label><div class="mail-recipient-field"><input id="mailRecipient" name="recipient" maxlength="80" placeholder="Tên, tài khoản hoặc #hz231" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="mailRecipientOptions" required><div class="mail-recipient-popover" hidden><ul id="mailRecipientOptions" role="listbox" aria-label="Gợi ý người nhận"></ul><p class="mail-recipient-status" role="status"></p></div><div class="mail-recipient-selected" role="group" aria-labelledby="mailRecipientLabel" hidden></div></div></div>' +
    '<p class="mail-support-target" data-mail-support hidden>Đến: Quản trị MediaHz</p>' +
    '<label for="mailSubject">Tiêu đề</label><input id="mailSubject" name="subject" maxlength="140" required>' +
    '<label for="mailBody">Nội dung</label><textarea id="mailBody" name="body" rows="8" maxlength="5000" required></textarea>' +
    '<div class="mail-character-count" data-mail-count>0 / 5000</div><footer class="mail-dialog-footer"><button type="button" class="mail-secondary" data-mail-cancel>Hủy</button><button type="submit" class="mail-send" data-mail-send>Gửi thư</button></footer></form>' +
    '<section data-mail-detail hidden><span class="mail-kind" data-mail-kind></span><h3 data-mail-subject></h3><dl class="mail-meta"><div><dt>Từ</dt><dd data-mail-from></dd></div><div><dt>Đến</dt><dd data-mail-to></dd></div><div><dt>Thời gian</dt><dd data-mail-date></dd></div></dl><div class="mail-body" data-mail-body></div><footer class="mail-dialog-footer"><button type="button" class="mail-secondary" data-mail-detail-close>Đóng</button><button type="button" class="mail-send" data-mail-reply>Trả lời</button></footer></section>';
  const closeButton = icon('close', 'Đóng thư'); closeButton.classList.add('mail-dialog-close'); dialog.querySelector('header').append(closeButton);
  document.body.append(panel, dialog);
  const find = selector => dialog.querySelector(selector), form = find('[data-mail-form]'), fields = form.elements;
  const status = find('[data-mail-status]'), detail = find('[data-mail-detail]'), sendButton = find('[data-mail-send]'), replyButton = find('[data-mail-reply]');
  const recipientField = find('.mail-recipient-field'), recipientPopover = find('.mail-recipient-popover');
  const recipientList = find('#mailRecipientOptions'), recipientStatus = find('.mail-recipient-status'), recipientSelected = find('.mail-recipient-selected');
  const changeRecipient = icon('close', 'Thay đổi người nhận');
  function stopRecipientSearch() {
    clearTimeout(recipientTimer); recipientController?.abort(); recipientRequest++;
    recipientItems = []; recipientIndex = -1; recipientList.replaceChildren(); recipientPopover.hidden = true;
    fields.recipient.setAttribute('aria-expanded', 'false'); fields.recipient.removeAttribute('aria-activedescendant'); fields.recipient.removeAttribute('aria-busy');
  }
  function recipientIdentity(user) {
    const identity = element('span', 'mail-recipient-identity'), photo = element('img', 'mail-recipient-avatar');
    const fallback = '/images/auth/person-circle.svg';
    let source = fallback;
    try { const url = new URL(user.avatar || fallback, location.origin); if (['http:', 'https:'].includes(url.protocol)) source = url.href; } catch { /* Invalid profile images use the account icon. */ }
    photo.src = source; photo.alt = ''; photo.width = 32; photo.height = 32; photo.referrerPolicy = 'no-referrer';
    photo.addEventListener('error', () => { photo.src = fallback; }, { once: true });
    const text = element('span', 'mail-recipient-text');
    text.append(element('strong', '', user.name || 'Tài khoản'), element('span', '', user.tag ? '#' + user.tag : 'Tài khoản MediaHz'));
    identity.append(photo, text); return identity;
  }
  function resetRecipient() {
    stopRecipientSearch(); recipientSelection = null; recipientSelected.replaceChildren(); recipientSelected.hidden = true;
    fields.recipient.hidden = false; fields.recipient.value = ''; fields.recipient.setCustomValidity('');
  }
  function chooseRecipient(user, focus = true) {
    if (sending || !/^[a-f0-9]{24}$/i.test(user?.id || '') || user.id === userId) return;
    stopRecipientSearch(); recipientSelection = user; clientId = crypto.randomUUID();
    fields.recipient.value = user.tag ? '#' + user.tag : user.name; fields.recipient.hidden = true; fields.recipient.required = false; fields.recipient.setCustomValidity('');
    recipientSelected.replaceChildren(recipientIdentity(user), changeRecipient); recipientSelected.hidden = false;
    if (focus) fields.subject.focus();
  }
  function highlightRecipient(index) {
    recipientIndex = index;
    Array.from(recipientList.children).forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
    const option = recipientList.children[index];
    if (option) { fields.recipient.setAttribute('aria-activedescendant', option.id); option.scrollIntoView({ block: 'nearest' }); }
  }
  function searchRecipients() {
    stopRecipientSearch(); fields.recipient.setCustomValidity('');
    const query = fields.recipient.value.trim();
    if (recipientSelection || sending || !dialog.open || form.hidden || fields.kind.value !== 'message' || query.replace(/^#/, '').length < 2) return;
    const request = recipientRequest, controller = recipientController = new AbortController();
    recipientPopover.hidden = false; recipientStatus.textContent = 'Đang tìm người nhận...'; fields.recipient.setAttribute('aria-expanded', 'true');
    recipientTimer = setTimeout(async () => {
      fields.recipient.setAttribute('aria-busy', 'true');
      try {
        const data = await api('/recipients?q=' + encodeURIComponent(query), { signal: controller.signal });
        if (request !== recipientRequest) return;
        recipientItems = data.items;
        recipientList.replaceChildren(...recipientItems.map((user, i) => {
          const option = element('li', 'mail-recipient-option'); option.id = 'mailRecipientOption-' + i; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
          option.append(recipientIdentity(user));
          option.addEventListener('pointerdown', event => event.preventDefault());
          option.addEventListener('click', () => chooseRecipient(user)); return option;
        }));
        recipientStatus.textContent = recipientItems.length ? '' : 'Không tìm thấy người nhận.';
        if (recipientItems.length) highlightRecipient(0);
      } catch (error) {
        if (request === recipientRequest && error.name !== 'AbortError') recipientStatus.textContent = error.status === 401 ? 'Vui lòng đăng nhập lại.' : 'Không thể tìm người nhận. Vui lòng thử lại.';
      } finally { if (request === recipientRequest) fields.recipient.removeAttribute('aria-busy'); }
    }, 300);
  }
  fields.recipient.addEventListener('input', searchRecipients);
  fields.recipient.addEventListener('focus', searchRecipients);
  fields.recipient.addEventListener('keydown', event => {
    if (recipientPopover.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); stopRecipientSearch(); }
    else if (['ArrowDown', 'ArrowUp'].includes(event.key) && recipientItems.length) {
      event.preventDefault(); highlightRecipient((recipientIndex + (event.key === 'ArrowDown' ? 1 : -1) + recipientItems.length) % recipientItems.length);
    } else if (event.key === 'Enter' && recipientItems[recipientIndex]) { event.preventDefault(); chooseRecipient(recipientItems[recipientIndex]); }
    else if (event.key === 'Tab') stopRecipientSearch();
  });
  recipientField.addEventListener('focusout', event => { if (!recipientField.contains(event.relatedTarget)) stopRecipientSearch(); });
  changeRecipient.addEventListener('click', () => { if (!sending) { resetRecipient(); kindChanged(); clientId = crypto.randomUUID(); fields.recipient.focus(); } });
  function closePanel() { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
  function login() {
    waitingForLogin = !dialog.open; closePanel(); setUnread(0);
    if (window.MediaHzLogin) window.MediaHzLogin.open(); else location.assign('/auth/signin');
  }
  async function api(url, options = {}) {
    const version = authVersion;
    const { promptLogin = true, ...fetchOptions } = options;
    const response = await fetch('/api/mail' + url, { credentials: 'same-origin', cache: 'no-store', ...fetchOptions,
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
    if (version !== authVersion) throw new DOMException('Session changed', 'AbortError');
    const json = await response.json();
    if (!response.ok || !json.success) {
      const error = Object.assign(new Error(json.message || json.msg || 'Không thể tải hộp thư.'), { status: response.status });
      if (response.status === 401) { userId = ''; setUnread(0); if (promptLogin) login(); }
      throw error;
    }
    return json.data;
  }
  function setUnread(value) {
    unread = Math.max(0, Number(value) || 0); badge.textContent = unread > 9 ? '9+' : String(unread); badge.hidden = !unread;
    trigger.setAttribute('aria-label', unread ? 'Hộp thư, ' + unread + ' chưa đọc' : 'Hộp thư');
  }
  async function refreshUnread() {
    if (!userId || document.hidden) return;
    try { setUnread((await api('/unread-count', { promptLogin: false })).unread); } catch { /* Polling must not interrupt playback or open login unexpectedly. */ }
  }
  function row(mail) {
    const li = element('li', '');
    const button = element('button', 'mail-row' + (mail.unread ? ' is-unread' : '')); button.type = 'button';
    const head = element('span', 'mail-row-head');
    head.append(element('strong', '', box === 'sent' ? 'Đến: ' + (mail.recipient?.name || 'Quản trị MediaHz') : mail.sender?.name || 'Tài khoản đã xóa'), element('time', '', date(mail.createdAt)));
    button.append(head, element('span', 'mail-row-subject', mail.subject), element('span', 'mail-row-preview', names[mail.kind] + ' · ' + mail.preview));
    button.addEventListener('click', () => openDetail(mail.id)); li.append(button); return li;
  }
  async function loadList(reset) {
    if (!userId) { login(); return; }
    listController?.abort(); listController = new AbortController();
    const request = ++listRequest, nextPage = reset ? 1 : page + 1;
    tabButtons.forEach(button => { const active = button.dataset.box === box; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    listPanel.setAttribute('aria-labelledby', 'mailTab-' + box); listPanel.setAttribute('aria-busy', 'true');
    if (reset) { page = 0; hasMore = false; list.replaceChildren(); listPanel.scrollTop = 0; }
    listStatus.textContent = 'Đang tải thư...'; more.hidden = true; refresh.disabled = true;
    try {
      const data = await api('?box=' + box + '&page=' + nextPage, { signal: listController.signal });
      if (request !== listRequest) return;
      data.items.forEach(mail => list.append(row(mail))); page = data.page; hasMore = data.hasMore; setUnread(data.unread);
      listStatus.textContent = !list.children.length ? (box === 'sent' ? 'Chưa có thư đã gửi.' : 'Chưa có thư đến.') : '';
      more.hidden = !hasMore;
    } catch (error) { if (request === listRequest && error.name !== 'AbortError' && error.status !== 401) { listStatus.textContent = error.message; more.hidden = !hasMore; } }
    finally { if (request === listRequest) { listPanel.removeAttribute('aria-busy'); refresh.disabled = false; } }
  }
  function openPanel() {
    if (!userId) { login(); return; }
    panel.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    const rect = trigger.getBoundingClientRect();
    panel.style.left = Math.max(8, Math.min(rect.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 8)) + 'px';
    panel.style.top = Math.min(rect.bottom + 8, innerHeight - 100) + 'px'; loadList(true);
  }
  function showDialog(title) {
    closePanel(); status.hidden = true; status.classList.remove('is-success'); find('#mailDialogTitle').textContent = title;
    if (!dialog.open) { returnFocus = document.activeElement; dialog.showModal(); }
  }
  function kindChanged() {
    const direct = fields.kind.value === 'message'; find('[data-mail-recipient]').hidden = !direct;
    // Previous: fields.recipient.required = direct;
    fields.recipient.required = direct && !recipientSelection; fields.recipient.disabled = !direct; find('[data-mail-support]').hidden = direct;
    if (!direct) stopRecipientSearch();
  }
  function composeMail(options = {}) {
    if (sending) return;
    if (!userId) { login(); return; }
    detailRequest++; selected = null; form.reset(); clientId = crypto.randomUUID(); replyTo = options.replyTo || null;
    // Previous: fields.kind.value = options.kind || 'message'; fields.recipient.value = options.recipient || ''; fields.subject.value = options.subject || '';
    resetRecipient(); fields.kind.value = options.kind || 'message'; fields.subject.value = options.subject || '';
    if (options.recipientUser) chooseRecipient(options.recipientUser, false);
    kindChanged(); find('[data-mail-count]').textContent = '0 / 5000'; detail.hidden = true; form.hidden = false;
    showDialog(replyTo ? 'Trả lời thư' : 'Soạn thư');
    // Previous: (fields.recipient.disabled || fields.recipient.value ? fields.subject : fields.recipient).focus();
    (fields.recipient.disabled || recipientSelection ? fields.subject : fields.recipient).focus();
  }
  function renderDetail(mail, sent = false) {
    selected = mail; form.hidden = true; detail.hidden = false;
    find('#mailDialogTitle').textContent = 'Nội dung thư';
    find('[data-mail-kind]').textContent = names[mail.kind]; find('[data-mail-subject]').textContent = mail.subject;
    find('[data-mail-from]').textContent = mail.sender?.name || 'Tài khoản đã xóa';
    find('[data-mail-to]').textContent = mail.recipient?.name || 'Quản trị MediaHz'; find('[data-mail-date]').textContent = date(mail.createdAt);
    find('[data-mail-body]').textContent = mail.body;
    replyButton.hidden = !mail.sender && !mail.recipient;
    replyButton.textContent = mail.sender?.id === userId && !mail.recipient ? 'Gửi bổ sung' : 'Trả lời';
    status.hidden = !sent; status.classList.toggle('is-success', sent); if (sent) status.textContent = 'Đã gửi thư.';
  }
  async function openDetail(id) {
    const request = ++detailRequest;
    form.hidden = true; detail.hidden = true; showDialog('Đang tải thư...');
    try {
      const mail = await api('/' + encodeURIComponent(id));
      if (request !== detailRequest || !dialog.open) return;
      renderDetail(mail); refreshUnread();
    } catch (error) {
      if (request === detailRequest && error.name !== 'AbortError') { status.textContent = error.message; status.hidden = false; }
    }
  }
  function closeDialog() { if (!sending) dialog.close(); }
  form.addEventListener('input', () => { clientId = crypto.randomUUID(); find('[data-mail-count]').textContent = fields.body.value.length + ' / 5000'; });
  fields.kind.addEventListener('change', kindChanged);
  form.addEventListener('submit', async event => {
    // Previous: event.preventDefault(); if (sending || !form.reportValidity()) return;
    event.preventDefault(); if (sending) return;
    if (fields.kind.value === 'message' && !recipientSelection) {
      fields.recipient.setCustomValidity('Vui lòng chọn người nhận từ danh sách gợi ý.'); fields.recipient.reportValidity(); fields.recipient.focus(); return;
    }
    if (!form.reportValidity()) return;
    stopRecipientSearch(); changeRecipient.disabled = true;
    sending = true; sendButton.disabled = true; sendButton.textContent = 'Đang gửi...'; form.setAttribute('aria-busy', 'true'); status.hidden = true; status.classList.remove('is-success');
    // Previous recipient payload: fields.recipient.disabled ? '' : fields.recipient.value.trim()
    const payload = { kind: fields.kind.value, recipient: fields.recipient.disabled ? '' : recipientSelection.id,
      subject: fields.subject.value.trim(), body: fields.body.value.trim(), clientId, replyTo };
    form.querySelectorAll('input, select, textarea').forEach(field => { field.disabled = true; });
    try {
      const mail = await api('', { method: 'POST', body: JSON.stringify(payload) });
      form.reset(); renderDetail(mail, true); refreshUnread();
    } catch (error) {
      status.hidden = false;
      status.textContent = ['TimeoutError', 'TypeError', 'AbortError'].includes(error.name) ? 'Chưa xác nhận kết quả gửi. Kiểm tra Thư đã gửi trước khi tạo thư mới.' : error.message;
    } finally {
      sending = false; sendButton.disabled = false; sendButton.textContent = 'Gửi thư'; form.removeAttribute('aria-busy');
      changeRecipient.disabled = false;
      form.querySelectorAll('input, select, textarea').forEach(field => { field.disabled = false; }); kindChanged();
    }
  });
  replyButton.addEventListener('click', () => {
    if (!selected) return;
    const own = selected.sender?.id === userId, target = own ? selected.recipient : selected.sender;
    // Previous reply recipient: recipient: target?.id || ''
    composeMail({ kind: own && !target ? selected.kind : 'message', recipientUser: target,
      subject: (/^Re:/i.test(selected.subject) ? selected.subject : 'Re: ' + selected.subject).slice(0, 140), replyTo: selected.id });
  });
  trigger.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
  compose.addEventListener('click', () => composeMail()); refresh.addEventListener('click', () => loadList(true)); more.addEventListener('click', () => loadList(false));
  dismiss.addEventListener('click', () => { closePanel(); trigger.focus(); });
  closeButton.addEventListener('click', closeDialog); find('[data-mail-cancel]').addEventListener('click', closeDialog); find('[data-mail-detail-close]').addEventListener('click', closeDialog);
  dialog.addEventListener('cancel', event => { if (sending) event.preventDefault(); });
  const isOutside = event => { const r = dialog.getBoundingClientRect(); return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom; };
  dialog.addEventListener('pointerdown', event => { outside = event.target === dialog && isOutside(event); });
  dialog.addEventListener('pointerup', event => { if (outside && event.target === dialog && isOutside(event)) closeDialog(); outside = false; });
  // Previous: dialog.addEventListener('close', () => { detailRequest++; if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); });
  dialog.addEventListener('close', () => { detailRequest++; stopRecipientSearch(); if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); });
  document.addEventListener('click', event => { if (!recipientField.contains(event.target)) stopRecipientSearch(); });
  document.addEventListener('click', event => { if (!trigger.contains(event.target) && !panel.contains(event.target)) closePanel(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { closePanel(); trigger.focus(); }
    if (event.target.closest('.mail-tabs') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); box = box === 'inbox' ? 'sent' : 'inbox'; tabButtons.find(button => button.dataset.box === box).focus(); loadList(true);
    }
  });
  window.addEventListener('resize', closePanel);
  window.addEventListener('mediahz:authenticated', event => {
    stopRecipientSearch();
    authVersion++; userId = String(event.detail?.user?.id || ''); listRequest++; listController?.abort(); setUnread(0);
    closePanel(); list.replaceChildren(); listStatus.textContent = ''; page = 0; hasMore = false; more.hidden = true;
    if (ownerId && ownerId !== userId) {
      dialog.close(); form.reset(); selected = null; find('[data-mail-body]').textContent = ''; clientId = crypto.randomUUID();
      resetRecipient();
    } else if (dialog.open && form.hidden) closeDialog();
    ownerId = userId;
    refreshUnread(); if (waitingForLogin) { waitingForLogin = false; openPanel(); }
  });
  document.getElementById('loginPopup')?.addEventListener('close', () => { if (!userId) waitingForLogin = false; });
  window.addEventListener('focus', refreshUnread);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });
  const timer = setInterval(refreshUnread, 30000);
  // Previous: window.addEventListener('pagehide', () => { clearInterval(timer); listController?.abort(); });
  window.addEventListener('pagehide', () => { clearInterval(timer); listController?.abort(); stopRecipientSearch(); });
  window.MediaHzMail = Object.freeze({ open: openPanel });
  trigger.title = 'Hộp thư'; setUnread(0);
  refreshUnread();
})();
