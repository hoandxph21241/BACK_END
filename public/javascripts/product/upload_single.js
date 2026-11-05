(function (window, document) {
  'use strict';
  // The former queue remains in upload_queue.js, unloaded. This controller owns one file.
  const AUDIO_LIMIT = 25 * 1024 * 1024, COVER_LIMIT = 5 * 1024 * 1024;
  const GRACE_MS = 5000, STALE_MS = 2500;
  const mime = { mp3:'audio/mpeg', m4a:'audio/mp4', wav:'audio/wav', flac:'audio/flac' };
  const audioTypes = new Set(['audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/x-m4a','audio/wav','audio/x-wav','audio/flac']);
  const now = () => performance.now();
  const bytes = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
  const time = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0'); };
  const write = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const id = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value) ? value : '';
  function songUrl(value) { try { const url = new URL(value, location.origin); return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && url.origin === location.origin ? url.pathname + url.search : ''; } catch { return ''; } }

  function createUploader() {
    let view, ui, observer, viewEvents, entry = null, owner = null, generation = 0;
    let allowed = true, checking = false, timer, message = '', tone = '';
    const busy = () => checking || ['sending','processing'].includes(entry?.state);
    const current = item => entry === item && item.owner === owner && item.generation === generation && !item.finished;
    function notifyScope(value) { window.MediaHzNotifications?.setOwner?.(value || 'guest'); }
    function alert(value = '', kind = '') { message = value; tone = kind; paint(); }
    function release(item) { if (!item) return; clearTimeout(item.completionTimer); if (item.coverUrl) URL.revokeObjectURL(item.coverUrl); item.file = item.cover = item.coverUrl = null; }
    function clear() {
      ++generation; checking = false; clearInterval(timer); timer = null;
      const previous = entry; entry = null;
      if (previous) { previous.finished = true; previous.xhr?.abort(); release(previous); }
      message = ''; tone = ''; paint();
    }
    function changeAccount(user, announce = true) {
      clear(); owner = id(user?.id); allowed = Boolean(owner) && Number(user?.role) === 2;
      if (view?.isConnected) view.dataset.uploadOwner = owner;
      notifyScope(user?.userID || owner);
      alert(announce ? 'Phiên đăng nhập đã thay đổi. Vui lòng chọn lại tệp cho tài khoản hiện tại.' : '');
    }
    async function verifyAccount(expected = owner, version = generation) {
      try {
        const response = await fetch('/auth/session', { credentials:'same-origin', cache:'no-store', signal:AbortSignal.timeout(10000) });
        const data = await response.json();
        if (version !== generation || expected !== owner) return { valid:false };
        if (!response.ok || !data.success) return { valid:false, unknown:true };
        const user = data.authenticated ? data.user : null;
        if (id(user?.id) !== expected) { changeAccount(user); return { valid:false }; }
        allowed = Boolean(expected) && Number(user?.role) === 2;
        notifyScope(user?.userID || expected); paint();
        return { valid:allowed, notificationOwner:user?.userID || expected };
      } catch { return { valid:false, unknown:true }; }
    }
    function paint() {
      if (!view?.isConnected || !ui) return;
      const state = entry?.state || 'empty', locked = busy() || !allowed || !owner;
      view.dataset.uploadState = state;
      view.dataset.uploadStep = entry ? 'details' : 'select';
      ui.select.hidden = Boolean(entry); ui.details.hidden = !entry;
      write(ui.alert, message); ui.alert.hidden = !message; ui.alert.dataset.tone = tone;
      for (const node of [ui.picker,ui.choose,ui.replace,ui.coverFile,ui.artwork,ui.removeCover,ui.title,ui.artist,ui.genre]) node.disabled = locked || Boolean(entry && !['ready','error'].includes(state));
      ui.reset.disabled = busy();
      ui.submit.disabled = locked || !entry || !['ready','error'].includes(state);
      write(ui.submit.querySelector('span'), checking ? 'Đang kiểm tra...' : state === 'error' ? 'Thử tải lại' : busy() ? 'Đang tải lên...' : 'Tải lên');
      if (!entry) {
        for (const node of [ui.title,ui.artist,ui.genre]) node.value = '';
        ui.image.removeAttribute('src'); ui.image.hidden = true;
        ui.artwork.classList.remove('has-cover'); ui.removeCover.hidden = true;
        for (const node of [ui.filename,ui.fileSize,ui.transfer,ui.speed,ui.hint]) write(node,'');
        ui.bar.value = 0; write(ui.percent,'0%'); write(ui.status,'Chờ tải lên'); write(ui.elapsed,'00:00');
        ui.song.hidden = ui.library.hidden = true; ui.song.href = '/library';
        return;
      }
      for (const [node,value] of [[ui.title,entry.name],[ui.artist,entry.artist],[ui.genre,entry.genre]]) if (node.value !== value) node.value = value;
      write(ui.filename, entry.filename); ui.filename.title = entry.filename;
      write(ui.fileSize, bytes(entry.size) + ' · ' + entry.extension.toUpperCase());
      ui.image.hidden = !entry.coverUrl; ui.artwork.classList.toggle('has-cover', Boolean(entry.coverUrl));
      if (entry.coverUrl && ui.image.getAttribute('src') !== entry.coverUrl) ui.image.src = entry.coverUrl;
      if (!entry.coverUrl) ui.image.removeAttribute('src');
      ui.removeCover.hidden = !entry.coverUrl;
      const known = entry.total > 0, transferred = Boolean(entry.transferred);
      const percent = transferred ? 100 : known ? Math.floor(Math.min(1, entry.loaded / entry.total) * 100) : state === 'ready' ? 0 : null;
      if (percent === null) ui.bar.removeAttribute('value'); else ui.bar.value = percent;
      write(ui.percent, percent === null ? '—' : percent + '%');
      ui.bar.setAttribute('aria-valuetext', percent === null ? 'Chưa đo được tổng dữ liệu' : percent + '% dữ liệu đã gửi');
      const statuses = { ready:'Chờ tải lên', sending:percent === null ? 'Đang kết nối và gửi tệp...' : 'Đang gửi dữ liệu · ' + percent + '%', processing:'Đã gửi 100% dữ liệu · Đang hoàn tất', success:'Tải lên thành công', error:'Tải lên thất bại', warning:'Chưa xác nhận kết quả tải lên' };
      write(ui.status, statuses[state] || '');
      write(ui.transfer, known ? `Đã gửi ${bytes(entry.loaded)} / ${bytes(entry.total)}` : transferred ? 'Đã truyền xong dữ liệu' : state === 'ready' ? 'Chưa bắt đầu truyền dữ liệu' : 'Đang chờ thông tin dung lượng truyền');
      const speed = state === 'sending' && now() - entry.lastProgressAt <= STALE_MS ? entry.rate : 0;
      write(ui.speed, speed > 0 ? bytes(speed) + '/s' + (known ? ' · Còn khoảng ' + time((entry.total - entry.loaded) / speed * 1000) : '') : '');
      write(ui.elapsed, time(entry.startedAt === null ? 0 : entry.elapsed ?? now() - entry.startedAt));
      ui.hint.hidden = !['sending','processing'].includes(state);
      write(ui.hint, state === 'processing' ? 'Tệp đã được gửi. Vui lòng giữ trang mở đến khi nhận kết quả.' : 'Phần trăm được tính theo dữ liệu đã gửi lên máy chủ.');
      ui.library.hidden = !['success','warning'].includes(state);
      ui.song.hidden = state !== 'success' || !entry.url;
      if (entry.url) ui.song.href = entry.url;
      write(ui.reset.querySelector('span'), state === 'success' ? 'Tải bài khác' : 'Chọn tệp khác');
    }
    function choose(files) {
      if (busy() || !owner || !allowed) return;
      if (!files.length) return;
      if (files.length !== 1) return alert('Vui lòng chỉ chọn một bài hát cho mỗi lần tải lên.');
      const original = files[0], extension = original.name.split('.').pop().toLowerCase();
      if (!mime[extension] || !audioTypes.has(original.type) && !['','application/octet-stream'].includes(original.type)) return alert('Tệp phải có định dạng MP3, M4A, WAV hoặc FLAC.');
      if (!original.size || original.size > AUDIO_LIMIT) return alert('Tệp âm thanh phải lớn hơn 0 và không quá 25 MB.');
      clear();
      const file = audioTypes.has(original.type) ? original : new File([original], original.name, {type:mime[extension],lastModified:original.lastModified});
      entry = { file, size:file.size, filename:file.name.normalize('NFC'), extension, name:file.name.replace(/\.[^.]+$/,'').normalize('NFC').slice(0,200), artist:'', genre:'', state:'ready', owner, generation, loaded:0, total:null, startedAt:null, elapsed:null, rate:0, cover:null, coverUrl:null, transferred:false };
      paint(); ui.heading.focus({ preventScroll:true });
    }
    function updateBytes(item, event) {
      if (!event.lengthComputable || !Number.isFinite(event.total) || event.total <= 0 || !Number.isFinite(event.loaded) || event.loaded < 0) return;
      item.total = event.total; item.loaded = Math.min(event.total, Math.max(item.loaded, event.loaded));
      const seconds = (now() - item.lastProgressAt) / 1000;
      if (seconds >= .2) {
        const rate = Math.max(0, item.loaded - item.lastLoaded) / seconds;
        item.rate = item.rate && seconds * 1000 <= STALE_MS ? item.rate * .7 + rate * .3 : rate;
        item.lastLoaded = item.loaded; item.lastProgressAt = now();
      }
    }
    async function settle(item, state, reason) {
      if (!current(item) || item.settling) return;
      item.settling = true; clearTimeout(item.completionTimer);
      const account = await verifyAccount(item.owner, item.generation);
      if (!current(item)) return;
      if (!account.valid) {
        state = 'warning'; reason = account.unknown ? 'Chưa xác nhận được phiên đăng nhập hoặc kết quả. Kiểm tra Library trước khi tải lại.' : 'Tài khoản hiện tại không có quyền tải lên.';
      }
      item.finished = true; item.state = state; item.elapsed = now() - item.startedAt;
      clearInterval(timer); timer = null;
      if (state === 'success') { item.file = item.cover = null; }
      alert(reason, state === 'success' ? 'success' : '');
      if (account.valid) {
        try { window.MediaHzNotifications?.publish({ owner:account.notificationOwner, id:item.notificationId, status:state, title:state === 'success' ? 'Tải lên thành công' : state === 'error' ? 'Tải lên thất bại' : 'Chưa xác nhận kết quả tải lên', message:item.name + ' · ' + reason + ' (' + time(item.elapsed) + ')' }); }
        catch { /* Notification failures must not alter an upload's confirmed result. */ }
      }
    }
    async function start() {
      if (busy() || !entry || !['ready','error'].includes(entry.state) || !owner || !allowed) return;
      if (!entry.name.trim()) { alert('Vui lòng nhập tên bài hát.'); ui.title.focus(); return; }
      const item = entry; checking = true; alert();
      const account = await verifyAccount(item.owner, item.generation);
      if (item !== entry || item.generation !== generation) return;
      checking = false;
      if (!account.valid) return alert(account.unknown ? 'Chưa kiểm tra được phiên đăng nhập. Vui lòng thử lại.' : 'Tài khoản hiện tại không có quyền tải lên.');
      const body = new FormData(); body.append('name', item.name.trim().normalize('NFC'));
      if (item.artist.trim()) body.append('artist', item.artist.trim().normalize('NFC'));
      // Empty genre means no categoryId, not a new empty category record.
      if (item.genre) body.append('categoryId', item.genre);
      body.append('song', item.file); if (item.cover) body.append('imageFile', item.cover);
      const xhr = new XMLHttpRequest(); item.xhr = xhr;
      Object.assign(item, { state:'sending', finished:false, settling:false, confirmed:false, transferred:false, startedAt:now(), elapsed:null, loaded:0, total:null, rate:0, lastLoaded:0, lastProgressAt:now(), transferFinishedAt:null, notificationId:crypto.randomUUID(), url:'' });
      function processing(event = {}) {
        if (!current(item) || item.settling) return;
        updateBytes(item, event);
        if (item.transferFinishedAt === null) item.transferFinishedAt = now();
        item.state = 'processing'; item.transferred = true; if (item.total) item.loaded = item.total; paint();
      }
      xhr.upload.onprogress = event => { if (!current(item) || item.settling || item.state !== 'sending') return; updateBytes(item,event); paint(); };
      xhr.upload.onload = processing;
      xhr.onload = () => {
        if (!current(item) || item.confirmed || item.settling) return;
        let response; try { response = JSON.parse(xhr.responseText); } catch { /* HTML/redirects are not confirmation. */ }
        const confirmed = xhr.status >= 200 && xhr.status < 300 && response?.success === true && id(response.data?.id);
        if (confirmed) {
          processing(); item.confirmed = true; item.url = songUrl(response.data.url);
          const remaining = Math.max(0, GRACE_MS - (now() - item.transferFinishedAt));
          if (remaining) item.completionTimer = setTimeout(() => settle(item,'success','Bài hát đã được lưu.'),remaining);
          else settle(item,'success','Bài hát đã được lưu.');
          return;
        }
        const reason = typeof (response?.message || response?.error) === 'string' ? (response.message || response.error).slice(0,800) : 'Máy chủ từ chối tải lên. Vui lòng kiểm tra lại.';
        if (xhr.status >= 400 && xhr.status < 500 || xhr.status >= 200 && xhr.status < 300 && response?.success === false) return settle(item,'error',reason);
        settle(item,'warning','Chưa xác nhận được bài hát đã lưu. Kiểm tra Library trước khi tải lại để tránh trùng bài.');
      };
      xhr.onerror = xhr.onabort = () => { if (!item.confirmed) settle(item,'warning','Mất kết nối. Kiểm tra Library trước khi tải lại để tránh trùng bài.'); };
      xhr.ontimeout = () => { if (!item.confirmed) settle(item,'warning','Hết thời gian chờ. Kiểm tra Library trước khi tải lại để tránh trùng bài.'); };
      timer = setInterval(paint,250); paint();
      try { xhr.open('POST','/product/upload'); xhr.setRequestHeader('X-Requested-With','XMLHttpRequest'); xhr.setRequestHeader('X-Upload-Owner',item.owner); xhr.timeout = 600000; xhr.send(body); }
      catch { settle(item,'error','Không thể gửi tệp. Vui lòng thử lại.'); }
    }
    function mount(root) {
      if (view === root && root.dataset.uploadInitialized === 'true') return;
      const nextOwner = id(root.dataset.uploadOwner);
      if (owner === null) { owner = nextOwner; allowed = Boolean(owner); }
      else if (owner !== nextOwner) { clear(); owner = nextOwner; allowed = Boolean(owner); }
      observer?.disconnect(); viewEvents?.abort(); viewEvents = new AbortController();
      view = root; const get = value => root.querySelector('#' + value);
      ui = { select:get('uploadSelectStep'), details:get('uploadDetailsStep'), heading:get('uploadDetailsTitle'), alert:get('uploadAlert'), picker:get('mp3File'), choose:get('uploadChooseFiles'), replace:get('uploadReplace'), title:get('uploadTitle'), artist:get('uploadArtist'), genre:get('categoryId'), coverFile:get('uploadCoverFile'), artwork:get('uploadArtwork'), image:get('uploadArtwork').querySelector('img'), removeCover:get('uploadRemoveCover'), filename:get('uploadFilename'), fileSize:get('uploadFileSize'), submit:get('uploadBtn'), reset:get('uploadReset'), bar:get('uploadProgressBar'), percent:get('uploadPercent'), status:get('uploadStatus'), transfer:get('uploadTransferSummary'), speed:get('uploadTransferSpeed'), elapsed:get('uploadElapsed'), hint:get('uploadStatusHint'), library:get('uploadLibraryLink'), song:get('uploadSongLink') };
      const options = {signal:viewEvents.signal};
      get('uploadForm').addEventListener('submit',event => {event.preventDefault();start();},options);
      ui.choose.addEventListener('click',() => ui.picker.click(),options);
      ui.replace.addEventListener('click',() => ui.picker.click(),options);
      ui.picker.addEventListener('change',() => { const files = Array.from(ui.picker.files); ui.picker.value = ''; choose(files); },options);
      for (const [node,key] of [[ui.title,'name'],[ui.artist,'artist'],[ui.genre,'genre']]) node.addEventListener(key === 'genre' ? 'change' : 'input',() => {if(entry && !busy())entry[key] = node.value;},options);
      ui.artwork.addEventListener('click',() => ui.coverFile.click(),options);
      ui.coverFile.addEventListener('change',() => {
        const file = ui.coverFile.files[0]; ui.coverFile.value = '';
        if (!file || !entry || busy() || !['ready','error'].includes(entry.state)) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > COVER_LIMIT) return alert('Ảnh bìa phải là JPG, PNG hoặc WebP, tối đa 5 MB.');
        if (entry.coverUrl) URL.revokeObjectURL(entry.coverUrl);
        entry.cover = file; entry.coverUrl = URL.createObjectURL(file); alert();
      },options);
      ui.removeCover.addEventListener('click',() => {if(!entry || busy())return;if(entry.coverUrl)URL.revokeObjectURL(entry.coverUrl);entry.cover = entry.coverUrl = null;paint();},options);
      ui.reset.addEventListener('click',() => {if(busy())return;clear();ui.choose.focus();},options);
      let depth = 0;
      root.addEventListener('dragenter',event => {if(Array.from(event.dataTransfer?.types || []).includes('Files')){event.preventDefault();depth++;if(!busy())root.classList.add('is-dragging');}},options);
      root.addEventListener('dragover',event => {if(Array.from(event.dataTransfer?.types || []).includes('Files')){event.preventDefault();event.dataTransfer.dropEffect = busy() ? 'none' : 'copy';}},options);
      root.addEventListener('dragleave',() => {if(--depth <= 0){depth = 0;root.classList.remove('is-dragging');}},options);
      root.addEventListener('drop',event => {event.preventDefault();depth = 0;root.classList.remove('is-dragging');choose(Array.from(event.dataTransfer?.files || []));},options);
      root.addEventListener('click',event => {const link = event.target.closest('[data-upload-link]');if(!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !window.navigateMediaHz)return;event.preventDefault();window.navigateMediaHz(link.getAttribute('href'),true);},options);
      root.dataset.uploadInitialized = 'true'; get('uploadForm').dataset.uploadInitialized = 'true';
      observer = new MutationObserver(() => {if(view === root && !root.isConnected){observer.disconnect();viewEvents.abort();view = ui = null;}});
      observer.observe(root.parentNode,{childList:true}); paint(); verifyAccount();
    }
    window.addEventListener('mediahz:authenticated',event => changeAccount(event.detail?.user));
    // Also recover a session started in another tab after this view observed logout.
    window.addEventListener('focus',() => {if(owner || view?.isConnected)verifyAccount();});
    document.addEventListener('visibilitychange',() => {if(!document.hidden && (owner || view?.isConnected))verifyAccount();});
    window.addEventListener('beforeunload',event => {if(busy() || entry?.file){event.preventDefault();event.returnValue = '';}});
    window.addEventListener('pagehide',event => {if(!event.persisted){clear();observer?.disconnect();viewEvents?.abort();}});
    return Object.freeze({mount});
  }
  function initUploadForm() { const root = document.querySelector('[data-upload-view]'); if(!root)return; window.MediaHzSingleUpload ||= createUploader();window.MediaHzSingleUpload.mount(root); }
  window.initUploadForm = initUploadForm;
  if(document.readyState === 'loading')document.addEventListener('DOMContentLoaded',initUploadForm,{once:true});else initUploadForm();
})(window, document);
