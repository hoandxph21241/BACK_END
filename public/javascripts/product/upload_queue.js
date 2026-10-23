(function (window, document) {
  'use strict';
  const MAX_FILES = 20, AUDIO_LIMIT = 25 * 1024 * 1024, IMAGE_LIMIT = 5 * 1024 * 1024;
  const COMPLETION_GRACE_MS = 5000, SPEED_STALE_MS = 2500;
  const mimeByExtension = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac' };
  const audioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/flac']);
  // Previous aggregate progress used: const terminal = new Set(['success', 'error', 'warning']);
  const clock = () => performance.now();
  function duration(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return (minutes >= 60 ? Math.floor(minutes / 60) + ':' : '') + String(minutes % 60).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  function text(node, value) { if (node.textContent !== value) node.textContent = value; }
  function bytes(value) { return value >= 1024 * 1024 ? (value / 1024 / 1024).toFixed(1) + ' MB' : Math.round(value / 1024) + ' KB'; }
  function transferTotal(entry) { return entry.total || entry.size + (entry.cover?.size || 0); }

  function createQueue() {
    let entries = [], view, observer, timer, running = false, paused = false, active = 0;
    let startedAt = 0, elapsed = 0, defaultCategory = '', alertMessage = '', alertTone = '';
    const rows = new Map();
    const find = id => view?.querySelector('#' + id);
    function alert(message, tone = '') {
      alertMessage = message; alertTone = tone;
      if (view?.isConnected) {
        const node = find('uploadAlert');
        text(node, message); node.hidden = !message; node.dataset.tone = tone;
      }
    }
    function release(entry) {
      clearTimeout(entry.completionTimer);
      if (entry.coverUrl) URL.revokeObjectURL(entry.coverUrl);
      entry.file = entry.cover = entry.coverUrl = null;
    }
    function notify(entry) {
      let notifications = window.MediaHzNotifications;
      try {
        if (window.parent !== window && window.parent.location.origin === location.origin) notifications = window.parent.MediaHzNotifications || notifications;
      } catch { /* Do not disclose uploads to a cross-origin parent. */ }
      try { notifications?.publish({ id: entry.notificationId, status: entry.state,
        title: entry.state === 'success' ? 'Tải lên thành công' : entry.state === 'warning' ? 'Chưa xác nhận kết quả tải lên' : 'Tải lên thất bại',
        message: entry.name + ' · ' + entry.message + ' (' + duration(entry.elapsed) + ')',
      }); } catch { /* Notification failures must not stop the upload queue. */ }
    }
    function buildRow(entry) {
      const node = find('uploadRowTemplate').content.firstElementChild.cloneNode(true);
      node.dataset.uploadId = entry.id;
      const query = selector => node.querySelector(selector);
      const refs = { node, name: query('.upload-title'), category: query('.upload-category'),
        cover: query('.upload-cover'), coverInput: query('.upload-cover-input'), image: query('.upload-cover img'),
        placeholder: query('.upload-cover > i'), removeCover: query('[data-action="remove-cover"]'),
        status: query('.upload-row-status'), progress: query('.upload-row-progress'), transfer: query('.upload-row-transfer'), time: query('.upload-row-time'),
        message: query('.upload-row-message'), library: query('.upload-library-link'),
        retry: query('[data-action="retry"]'), remove: query('[data-action="remove"]') };
      refs.name.value = entry.name;
      query('.upload-filename').textContent = entry.filename;
      query('.upload-filename').title = entry.filename;
      query('.upload-size').textContent = entry.size < 1024 * 1024 ? Math.max(1, Math.round(entry.size / 1024)) + ' KB' : (entry.size / 1024 / 1024).toFixed(1) + ' MB';
      refs.category.replaceChildren(...Array.from(find('categoryId').options, option => option.cloneNode(true)));
      refs.category.value = entry.category;
      refs.name.addEventListener('input', () => { entry.name = refs.name.value; });
      refs.category.addEventListener('change', () => { entry.category = refs.category.value; entry.customCategory = true; });
      refs.cover.addEventListener('click', () => refs.coverInput.click());
      refs.coverInput.addEventListener('change', () => {
        const file = refs.coverInput.files[0]; refs.coverInput.value = '';
        if (!file || running || !['pending', 'error'].includes(entry.state)) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > IMAGE_LIMIT) {
          alert('Ảnh bìa phải là JPG, PNG hoặc WebP, tối đa 5 MB.'); return;
        }
        if (entry.coverUrl) URL.revokeObjectURL(entry.coverUrl);
        entry.cover = file; entry.coverUrl = URL.createObjectURL(file); alert(''); paint();
      });
      refs.removeCover.addEventListener('click', () => {
        if (running || !['pending', 'error'].includes(entry.state)) return;
        if (entry.coverUrl) URL.revokeObjectURL(entry.coverUrl);
        entry.cover = entry.coverUrl = null; paint();
      });
      refs.remove.addEventListener('click', () => {
        if (running) return;
        release(entry); entries = entries.filter(item => item !== entry); node.remove(); rows.delete(entry.id);
        if (!entries.length) { elapsed = 0; paused = false; alert(''); }
        paint();
      });
      refs.retry.addEventListener('click', () => {
        if (running || entry.state !== 'error') return;
        entry.state = 'pending'; entry.message = ''; entry.percent = 0; start([entry]);
      });
      rows.set(entry.id, refs); find('uploadQueue').append(node);
      return refs;
    }
    function paint() {
      if (!view?.isConnected) return;
      const waiting = entries.filter(entry => entry.state === 'pending').length;
      const success = entries.filter(entry => entry.state === 'success').length;
      const errors = entries.filter(entry => entry.state === 'error').length;
      const warnings = entries.filter(entry => entry.state === 'warning').length;
      // Previous: find('uploadEmpty').hidden = entries.length > 0;
      const hasFiles = entries.length > 0, previousStep = view.dataset.uploadStep;
      view.dataset.uploadStep = hasFiles ? 'details' : 'select';
      find('uploadSelectStep').hidden = hasFiles;
      find('uploadDetailsStep').hidden = !hasFiles;
      if (!hasFiles && previousStep === 'details') find('uploadChooseFiles').focus({ preventScroll: true });
      find('uploadProgressContainer').hidden = entries.length === 0;
      find('uploadAddFiles').disabled = running || entries.length >= MAX_FILES;
      find('mp3File').disabled = running;
      find('categoryId').disabled = running;
      find('uploadBtn').disabled = running || !waiting;
      text(find('uploadBtn').querySelector('span'), running ? 'Đang tải lên...' : `Tải lên${waiting ? ' (' + waiting + ')' : ''}`);
      find('uploadPause').hidden = !running;
      find('uploadPause').disabled = paused;
      find('uploadClear').hidden = !success;
      find('uploadClear').disabled = running;
      const transferring = entries.filter(entry => entry.state === 'uploading').length;
      const processing = entries.filter(entry => entry.state === 'processing').length;
      // Previous summary counted transmission and server processing together as "Đang tải ${active}".
      const summary = `${entries.length} bài · Đã lưu ${success} · Đang truyền ${transferring} · Đang hoàn tất ${processing} · Chờ ${waiting}` +
        (errors ? ` · Lỗi ${errors}` : '') + (warnings ? ` · Chưa xác nhận ${warnings}` : '') + (paused && waiting ? ' · Đã tạm dừng' : '');
      text(find('uploadSummaryText'), summary);
      text(find('uploadElapsed'), duration(elapsed + (running ? clock() - startedAt : 0)));
      /* Previous: the aggregate reserved an arbitrary 10% for processing and counted errors as complete.
      find('uploadProgressBar').value = entries.length ? entries.reduce((sum, entry) => sum +
        (terminal.has(entry.state) ? 100 : entry.percent * .9), 0) / entries.length : 0;
      */
      const total = entries.reduce((sum, entry) => sum + transferTotal(entry), 0);
      const loaded = entries.reduce((sum, entry) => sum + Math.min(entry.loaded || 0, transferTotal(entry)), 0);
      const transferPercent = total ? loaded / total * 100 : 0;
      find('uploadProgressBar').value = transferPercent;
      text(find('uploadTransferSummary'), `Đã gửi ${bytes(loaded)} / ${bytes(total)} · ${Math.floor(transferPercent)}% dữ liệu`);
      for (const entry of entries) {
        const refs = rows.get(entry.id) || buildRow(entry);
        const locked = running || !['pending', 'error'].includes(entry.state);
        refs.node.dataset.state = entry.state;
        refs.name.disabled = refs.category.disabled = refs.cover.disabled = refs.coverInput.disabled = refs.removeCover.disabled = locked;
        refs.remove.disabled = running;
        refs.retry.hidden = entry.state !== 'error'; refs.retry.disabled = running;
        refs.removeCover.hidden = !entry.coverUrl || locked;
        refs.image.hidden = !entry.coverUrl; refs.placeholder.hidden = Boolean(entry.coverUrl);
        if (entry.coverUrl && refs.image.getAttribute('src') !== entry.coverUrl) refs.image.src = entry.coverUrl;
        if (!entry.coverUrl) refs.image.removeAttribute('src');
        const status = { pending: 'Chờ tải lên', uploading: `Đang tải ${Math.floor(entry.percent)}%`, processing: entry.confirmed ? 'Đang hoàn tất...' : 'Đang xử lý trên server...',
          success: 'Đã tải lên', error: 'Tải lên thất bại', warning: 'Chưa xác nhận kết quả' }[entry.state];
        text(refs.status, status);
        refs.progress.value = entry.percent;
        const speed = entry.state === 'uploading' && clock() - entry.lastProgressAt <= SPEED_STALE_MS ? entry.rate : 0;
        refs.transfer.hidden = entry.state === 'pending';
        text(refs.transfer, `${bytes(entry.loaded || 0)} / ${bytes(transferTotal(entry))}` + (speed ? ` · ${bytes(speed)}/s` : ''));
        const time = ['uploading', 'processing'].includes(entry.state) ? clock() - entry.startedAt : entry.elapsed;
        const graceLeft = entry.state === 'processing' ? Math.max(0, COMPLETION_GRACE_MS - (clock() - entry.processingStartedAt)) : 0;
        text(refs.time, entry.state === 'pending' ? 'Chưa bắt đầu' :
          (entry.state === 'success' ? 'Hoàn tất trong ' : 'Đã chạy ') + duration(time) +
          (entry.state === 'uploading' && speed && entry.eta !== null ? ' · Truyền còn ~' + duration(entry.eta * 1000) : '') +
          (entry.state === 'processing' ? graceLeft > 0 ? ` · Chờ tối thiểu ${Math.ceil(graceLeft / 1000)}s` : entry.confirmed ? ' · Đang hoàn tất' : ' · Chờ xác nhận từ server' : ''));
        text(refs.message, entry.message); refs.message.hidden = !entry.message || entry.state === 'success';
        refs.library.hidden = entry.state !== 'warning';
      }
    }
    function addFiles(files) {
      if (running) return;
      const wasEmpty = entries.length === 0;
      const rejected = [];
      for (const original of files) {
        const extension = original.name.split('.').pop().toLowerCase();
        if (!mimeByExtension[extension] || (!audioTypes.has(original.type) && !['', 'application/octet-stream'].includes(original.type))) {
          rejected.push(original.name + ': định dạng không hỗ trợ'); continue;
        }
        if (!original.size || original.size > AUDIO_LIMIT) { rejected.push(original.name + ': audio phải lớn hơn 0 và tối đa 25 MB'); continue; }
        const key = [original.name.normalize('NFC'), original.size, original.lastModified].join('|');
        if (entries.some(entry => entry.key === key)) { rejected.push(original.name + ': đã có trong danh sách'); continue; }
        if (entries.length >= MAX_FILES) { rejected.push('Danh sách tối đa 20 bài.'); break; }
        const file = audioTypes.has(original.type) ? original : new File([original], original.name,
          { type: mimeByExtension[extension], lastModified: original.lastModified });
        entries.push({ id: crypto.randomUUID(), key, file, filename: original.name.normalize('NFC'), size: original.size,
          name: original.name.replace(/\.[^.]+$/, '').normalize('NFC').slice(0, 200), category: defaultCategory,
          customCategory: false, state: 'pending', percent: 0, elapsed: 0, eta: null, message: '', cover: null, coverUrl: null });
      }
      alert(rejected.slice(0, 4).join(' · ')); paint();
      if (wasEmpty && entries.length) find('uploadDetailsTitle')?.focus({ preventScroll: true });
    }
    function send(entry) {
      const xhr = new XMLHttpRequest(), body = new FormData();
      body.append('name', entry.name.trim().normalize('NFC'));
      body.append('categoryId', entry.category);
      body.append('song', entry.file);
      if (entry.cover) body.append('imageFile', entry.cover);
      entry.state = 'uploading'; entry.startedAt = clock(); entry.percent = 0; entry.eta = null;
      entry.loaded = 0; entry.total = entry.size + (entry.cover?.size || 0); entry.rate = 0;
      entry.lastLoaded = 0; entry.lastProgressAt = entry.startedAt; entry.processingStartedAt = null;
      entry.confirmed = false; entry.completionTimer = null;
      entry.notificationId = crypto.randomUUID(); active++;
      let settled = false;
      function finish(state, message) {
        if (settled) return;
        settled = true; active--;
        clearTimeout(entry.completionTimer); entry.completionTimer = null;
        entry.elapsed = clock() - entry.startedAt; entry.state = state; entry.message = String(message).slice(0, 800); entry.eta = null;
        if (state === 'success') { entry.percent = 100; entry.file = entry.cover = null; }
        notify(entry); pump();
      }
      xhr.upload.onprogress = event => {
        if (settled || entry.state !== 'uploading' || !event.lengthComputable || !(event.total > 0) || !Number.isFinite(event.total) || !Number.isFinite(event.loaded)) return;
        entry.total = event.total; entry.loaded = Math.max(0, Math.min(event.loaded, event.total));
        entry.percent = entry.loaded / entry.total * 100;
        /* Previous ETA used the average since the request started, including connection setup.
        const seconds = (clock() - entry.startedAt) / 1000;
        entry.eta = event.loaded > 0 && seconds >= .2 ? Math.ceil((event.total - event.loaded) / (event.loaded / seconds)) : null;
        */
        const now = clock(), seconds = (now - entry.lastProgressAt) / 1000;
        if (seconds >= .2) {
          const rate = Math.max(0, entry.loaded - entry.lastLoaded) / seconds;
          entry.rate = entry.rate && seconds * 1000 <= SPEED_STALE_MS ? entry.rate * .7 + rate * .3 : rate;
          entry.lastProgressAt = now; entry.lastLoaded = entry.loaded;
        }
        entry.eta = entry.rate > 0 ? Math.ceil((entry.total - entry.loaded) / entry.rate) : null;
        paint();
      };
      function markProcessing() {
        if (settled) return;
        if (entry.processingStartedAt === null) entry.processingStartedAt = clock();
        entry.state = 'processing'; entry.percent = 100; entry.loaded = entry.total; entry.eta = null; paint();
      }
      // Previous upload.onload only switched the label; completion now has a five-second minimum.
      xhr.upload.onload = markProcessing;
      xhr.onload = () => {
        if (settled || entry.confirmed) return;
        let response;
        try { response = JSON.parse(xhr.responseText); } catch { /* A redirect/HTML response is not confirmation that a song was saved. */ }
        if (xhr.status === 401 || xhr.status === 403 || /\/auth\/(?:signin|login)(?:[/?#]|$)/.test(xhr.responseURL || '')) {
          paused = true; alert('Phiên đăng nhập hoặc quyền upload đã thay đổi. Hàng đợi đã tạm dừng.');
        }
        if (xhr.status === 429) { paused = true; alert('Máy chủ đang giới hạn số lần tải lên. Hàng đợi đã tạm dừng; vui lòng thử lại sau.'); }
        // Previous: a successful HTTP response immediately called finish('success', 'Bài hát đã được lưu.').
        if (xhr.status >= 200 && xhr.status < 300 && response?.success === true) {
          markProcessing(); entry.confirmed = true;
          const remaining = Math.ceil(Math.max(0, COMPLETION_GRACE_MS - (clock() - entry.processingStartedAt)));
          if (!remaining) return finish('success', 'Bài hát đã được lưu.');
          entry.completionTimer = setTimeout(() => finish('success', 'Bài hát đã được lưu.'), remaining);
          paint(); return;
        }
        if ((response?.success === false && xhr.status >= 200) || (xhr.status >= 400 && xhr.status < 500)) {
          return finish('error', typeof (response?.message || response?.error) === 'string' ? response.message || response.error : 'Server từ chối tải lên.');
        }
        finish('warning', 'Chưa xác nhận được bài hát đã lưu. Kiểm tra Library trước khi tải lại để tránh trùng bài.');
      };
      xhr.onerror = xhr.onabort = () => { if (!entry.confirmed) finish('warning', 'Mất kết nối. Kiểm tra Library trước khi tải lại để tránh trùng bài.'); };
      xhr.ontimeout = () => { if (!entry.confirmed) finish('warning', 'Hết thời gian chờ. Kiểm tra Library trước khi tải lại để tránh trùng bài.'); };
      try { xhr.open('POST', '/product/upload'); xhr.timeout = 600000; xhr.send(body); }
      catch { finish('error', 'Không thể gửi file. Vui lòng thử lại.'); }
    }
    function pump() {
      while (running && !paused && active < 2) {
        const next = entries.find(entry => entry.scheduled && entry.state === 'pending');
        if (!next) break;
        next.scheduled = false; send(next);
      }
      if (running && !active && (paused || !entries.some(entry => entry.scheduled && entry.state === 'pending'))) {
        elapsed += clock() - startedAt; running = false; clearInterval(timer); timer = null;
        if (!paused) {
          const failed = entries.some(entry => entry.state === 'error' || entry.state === 'warning');
          alert(failed ? 'Đã xử lý xong hàng đợi. Một số bài cần kiểm tra lại.' : 'Đã tải lên tất cả bài hát.', failed ? '' : 'success');
        }
      }
      paint();
    }
    function start(candidates = entries.filter(entry => entry.state === 'pending')) {
      if (running || !candidates.length) return;
      const invalid = candidates.find(entry => !entry.name.trim() || !entry.category);
      if (invalid) {
        alert('Vui lòng nhập tên và chọn thể loại cho từng bài trước khi tải lên.');
        const refs = rows.get(invalid.id);
        (invalid.name.trim() ? refs?.category : refs?.name)?.focus(); return;
      }
      entries.forEach(entry => { entry.scheduled = candidates.includes(entry); });
      running = true; paused = false; startedAt = clock(); alert('');
      timer = setInterval(paint, 250); pump();
    }
    function mount(root) {
      if (view === root && root.dataset.uploadInitialized === 'true') return;
      observer?.disconnect(); rows.clear(); view = root;
      root.dataset.uploadInitialized = 'true';
      const form = find('uploadForm'), picker = find('mp3File'), category = find('categoryId');
      form.dataset.uploadInitialized = 'true';
      category.value = defaultCategory;
      form.addEventListener('submit', event => { event.preventDefault(); start(); });
      find('uploadChooseFiles').addEventListener('click', () => picker.click());
      find('uploadAddFiles').addEventListener('click', () => picker.click());
      picker.addEventListener('change', () => { addFiles(Array.from(picker.files)); picker.value = ''; });
      category.addEventListener('change', () => {
        if (running) return;
        defaultCategory = category.value;
        for (const entry of entries) if (!entry.customCategory && ['pending', 'error'].includes(entry.state)) {
          entry.category = defaultCategory;
          const refs = rows.get(entry.id); if (refs) refs.category.value = defaultCategory;
        }
      });
      find('uploadPause').addEventListener('click', () => {
        if (!running) return;
        paused = true; alert('Hàng đợi đã tạm dừng. Các bài đang gửi sẽ được hoàn tất.'); pump();
      });
      find('uploadClear').addEventListener('click', () => {
        if (running) return;
        for (const entry of entries.filter(item => item.state === 'success')) {
          release(entry); rows.get(entry.id)?.node.remove(); rows.delete(entry.id);
        }
        entries = entries.filter(entry => entry.state !== 'success');
        if (!entries.length) { elapsed = 0; alert(''); }
        paint();
      });
      let dragDepth = 0;
      root.addEventListener('dragenter', event => { if (Array.from(event.dataTransfer?.types || []).includes('Files')) { event.preventDefault(); dragDepth++; if (!running) root.classList.add('is-dragging'); } });
      // Previous dragover handler only prevented browser navigation and did not set the drop feedback.
      root.addEventListener('dragover', event => {
        if (Array.from(event.dataTransfer?.types || []).includes('Files')) {
          event.preventDefault(); event.dataTransfer.dropEffect = running ? 'none' : 'copy';
        }
      });
      root.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; root.classList.remove('is-dragging'); } });
      root.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; root.classList.remove('is-dragging'); addFiles(Array.from(event.dataTransfer?.files || [])); });
      root.addEventListener('click', event => {
        const link = event.target.closest('[data-upload-link]');
        if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 || typeof window.navigateMediaHz !== 'function') return;
        event.preventDefault(); window.navigateMediaHz(link.getAttribute('href'), true);
      });
      observer = new MutationObserver(() => { if (view === root && !root.isConnected) { observer.disconnect(); view = null; rows.clear(); } });
      observer.observe(root.parentNode, { childList: true });
      alert(alertMessage, alertTone); paint();
    }
    window.addEventListener('beforeunload', event => {
      if (running || entries.some(entry => entry.state === 'pending')) { event.preventDefault(); event.returnValue = ''; }
    });
    window.addEventListener('pagehide', event => { if (!event.persisted) { clearInterval(timer); observer?.disconnect(); entries.forEach(release); } });
    return Object.freeze({ mount });
  }
  function initUploadForm() {
    const root = document.querySelector('[data-upload-view]');
    if (!root) return;
    window.MediaHzUploadQueue ||= createQueue();
    window.MediaHzUploadQueue.mount(root);
  }
  window.initUploadForm = initUploadForm;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUploadForm, { once: true });
  else initUploadForm();
})(window, document);
