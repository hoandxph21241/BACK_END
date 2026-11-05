(function () {
  'use strict';
  if (window.MediaHzAccountSettings) return;
  const views = new Map(), validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  const element = (tag, cls, value) => { const node = document.createElement(tag); if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node; };
  const date = value => { const d=new Date(value);return value && Number.isFinite(d.getTime())?d.toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}):'Chưa có thông tin'; };
  const localUrl = (value,fallback) => {try{const url=new URL(value,location.origin);return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&url.origin===location.origin?url.pathname+url.search:fallback;}catch{return fallback;}};
  function authChanged(data) {
    const slot=document.getElementById('navAuthControls');
    if(slot&&typeof data.nav==='string')slot.innerHTML=data.nav;
    else if(slot&&!data.user){const link=element('a','btn','Login');link.href='/auth/signin';link.dataset.openLogin='';slot.replaceChildren(link);}
    window.dispatchEvent(new CustomEvent('mediahz:authenticated',{detail:{user:data.user||null}}));
    document.getElementById('mediaPlayerFrame')?.contentWindow.postMessage({type:'authChanged',userId:data.user?.id||null},location.origin);
  }
  function init(root) {
    const find=selector=>root.querySelector(selector), all=selector=>Array.from(root.querySelectorAll(selector));
    const dialogs=new Map(all('[data-account-dialog]').map(node=>[node.dataset.accountDialog,node]));
    const status=find('[data-account-status]'), retry=find('[data-account-retry]'), login=find('[data-account-login]');
    const list=find('[data-session-list]'), listPanel=find('[data-session-list-panel]'), confirmPanel=find('[data-session-confirm-panel]'), listStatus=find('[data-session-status]');
    let owner=validId(root.dataset.accountOwner)?root.dataset.accountOwner:'', version=0, metaVersion=0, listVersion=0;
    let account=null, sessions=[], ready=false, loading=false, mutating=false, uncertain=false, target=null, previousFocus;
    let accountAbort=new AbortController(), metaAbort, listAbort;
    const events=new AbortController(), opts={signal:events.signal};
    const active=()=>root.isConnected&&!events.signal.aborted;
    const message=(node,value,error=false)=>{node.textContent=value;node.hidden=!value;node.classList.toggle('is-error',error);};
    function controls() {
      all('[data-account-open],[data-account-edit],[data-account-copy]').forEach(button=>{button.disabled=!owner||!ready||mutating;});
      all('[data-account-close]').forEach(button=>{button.disabled=mutating;});
      all('[data-session-revoke]').forEach(button=>{button.disabled=mutating||loading||uncertain||!owner;});
      find('[data-session-revoke-others]').disabled=mutating||loading||uncertain||!sessions.some(s=>!s.current);
      find('[data-session-refresh]').disabled=mutating||loading||Boolean(target);
      find('[data-session-confirm]').disabled=mutating||!target||!owner;
      find('[data-session-cancel]').disabled=mutating;
      find('[data-session-confirm]').textContent=mutating?'Đang đăng xuất...':'Đăng xuất';
    }
    function clearPrivate() {
      account=null;ready=false;sessions=[];target=null;loading=mutating=uncertain=false;
      all('[data-account-field]').forEach(node=>{node.textContent='—';});
      find('[data-account-profile-url]').value='';find('[data-account-profile]').href='/users/profile';
      find('[data-account-copy-status]').textContent='';list.replaceChildren();find('[data-session-count]').textContent='';
      message(listStatus,'');confirmPanel.hidden=true;listPanel.hidden=false;find('[data-session-retry]').hidden=true;
    }
    async function request(path, options={}) {
      const response=await fetch('/api/account'+path,{credentials:'same-origin',cache:'no-store',...options,
        headers:{Accept:'application/json','X-Settings-Owner':owner,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},
        signal:AbortSignal.any([accountAbort.signal,AbortSignal.timeout(15000),...(options.signal?[options.signal]:[])])});
      let json;try{json=await response.json();}catch{throw new Error('Chưa nhận được phản hồi hợp lệ. Vui lòng thử lại.');}
      if(!response.ok||!json.success)throw Object.assign(new Error(json.message||'Không thể tải cài đặt.'),{status:response.status});
      if(json.data?.viewerId!==owner)throw Object.assign(new Error('Tài khoản đã thay đổi.'),{status:409});
      return json;
    }
    async function sessionCheck() {
      const response=await fetch('/auth/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([accountAbort.signal,AbortSignal.timeout(10000)])});
      const data=await response.json();if(!response.ok||!data.success)throw new Error('Không xác nhận được phiên đăng nhập.');return data;
    }
    async function reconcile() {
      const generation=version;
      try{const data=await sessionCheck();if(!active()||generation!==version)return false;
        const next=data.authenticated&&validId(data.user?.id)?data.user.id:'';
        if(next!==owner){authChanged({...data,user:next?data.user:null});return false;}
        return Boolean(next);
      }catch{return false;}
    }
    function drawAccount(data) {
      account=data;ready=true;
      for(const node of all('[data-account-field]')){const key=node.dataset.accountField;node.textContent=key==='tag'?(data.tag?'#'+String(data.tag).replace(/^#/,''):'Chưa có biệt danh'):data[key]||(key==='email'?'Chưa có email':'—');}
      account.profileUrl=localUrl(data.profileUrl,'/users/profile');account.editProfileUrl=localUrl(data.editProfileUrl,'/users/profile/edit');
      find('[data-account-profile-url]').value=new URL(account.profileUrl,location.origin).href;find('[data-account-profile]').href=account.profileUrl;
    }
    async function loadAccount() {
      if(!owner||!active())return;
      const generation=version, sequence=++metaVersion;metaAbort?.abort();metaAbort=new AbortController();retry.hidden=true;
      try{const result=await request('',{signal:metaAbort.signal});if(!active()||generation!==version||sequence!==metaVersion)return;
        drawAccount(result.data.account);message(status,'');root.dataset.accountAuthenticated='true';login.hidden=true;
      }catch(error){if(!active()||generation!==version||sequence!==metaVersion||error.name==='AbortError')return;
        if([401,409].includes(error.status))await reconcile();
        if(generation!==version)return;message(status,error.message,true);retry.hidden=false;
        if(error.status===401){root.dataset.accountAuthenticated='false';login.hidden=false;}
      }finally{if(active()&&generation===version&&sequence===metaVersion)controls();}
    }
    function renderSessions(values) {
      sessions=Array.isArray(values)?values.filter(s=>validId(s.id)).map(s=>({...s,current:s.current===true})):[];
      list.replaceChildren();
      for(const session of sessions){
        const row=element('div','account-session');row.dataset.sessionRow=session.id;row.setAttribute('role','listitem');
        const icon=element('span','account-device-symbol');icon.dataset.kind=session.kind==='mobile'?'mobile':'computer';icon.setAttribute('aria-hidden','true');
        const info=element('div'),name=[session.browser||'Thiết bị khác',session.os].filter(Boolean).join(' · ');info.append(element('strong','',name));
        if(session.current){const badge=element('span','account-session-current','Thiết bị hiện tại');badge.dataset.sessionCurrent='';info.append(badge);}
        info.append(element('p','','Phiên cập nhật: '+date(session.updatedAt)),element('p','','Hết hạn: '+date(session.expiresAt)));
        const button=element('button','password-secondary','Đăng xuất');button.type='button';button.dataset.sessionRevoke=session.id;button.setAttribute('aria-label','Đăng xuất '+name);
        row.append(icon,info,button);list.append(row);
      }
      find('[data-session-count]').textContent=sessions.length+' phiên đang hoạt động';
    }
    async function loadSessions() {
      if(!owner||mutating||!active())return;
      const generation=version,sequence=++listVersion;listAbort?.abort();listAbort=new AbortController();loading=true;
      target=null;confirmPanel.hidden=true;listPanel.hidden=false;message(listStatus,'Đang tải danh sách thiết bị...');find('[data-session-retry]').hidden=true;controls();
      try{const result=await request('/sessions',{signal:listAbort.signal});if(!active()||generation!==version||sequence!==listVersion)return;
        renderSessions(result.data.sessions);uncertain=false;message(listStatus,sessions.length?'':'Không có phiên đăng nhập đang hoạt động.');
      }catch(error){if(!active()||generation!==version||sequence!==listVersion||error.name==='AbortError')return;
        if([401,409].includes(error.status))await reconcile();
        if(generation!==version)return;message(listStatus,error.message,true);find('[data-session-retry]').hidden=false;uncertain=true;
      }finally{if(active()&&generation===version&&sequence===listVersion){loading=false;controls();}}
    }
    function closeDialog(dialog) {if(mutating)return;dialog.close();}
    function openDialog(kind,opener) {
      if(!owner||!ready||mutating)return;
      const dialog=dialogs.get(kind);if(!dialog||dialog.open)return;
      previousFocus=opener;dialog.showModal();dialog.querySelector('h2').focus();
      if(kind==='sessions')loadSessions();
    }
    function confirmSession(value) {
      if(mutating||loading||uncertain)return;
      const session=sessions.find(s=>s.id===value);
      if(value!=='others'&&!session||value==='others'&&!sessions.some(s=>!s.current))return;
      target=value;confirmPanel.hidden=false;listPanel.hidden=true;message(listStatus,'');
      const text=value==='others'?'Các thiết bị khác sẽ cần đăng nhập lại. Bạn vẫn đăng nhập trên thiết bị hiện tại.':session.current?'Bạn sẽ đăng xuất khỏi tài khoản trên thiết bị hiện tại.':'Đăng xuất '+[session.browser,session.os].filter(Boolean).join(' · ')+'. Thiết bị này sẽ cần đăng nhập lại để tiếp tục.';
      find('[data-session-confirm-text]').textContent=text;controls();find('[data-session-cancel]').focus();
    }
    async function revoke() {
      if(!target||mutating||!owner)return;
      const generation=version,value=target;mutating=true;message(listStatus,'');controls();
      try{
        const result=await request(value==='others'?'/sessions/revoke-others':'/sessions/'+value,{method:value==='others'?'POST':'DELETE',body:JSON.stringify({confirm:true})});
        if(!active()||generation!==version)return;
        // Recheck identity before publishing a late logout result to the current browser.
        const auth=await sessionCheck();if(!active()||generation!==version)return;
        const next=auth.authenticated&&validId(auth.user?.id)?auth.user.id:'';
        if(next!==owner&&!(result.data.signedOut&&!next)){authChanged({...auth,user:next?auth.user:null});return;}
        if(result.data.signedOut){authChanged({user:null,nav:result.nav});return;}
        renderSessions(result.data.sessions);target=null;confirmPanel.hidden=true;listPanel.hidden=false;uncertain=false;
        message(listStatus,result.data.removed?'Đã đăng xuất phiên được chọn.':'Danh sách đã được cập nhật.');
      }catch(error){if(!active()||generation!==version)return;
        if([401,409].includes(error.status))await reconcile();if(generation!==version)return;
        uncertain=true;target=null;confirmPanel.hidden=true;listPanel.hidden=false;
        message(listStatus,error.status?error.message:'Chưa xác nhận được kết quả. Hãy làm mới danh sách trước khi thao tác tiếp.',true);find('[data-session-retry]').hidden=false;
      }finally{if(active()&&generation===version){mutating=false;controls();}}
    }
    root.addEventListener('click',async event=>{
      const button=event.target.closest('button,a');if(!button||!root.contains(button))return;
      if(button.matches('[data-account-open]'))return openDialog(button.dataset.accountOpen,button);
      if(button.matches('[data-account-close]'))return closeDialog(button.closest('dialog'));
      if(button.matches('[data-account-retry]'))return loadAccount();
      if(button.matches('[data-account-login]'))return window.MediaHzLogin?window.MediaHzLogin.open():location.assign('/auth/signin');
      if(button.matches('[data-account-edit],[data-account-profile]')){
        if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!owner||!account)return;
        event.preventDefault();const path=button.matches('[data-account-edit]')?account.editProfileUrl:account.profileUrl;
        for(const dialog of dialogs.values())if(dialog.open)dialog.close();
        if(window.navigateMediaHz)window.navigateMediaHz(path,true);else location.assign(path);return;
      }
      if(button.matches('[data-account-copy]')){const output=find('[data-account-profile-url]'),generation=version;try{await navigator.clipboard.writeText(output.value);if(active()&&generation===version)find('[data-account-copy-status]').textContent='Đã sao chép liên kết.';}catch{if(active()&&generation===version){output.focus();output.select();find('[data-account-copy-status]').textContent='Chọn và sao chép liên kết trong ô phía trên.';}}return;}
      if(button.matches('[data-session-refresh],[data-session-retry]'))return loadSessions();
      if(button.matches('[data-session-revoke]'))return confirmSession(button.dataset.sessionRevoke);
      if(button.matches('[data-session-revoke-others]'))return confirmSession('others');
      if(button.matches('[data-session-cancel]')){if(!mutating){target=null;confirmPanel.hidden=true;listPanel.hidden=false;controls();}return;}
      if(button.matches('[data-session-confirm]'))return revoke();
    },opts);
    for(const [kind,dialog] of dialogs){
      let outside=false;
      const isOutside=event=>{const r=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);};
      dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);},opts);
      dialog.addEventListener('pointerdown',event=>{outside=event.button===0&&isOutside(event);},opts);
      dialog.addEventListener('pointerup',event=>{if(outside&&isOutside(event))closeDialog(dialog);outside=false;},opts);
      dialog.addEventListener('close',()=>{if(dialog.open||!active())return;if(kind==='sessions'){++listVersion;listAbort?.abort();loading=false;target=null;confirmPanel.hidden=true;listPanel.hidden=false;controls();}if(!document.querySelector('dialog[open]'))previousFocus?.focus({preventScroll:true});},opts);
    }
    function changeUser(user) {
      ++version;accountAbort.abort();accountAbort=new AbortController();metaAbort?.abort();listAbort?.abort();
      for(const dialog of dialogs.values())if(dialog.open)dialog.close();clearPrivate();
      owner=validId(user?.id)?user.id:'';root.dataset.accountOwner=owner;root.dataset.accountAuthenticated=String(Boolean(owner));
      login.hidden=Boolean(owner);retry.hidden=true;message(status,owner?'':'Bạn đã đăng xuất. Đăng nhập lại để quản lý tài khoản.');
      if(!owner)find('[data-password-open]').disabled=true;
      controls();if(owner)loadAccount();
    }
    window.addEventListener('mediahz:authenticated',event=>changeUser(event.detail?.user),opts);
    window.addEventListener('focus',async()=>{if(active()&&!mutating&&await reconcile())loadAccount();},opts);
    controls();loadAccount();
    views.set(root,{dispose(){++version;events.abort();accountAbort.abort();metaAbort?.abort();listAbort?.abort();for(const dialog of dialogs.values())if(dialog.open)dialog.close();clearPrivate();}});
  }
  function scan(){for(const [root,state]of views)if(!root.isConnected){state.dispose();views.delete(root);}document.querySelectorAll('[data-account-settings]').forEach(root=>{if(!views.has(root))init(root);});}
  new MutationObserver(scan).observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>{for(const state of views.values())state.dispose();views.clear();});
  window.MediaHzAccountSettings=Object.freeze({refresh:scan});scan();
})();
