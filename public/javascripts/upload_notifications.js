(function () {
  if (window.MediaHzNotifications) return;
  // The complete previous local-upload-only implementation is preserved in upload_notifications_legacy.js (unloaded).
  const storageKey = 'mediahz-upload-notifications';
  const ownerKey = storageKey + '-owner';
  // Previous immutable owner could retain another account's notices after SPA sign-in.
  let owner = document.querySelector('[data-notification-owner]')?.dataset.notificationOwner;
  let accountId=document.querySelector('[data-notification-account]')?.dataset.notificationAccount||'';
  let serverEntries=[],epoch=0,sequence=0,preferenceVersion=0,controller=new AbortController(),uploadsAllowed=true;
  const validId=value=>typeof value==='string'&&/^[a-f0-9]{24}$/i.test(value);
  async function api(path,options={}){
    const id=accountId,generation=epoch;
    if(!validId(id))return null;
    const response=await fetch('/api/account'+path,{credentials:'same-origin',cache:'no-store',...options,
      headers:{Accept:'application/json','X-Settings-Owner':id,...(options.body?{'Content-Type':'application/json'}:{})},
      signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
    const json=await response.json();
    if(generation!==epoch||id!==accountId||!response.ok||!json.success||json.data?.viewerId!==id)return null;
    return json.data;
  }
  async function loadServer(){
    const current=++sequence;
    try{const data=await api('/notifications');if(data&&current===sequence){serverEntries=Array.isArray(data.items)?data.items:[];render();}}catch{/* Existing local upload status remains available offline. */}
  }
  async function loadPreferences(){
    const version=++preferenceVersion;
    try{const data=await api('/preferences');if(data&&version===preferenceVersion){uploadsAllowed=data.preferences?.notifications?.uploads!==false;if(!uploadsAllowed){entries=[];save();}render();}}catch{}
  }
  function serverMutation(path,method){
    const current=++sequence;
    return api(path,{method,body:JSON.stringify({confirm:true})}).then(data=>{if(data&&current===sequence){serverEntries=data.items||[];render();}}).catch(()=>{});
  }
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
    // Previous: the bell contained upload notices from this tab only.
    const combined=[...entries,...serverEntries].sort((a,b)=>b.time-a.time).slice(0,50);
    const unread = combined.filter(item => !item.read).length;
    if (badge) { badge.textContent = unread > 9 ? '9+' : String(unread); badge.hidden = !unread; }
    bell?.setAttribute('aria-label', unread ? 'Thông báo, ' + unread + ' chưa đọc' : 'Thông báo');
    if (!list) return;
    list.replaceChildren();
    if (!combined.length) list.append(element('li', 'upload-notification-empty', 'Chưa có thông báo'));
    combined.forEach(item => {
      const row = element('li', 'upload-notification-item is-' + item.status);
      row.append(element('span', 'upload-notification-symbol', item.status === 'success' ? '\u2713' : '!'));
      const content = element('div', 'upload-notification-content');
      content.append(element('strong', '', item.title), element('p', '', item.message));
      const time = element('time', '', new Date(item.time).toLocaleString('vi-VN'));
      time.dateTime = new Date(item.time).toISOString();
      content.append(time); row.append(content); list.append(row);
      if(typeof item.url==='string'&&item.url.startsWith('/')&&!item.url.startsWith('//')){
        const open=()=>{close();if(item.type==='messages'&&window.MediaHzMail)window.MediaHzMail.open();else if(window.navigateMediaHz)window.navigateMediaHz(item.url,true);else location.assign(item.url);};
        row.tabIndex=0;row.setAttribute('role','link');row.style.cursor='pointer';row.addEventListener('click',open);
        row.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();open();}});
      }
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
      clear.addEventListener('click', () => { entries = []; serverEntries=[]; save(); render();serverMutation('/notifications','DELETE'); });
      const dismiss = element('button', 'upload-notification-close', '\u00d7'); dismiss.type = 'button';
      dismiss.title = 'Đóng'; dismiss.setAttribute('aria-label', 'Đóng thông báo');
      dismiss.addEventListener('click', () => { close(); bell.focus(); });
      header.append(clear, dismiss);
      list = element('ul', 'upload-notification-list'); panel.append(header, list); document.body.append(panel);
      bell.addEventListener('click', () => {
        if (!panel.hidden) { close(); return; }
        entries.forEach(item => { item.read = true; }); save(); render();
        serverEntries.forEach(item=>{item.read=true;});render();serverMutation('/notifications/read','POST');
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
    if(!uploadsAllowed)return;
    if (detail.owner !== undefined && String(detail.owner) !== owner) return;
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
  function setOwner(value,nextAccount) {
    const next = String(value || 'guest');
    if (next === owner&&(!nextAccount||nextAccount===accountId)) return;
    epoch++;sequence++;preferenceVersion++;controller.abort();controller=new AbortController();
    accountId=validId(nextAccount)?nextAccount:validId(next)?next:'';serverEntries=[];uploadsAllowed=true;
    owner = next; entries = []; close(); clearTimeout(toastTimer);
    if (toast) toast.hidden = true;
    try { sessionStorage.setItem(ownerKey, owner); } catch {}
    save(); render();loadPreferences();loadServer();
  }
  window.addEventListener('mediahz:authenticated', event => setOwner(event.detail?.user?.userID || event.detail?.user?.id || 'guest',event.detail?.user?.id||''));
  window.addEventListener('mediahz:preferences',event=>{
    if(event.detail?.viewerId!==accountId)return;
    // Invalidate older reads from this same owner, not only reads from another account.
    preferenceVersion++;
    uploadsAllowed=event.detail.preferences?.notifications?.uploads!==false;
    if(!uploadsAllowed){entries=[];save();if(toast)toast.hidden=true;}
    render();loadServer();
  });
  // Previous API: { publish }; existing callers remain compatible.
  window.MediaHzNotifications = { publish, setOwner };
  init();
  loadPreferences();loadServer();
  const poll=setInterval(()=>{if(!document.hidden)loadServer();},30000);
  window.addEventListener('pagehide',()=>{clearInterval(poll);controller.abort();});
})();
