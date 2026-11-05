(function () {
  'use strict';
  if (window.MediaHzAccountPreferences) return;
  const views=new Map(), isId=value=>typeof value==='string'&&/^[a-f0-9]{24}$/i.test(value);
  let knownUser;
  const t=(key,vars)=>window.MediaHzLanguage?.t(key,vars)||key;
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const keyed=(node,key,vars={})=>{node.dataset.i18n=key;node.dataset.i18nVars=JSON.stringify(vars);node.textContent=t(key,vars);return node;};
  const button=(key,handler,style='')=>{const node=keyed(el('button','ap-button '+style),key);node.type='button';if(handler)node.addEventListener('click',handler);return node;};
  const safeLocal=(value,fallback='')=>{try{const url=new URL(value,location.origin);return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&url.origin===location.origin?url.href:fallback;}catch{return fallback;}};
  const stale=()=>Object.assign(new Error('stale'),{name:'StaleSettingsResponse'});
  function init(root,box) {
    const find=selector=>box.querySelector(selector), all=selector=>Array.from(box.querySelectorAll(selector));
    const dialogs=new Map(all('[data-ap-dialog]').map(node=>[node.dataset.apDialog,node]));
    const fields=find('[data-ap-fields]'), status=find('[data-ap-status]'), retry=find('[data-ap-retry]');
    let owner=isId(knownUser?.id)?knownUser.id:knownUser===null?'':isId(root.dataset.accountOwner)?root.dataset.accountOwner:'';
    let generation=0, accountAbort=new AbortController(), ready=false, busy=false, disposed=false, preferences=null, security=null, blocks=[], dialogVersion=0, previousFocus;
    let prefsVersion=0, securityVersion=0, blocksVersion=0, searchVersion=0, searchAbort, searchTimer, cooldownTimer, setupTimer;
    let recoveryCodes=[], awaitingReauth=false;
    let readGeneration=0, readAbort=new AbortController();
    const events=new AbortController(), eventOptions={signal:events.signal};
    const active=()=>!disposed&&root.isConnected&&box.isConnected;
    const current=(version,who)=>active()&&version===generation&&who===owner&&Boolean(who);
    const say=(node,key,vars={},error=false)=>{if(!node)return;keyed(node,key,vars);node.classList.toggle('is-error',error);};
    const clearStatus=node=>{node.textContent='';delete node.dataset.i18n;delete node.dataset.i18nVars;node.classList.remove('is-error');};
    const dialogStatus=kind=>dialogs.get(kind)?.querySelector('[data-ap-dialog-status]');
    const date=value=>{const parsed=new Date(value);return value&&Number.isFinite(parsed.getTime())?parsed.toLocaleString(window.MediaHzLanguage?.language==='en'?'en-GB':'vi-VN'):'—';};
    function controls() {
      fields.disabled=!owner||!ready||busy||awaitingReauth;
      all('[data-ap-dialog] :is(button,input,select,textarea)').forEach(node=>{node.disabled=!owner||busy||node.dataset.apUnavailable==='true'||(awaitingReauth&&!node.matches('[data-ap-recovery],[data-ap-close]'));});
      retry.hidden=Boolean(owner&&ready);
      box.setAttribute('aria-busy',String(busy));
    }
    function wipeDialogs() {
      ++dialogVersion;clearTimeout(searchTimer);clearInterval(cooldownTimer);clearTimeout(setupTimer);searchAbort?.abort();++searchVersion;
      recoveryCodes.fill('');recoveryCodes=[];
      for(const dialog of dialogs.values()){if(dialog.open)dialog.close();dialog.querySelectorAll('input,textarea').forEach(input=>{input.value='';if(input.type==='checkbox')input.checked=false;});clearStatus(dialog.querySelector('[data-ap-dialog-status]'));}
      all('[data-ap-security-content]').forEach(node=>node.replaceChildren());
      find('[data-ap-block-list]').replaceChildren();find('[data-ap-suggestions]').replaceChildren();
    }
    function clearPrivate() {
      ready=false;busy=false;awaitingReauth=false;preferences=null;security=null;blocks=[];wipeDialogs();
      all('[data-pref]').forEach(node=>{if(node.type==='checkbox')node.checked=false;else node.selectedIndex=-1;});
      all('[data-ap-email-summary],[data-ap-google-summary],[data-ap-totp-summary]').forEach(node=>{node.textContent='';delete node.dataset.i18n;delete node.dataset.i18nVars;});
      find('[data-ap-security-section]').hidden=true;controls();
    }
    function lock() {
      ++generation;accountAbort.abort();accountAbort=new AbortController();owner='';clearPrivate();say(status,'status.auth',{},true);retry.hidden=true;
    }
    function invalidateReads() {
      ++readGeneration;readAbort.abort();readAbort=new AbortController();
      // Reads may already have resolved into a loader/dialog continuation.
      ++prefsVersion;++securityVersion;++blocksVersion;++searchVersion;++dialogVersion;
      clearTimeout(searchTimer);searchAbort?.abort();
    }
    /* Previous owner-only request implementation preserved for review:
    async function request(path,options={}) {
      const who=owner,version=generation;if(!who||!active()||awaitingReauth)throw stale();
      const timeout=AbortSignal.timeout(25000);
      const response=await fetch('/api/account'+path,{method:'GET',credentials:'same-origin',cache:'no-store',...options,
        headers:{Accept:'application/json','X-Settings-Owner':who,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},
        signal:AbortSignal.any([accountAbort.signal,timeout,...(options.signal?[options.signal]:[])])});
      if(!current(version,who))throw stale();
      let json;try{json=await response.json();}catch{if(!current(version,who))throw stale();if(response.status===401){lock();throw stale();}throw new Error('invalid-json');}
      if(!current(version,who))throw stale();
      const authFailure=(response.status===401&&json.code!=='TWO_FACTOR_REQUIRED')||json.code==='ACCOUNT_INACTIVE';
      const ownerFailure=response.status===409&&(!json.code&&!path.startsWith('/security')||['SETTINGS_OWNER_CHANGED','SECURITY_STALE_ACCOUNT'].includes(json.code));
      if(authFailure||ownerFailure){lock();throw stale();}
      if(!current(version,who))throw stale();
      if(!response.ok||!json.success)throw Object.assign(new Error('request-failed'),{status:response.status,code:json.code,retryAfter:json.retryAfter||json.data?.retryAfter});
      if(json.data?.viewerId!==who){lock();throw stale();}
      return json.data;
    }
    */
    async function request(path,options={}) {
      const who=owner,version=generation;if(!who||!active()||awaitingReauth)throw stale();
      const method=(options.method||'GET').toUpperCase(),reading=method==='GET'||method==='HEAD';
      const readVersion=readGeneration,readSignal=readAbort.signal;
      const requestCurrent=()=>current(version,who)&&(!reading||(readVersion===readGeneration&&!readSignal.aborted));
      const timeout=AbortSignal.timeout(25000);
      const response=await fetch('/api/account'+path,{method:'GET',credentials:'same-origin',cache:'no-store',...options,
        headers:{Accept:'application/json','X-Settings-Owner':who,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},
        signal:AbortSignal.any([accountAbort.signal,timeout,...(reading?[readSignal]:[]),...(options.signal?[options.signal]:[])])});
      if(!requestCurrent())throw stale();
      let json;try{json=await response.json();}catch{if(!requestCurrent())throw stale();if(response.status===401){lock();throw stale();}throw new Error('invalid-json');}
      if(!requestCurrent())throw stale();
      const authFailure=(response.status===401&&json.code!=='TWO_FACTOR_REQUIRED')||json.code==='ACCOUNT_INACTIVE';
      const ownerFailure=response.status===409&&(!json.code&&!path.startsWith('/security')||['SETTINGS_OWNER_CHANGED','SECURITY_STALE_ACCOUNT'].includes(json.code));
      if(authFailure||ownerFailure){lock();throw stale();}
      if(!requestCurrent())throw stale();
      if(!response.ok||!json.success)throw Object.assign(new Error('request-failed'),{status:response.status,code:json.code,retryAfter:json.retryAfter||json.data?.retryAfter});
      if(json.data?.viewerId!==who){lock();throw stale();}
      return json.data;
    }
    const ignore=error=>error.name==='AbortError'||error.name==='StaleSettingsResponse'||!active();
    function errorStatus(node,error) {if(ignore(error))return;const codeKeys={TWO_FACTOR_REQUIRED:'error.twoFactor',CURRENT_PASSWORD_INVALID:'error.password',SECURITY_CODE_INVALID:'error.code',FRESH_PROOF_REQUIRED:'error.proof',LAST_LOGIN_METHOD:'google.onlyMethod',SECURITY_EMAIL_DELIVERY_FAILED:'error.delivery',ACCOUNT_INACTIVE:'status.auth'};say(node,codeKeys[error.code]||(error.status===429?'security.wait':'status.failed'),error.status===429?{seconds:error.retryAfter||60}:{},true);}
    function publish(data) {
      if(!owner||data.viewerId!==owner||!active())return;
      const detail={viewerId:owner,preferences:structuredClone(data.preferences)};
      window.dispatchEvent(new CustomEvent('mediahz:preferences',{detail}));
      document.getElementById('mediaPlayerFrame')?.contentWindow?.postMessage({type:'accountPreferencesChanged',userId:owner,preferences:structuredClone(data.preferences)},location.origin);
    }
    function renderPreferences(value) {
      preferences=structuredClone(value);
      for(const node of all('[data-pref]')){const keys=node.dataset.pref.split('.'),value=keys.length===2?preferences[keys[0]]?.[keys[1]]:preferences[keys[0]];if(node.type==='checkbox')node.checked=value===true;else node.value=value??'';}
    }
    async function loadPreferences() {
      if(!owner||busy||!active())return;const version=generation,who=owner,sequence=++prefsVersion;ready=false;controls();say(status,'status.loading');
      try{const data=await request('/preferences');if(!current(version,who)||sequence!==prefsVersion)return;
        if(!data.preferences||!data.preferences.notifications||!data.preferences.playback)throw new Error('invalid-preferences');
        renderPreferences(data.preferences);ready=true;clearStatus(status);publish(data);
      }catch(error){if(current(version,who)&&sequence===prefsVersion)errorStatus(status,error);}
      finally{if(current(version,who)&&sequence===prefsVersion)controls();}
    }
    async function savePreference(node) {
      if(!owner||!ready||busy||!preferences)return;
      const [group,leaf]=node.dataset.pref.split('.'),value=node.type==='checkbox'?node.checked:node.value;
      const previous=leaf?preferences[group]?.[leaf]:preferences[group];if(value===previous)return;
      const patch=leaf?{[group]:{[leaf]:value}}:{[group]:value},version=generation,who=owner;
      ++prefsVersion;busy=true;controls();say(status,'status.saving');
      try{const data=await request('/preferences',{method:'PATCH',body:JSON.stringify(patch)});if(!current(version,who))return;renderPreferences(data.preferences);publish(data);say(status,'status.saved');}
      catch(error){if(current(version,who)){renderPreferences(preferences);errorStatus(status,error);}}
      finally{if(current(version,who)){busy=false;controls();}}
    }
    function renderBlocks() {
      const list=find('[data-ap-block-list]');list.replaceChildren();
      if(!blocks.length){list.append(keyed(el('li','ap-description'),'blocks.empty'));return;}
      for(const user of blocks){if(!isId(user.id))continue;const row=el('li');row.dataset.apBlockRow=user.id;
        const avatar=safeLocal(user.avatar);if(avatar){const image=el('img');image.src=avatar;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';row.append(image);}
        const copy=el('div','ap-user-copy');const profile=safeLocal(user.profileUrl);const name=el(profile?'a':'strong','',user.name||user.id);if(profile)name.href=profile;copy.append(name,el('small','',user.tag?'#'+String(user.tag).replace(/^#/,''):user.id));
        const remove=button('blocks.unblock',()=>changeBlock(user.id,false));remove.dataset.apUnblock=user.id;row.append(copy,remove);list.append(row);
      }
      controls();
    }
    async function loadBlocks() {
      if(!owner||busy)return;const seq=++blocksVersion,version=generation,who=owner;
      blocks=[];renderBlocks();say(dialogStatus('blocks'),'status.loading');
      try{const data=await request('/blocks');if(!current(version,who)||seq!==blocksVersion||!dialogs.get('blocks').open)return;blocks=Array.isArray(data.items)?data.items:[];renderBlocks();clearStatus(dialogStatus('blocks'));}
      catch(error){if(current(version,who)&&seq===blocksVersion)errorStatus(dialogStatus('blocks'),error);}
    }
    async function changeBlock(id,blocked) {
      if(typeof id!=='string'||id.length>80||!(/^[a-f0-9]{24}$/i.test(id)||/^#?hz\d{3,12}$/i.test(id)||/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(id))){say(dialogStatus('blocks'),'blocks.invalid',{},true);return;}if(id===owner){say(dialogStatus('blocks'),'blocks.self',{},true);return;}if(busy||!owner)return;
      const version=generation,who=owner;busy=true;++blocksVersion;++searchVersion;searchAbort?.abort();controls();
      try{const data=await request('/blocks/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({blocked})});if(!current(version,who))return;
        blocks=Array.isArray(data.items)?data.items:[];renderBlocks();find('[data-ap-target]').value='';find('[data-ap-suggestions]').replaceChildren();say(dialogStatus('blocks'),blocked?'blocks.blocked':'blocks.unblocked');
      }catch(error){if(current(version,who))errorStatus(dialogStatus('blocks'),error);}
      finally{if(current(version,who)){busy=false;controls();}}
    }
    async function searchRecipients() {
      const query=find('[data-ap-target]').value.trim(),sequence=++searchVersion,version=generation,who=owner;
      searchAbort?.abort();searchAbort=new AbortController();const list=find('[data-ap-suggestions]');list.replaceChildren();
      if(!owner||busy||isId(query)||query.length<2)return;
      if(!/^#?[a-z0-9-]+$/i.test(query)){say(dialogStatus('blocks'),'blocks.invalid',{},true);return;}
      try{const data=await request('/blocks/recipients?q='+encodeURIComponent(query),{signal:searchAbort.signal});
        if(!current(version,who)||sequence!==searchVersion||!dialogs.get('blocks').open)return;
        const users=(data.items||[]).filter(user=>isId(user.id)&&user.id!==who);
        if(!users.length)list.append(keyed(el('li','ap-description'),'blocks.noResults'));
        for(const user of users){const row=el('li'),copy=el('div','ap-user-copy');copy.append(el('strong','',user.name||user.id),el('small','',user.tag?'#'+String(user.tag).replace(/^#/,''):user.id));const choose=button('common.choose',()=>{find('[data-ap-target]').value=user.id;list.replaceChildren();clearStatus(dialogStatus('blocks'));find('[data-ap-block-add]').focus();});row.append(copy,choose);list.append(row);}
        clearStatus(dialogStatus('blocks'));controls();
      }catch(error){if(sequence===searchVersion&&current(version,who))errorStatus(dialogStatus('blocks'),error);}
    }
    function openDialog(kind,trigger) {
      const dialog=dialogs.get(kind);if(!dialog||!owner||!ready||busy||document.querySelector('dialog[open]'))return;
      previousFocus=trigger;++dialogVersion;clearStatus(dialogStatus(kind));dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});
      if(kind==='blocks')loadBlocks();
      if(kind==='history')find('[data-ap-clear-history]').hidden=false;
      if(['email','google','totp','closure'].includes(kind))renderSecurityDialog(kind);
      if(kind==='activity')loadActivity();
      controls();
    }
    async function mutation(path,body,kind,onSuccess) {
      if(busy||!owner)return;const version=generation,who=owner,dv=dialogVersion;busy=true;controls();say(dialogStatus(kind)||status,'status.processing');
      try{const data=await request(path,{method:'POST',body:JSON.stringify(body)});if(!current(version,who)||dv!==dialogVersion)return;await onSuccess(data);}
      catch(error){if(current(version,who)&&dv===dialogVersion)errorStatus(dialogStatus(kind)||status,error);}
      finally{if(current(version,who)){busy=false;controls();}}
    }
    function download(contents,name,type='application/json') {
      if(!owner||!active())return;const url=URL.createObjectURL(new Blob([contents],{type})),anchor=el('a');anchor.href=url;anchor.download=name;anchor.hidden=true;box.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    async function exportData() {
      if(!owner||busy)return;const version=generation,who=owner;busy=true;controls();say(status,'status.processing');
      try{const data=await request('/export');if(!current(version,who))return;download(JSON.stringify(data,null,2),'mediahz-account-'+who+'.json');say(status,'data.exported');}
      catch(error){if(current(version,who))errorStatus(status,error);}
      finally{if(current(version,who)){busy=false;controls();}}
    }
    async function clearHistory() {
      if(!owner||busy||!dialogs.get('history').open)return;const version=generation,who=owner;busy=true;controls();
      try{await request('/history',{method:'DELETE',body:JSON.stringify({confirm:true})});if(!current(version,who))return;find('[data-ap-clear-history]').hidden=true;say(dialogStatus('history'),'data.cleared');}
      catch(error){if(current(version,who))errorStatus(dialogStatus('history'),error);}
      finally{if(current(version,who)){busy=false;controls();}}
    }
    function securitySummary() {
      if(!security)return;find('[data-ap-security-section]').hidden=false;
      const email=find('[data-ap-email-summary]');delete email.dataset.i18n;email.replaceChildren(security.email?.address?el('span','',security.email.address):keyed(el('span'),'security.noEmail'),document.createTextNode(' · '),keyed(el('span'),security.email?.verified?'security.verified':'security.unverified'));
      keyed(find('[data-ap-google-summary]'),security.google?.linked?'security.linked':'security.unlinked');keyed(find('[data-ap-totp-summary]'),security.twoFactor?.enabled?'security.enabled':'security.disabled');
    }
    async function loadSecurity() {
      if(!owner||!active())return;const seq=++securityVersion,version=generation,who=owner;
      try{const data=await request('/security');if(!current(version,who)||seq!==securityVersion)return;security=data.security||null;securitySummary();}
      catch(error){if(current(version,who)&&seq===securityVersion&&!ignore(error)){find('[data-ap-security-section]').hidden=false;all('[data-ap-email-summary],[data-ap-google-summary],[data-ap-totp-summary]').forEach(node=>keyed(node,'status.unavailable'));}}
    }
    function completeSignOut(message='security.reauth') {
      awaitingReauth=false;lock();
      window.dispatchEvent(new CustomEvent('mediahz:authenticated',{detail:{user:null}}));
      document.getElementById('mediaPlayerFrame')?.contentWindow?.postMessage({type:'authChanged',userId:null},location.origin);
      say(status,message);
    }
    async function refreshSecurityDialog(kind,key) {
      const version=generation,who=owner,dv=dialogVersion;await loadSecurity();
      if(!current(version,who)||dv!==dialogVersion||!dialogs.get(kind).open)return;
      renderSecurityDialog(kind);if(key)say(dialogStatus(kind),key);
    }
    function securityResult(data,kind,key) {if(data.requiresLogin)completeSignOut('security.reauth');else return refreshSecurityDialog(kind,key);}
    const content=kind=>find('[data-ap-security-content="'+kind+'"]');
    function addParagraph(parent,key,vars={}) {const node=keyed(el('p','ap-description'),key,vars);parent.append(node);return node;}
    function addInput(parent,labelKey,name,type='text',attrs={}) {
      const id='ap-'+name,label=keyed(el('label'),labelKey),input=el('input');label.htmlFor=id;input.id=id;input.name=name;input.type=type;Object.assign(input,attrs);parent.append(label,input);return input;
    }
    function renderSecurityDialog(kind) {
      const target=content(kind);target.replaceChildren();clearInterval(cooldownTimer);clearTimeout(setupTimer);recoveryCodes.fill('');recoveryCodes=[];
      if(!security){addParagraph(target,'status.unavailable');target.append(button('common.retry',()=>refreshSecurityDialog(kind)));return;}
      if(kind==='email'){
        const current=security.email?.address?el('p','',security.email.address):keyed(el('p'),'security.noEmail');target.append(current);addParagraph(target,security.email?.verified?'security.verified':'security.unverified');
        if(security.email?.address&&!security.email?.verified)target.append(button('security.verify',()=>requestEmailVerification()));
        const form=el('form');form.dataset.apEmailChange='';const email=addInput(form,'security.newEmail','newEmail','email',{required:true,maxLength:254,autocomplete:'email'});const submit=button('security.changeEmail');submit.type='submit';form.append(submit);form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())proofPanel('email','change-email',proof=>sendEmailChange(email.value.trim(),proof),{email:email.value.trim()});});target.append(form);
      }
      if(kind==='google'){
        addParagraph(target,security.google?.linked?'security.linked':'security.unlinked');
        if(security.google?.linked){if(security.google.canUnlink)target.append(button('google.unlink',()=>proofPanel('google','google-unlink',proof=>mutation('/security/google/unlink',proof,'google',data=>securityResult(data,'google','google.unlinked')))));else addParagraph(target,'google.onlyMethod');}
        else if(security.google?.linkAvailable)target.append(button('google.link',()=>proofPanel('google','google-link',proof=>mutation('/security/google/link',proof,'google',data=>{const url=safeLocal(data.url);if(!url||new URL(url).pathname!=='/auth/google')throw new Error('invalid-redirect');location.assign(url);} ))));
        else addParagraph(target,'security.unavailable');
      }
      if(kind==='totp'){
        addParagraph(target,security.twoFactor?.enabled?'security.enabled':'security.disabled');
        if(security.twoFactor?.enabled){addParagraph(target,'totp.remaining',{count:Number(security.twoFactor.recoveryCodesRemaining)||0});target.append(button('totp.disable',()=>{proofPanel('totp','2fa-disable',proof=>mutation('/security/2fa/disable',proof,'totp',data=>securityResult(data,'totp','totp.off')));},'ap-danger'));}
        else if(security.twoFactor?.available)target.append(button('totp.setup',()=>proofPanel('totp','2fa-enroll',proof=>mutation('/security/2fa/enroll',proof,'totp',showEnrollment))));
        else addParagraph(target,'security.unavailable');
      }
      if(kind==='closure'){
        const pending=security.account?.status==='deletion-pending';addParagraph(target,pending?'closure.pending':security.account?.status==='deactivated'?'closure.deactivated':'closure.active',{time:date(security.account?.deletionRequestedAt)});addParagraph(target,'closure.explanation');
        const action=(label,route)=>target.append(button(label,()=>proofPanel('closure',route,proof=>mutation('/security/'+route,{confirm:true,...proof},'closure',data=>data.requiresLogin?completeSignOut(route==='deletion-cancel'?'security.reauth':'closure.signedOut'):refreshSecurityDialog('closure','closure.cancelled')),{confirmation:true}),'ap-danger'));
        if(pending)action('closure.cancel','deletion-cancel');else {action('closure.deactivate','deactivate');action('closure.delete','deletion-request');}
      }
      window.MediaHzLanguage?.translate();controls();
    }
    function cooldown(node,retryAfter=60) {
      const until=Date.now()+Math.max(1,Number(retryAfter)||60)*1000;
      clearInterval(cooldownTimer);const tick=()=>{const seconds=Math.max(0,Math.ceil((until-Date.now())/1000));node.dataset.apUnavailable=String(seconds>0);node.disabled=seconds>0||busy;if(seconds)keyed(node,'security.wait',{seconds});else{keyed(node,'security.resend');clearInterval(cooldownTimer);}};tick();cooldownTimer=setInterval(tick,1000);
    }
    function proofPanel(kind,action,execute,options={}) {
      const target=content(kind);target.replaceChildren();clearStatus(dialogStatus(kind));
      addParagraph(target,'proof.title');addParagraph(target,'proof.help');if(options.email)target.append(el('p','',options.email));
      if(action==='2fa-disable')addParagraph(target,'totp.disableHelp');
      const form=el('form');form.dataset.apProofForm=action;
      const methodLabel=keyed(el('label'),'proof.method'),method=el('select');method.id='ap-proofMethod';methodLabel.htmlFor=method.id;
      for(const [value,key]of [['password','proof.password'],['email','proof.email']]){if(value==='email'&&!security.email?.verified)continue;const option=keyed(el('option'),key);option.value=value;method.append(option);}form.append(methodLabel,method);
      const passwordPanel=el('div'),password=addInput(passwordPanel,'proof.password','currentPassword','password',{required:true,autocomplete:'current-password',maxLength:1024});
      const emailPanel=el('div');emailPanel.hidden=true;const send=button('security.sendCode'),code=addInput(emailPanel,'security.code','proofEmailCode','text',{required:false,inputMode:'numeric',pattern:'[0-9]{6}',maxLength:6,autocomplete:'one-time-code'});emailPanel.prepend(send);addParagraph(emailPanel,'proof.emailHelp');form.append(passwordPanel,emailPanel);
      const twoFactor=security.twoFactor?.enabled?addInput(form,'proof.twoFactor','twoFactorCode','text',{required:true,autocomplete:'one-time-code',maxLength:32}):null;
      let challenge=null;
      method.addEventListener('change',()=>{passwordPanel.hidden=method.value!=='password';emailPanel.hidden=method.value!=='email';password.required=method.value==='password';code.required=method.value==='email';password.value='';code.value='';});
      send.addEventListener('click',()=>mutation('/security/email/challenge',{purpose:'sensitive',action},kind,data=>{challenge={id:data.challengeId,expiresAt:data.expiresAt};code.value='';say(dialogStatus(kind),'security.codeSent',{time:date(data.expiresAt)});cooldown(send,data.retryAfter);code.focus();}));
      let check;
      if(options.confirmation){const label=keyed(el('span'),'closure.confirm'),wrapper=el('label','ap-inline-check');check=el('input');check.type='checkbox';check.required=true;wrapper.append(check,label);form.append(wrapper);}
      const submit=button('common.confirm');submit.type='submit';submit.classList.toggle('ap-danger',Boolean(options.confirmation));form.append(submit,button('common.back',()=>renderSecurityDialog(kind)));
      form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity()||busy)return;
        const proof={};if(method.value==='password')proof.currentPassword=password.value;else{if(!challenge||Date.now()>=new Date(challenge.expiresAt).getTime()){say(dialogStatus(kind),'totp.expired',{},true);return;}proof.emailProof={challengeId:challenge.id,code:code.value.trim()};}
        if(twoFactor)proof.twoFactorCode=twoFactor.value.trim();
        // Proofs are kept only in the current operation; inputs clear before network completion.
        password.value='';code.value='';if(twoFactor)twoFactor.value='';challenge=null;execute(proof);
      });target.append(form);controls();
    }
    function requestEmailVerification() {mutation('/security/email/challenge',{purpose:'verify-email'},'email',data=>showEmailConfirmation(data,()=>requestEmailVerification()));}
    function sendEmailChange(email,proof) {mutation('/security/email/challenge',{purpose:'change-email',email,...proof},'email',data=>showEmailConfirmation(data,()=>renderSecurityDialog('email')));}
    function showEmailConfirmation(data,resend) {
      const target=content('email');target.replaceChildren();const form=el('form');form.dataset.apEmailConfirm='';const code=addInput(form,'security.code','emailConfirmCode','text',{required:true,inputMode:'numeric',pattern:'[0-9]{6}',maxLength:6,autocomplete:'one-time-code'});
      const submit=button('security.confirmEmail');submit.type='submit';const again=button('security.resend',resend);form.append(submit,again,button('common.back',()=>renderSecurityDialog('email')));target.append(form);say(dialogStatus('email'),'security.codeSent',{time:date(data.expiresAt)});cooldown(again,data.retryAfter);
      form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity()||busy)return;const value=code.value.trim();code.value='';mutation('/security/email/confirm',{challengeId:data.challengeId,code:value},'email',result=>securityResult(result,'email','security.emailDone'));});controls();
    }
    function showEnrollment(data) {
      const target=content('totp');target.replaceChildren();clearStatus(dialogStatus('totp'));addParagraph(target,'totp.setupHelp');
      const secret=addInput(target,'totp.secret','totpSecret','text',{readOnly:true,autocomplete:'off'});secret.value=typeof data.secret==='string'?data.secret:'';secret.className='ap-secret';
      try{const url=new URL(data.otpauthUrl);if(url.protocol==='otpauth:'&&url.hostname==='totp'){const anchor=keyed(el('a','ap-button'),'totp.openApp');anchor.href=url.href;target.append(anchor);}}catch{}
      const form=el('form');form.dataset.apTotpConfirm='';const code=addInput(form,'totp.code','totpConfirmCode','text',{required:true,inputMode:'numeric',pattern:'[0-9]{6}',maxLength:6,autocomplete:'one-time-code'}),submit=button('totp.confirm');submit.type='submit';form.append(submit);target.append(form);
      const expires=new Date(data.expiresAt).getTime();clearTimeout(setupTimer);setupTimer=setTimeout(()=>{if(active()&&dialogs.get('totp').open){secret.value='';form.remove();say(dialogStatus('totp'),'totp.expired',{},true);}},Math.max(0,expires-Date.now()));
      form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity()||busy)return;if(Date.now()>=expires){secret.value='';say(dialogStatus('totp'),'totp.expired',{},true);return;}const value=code.value.trim();code.value='';mutation('/security/2fa/confirm',{code:value},'totp',result=>{clearTimeout(setupTimer);secret.value='';awaitingReauth=result.requiresLogin===true;if(security?.twoFactor)security.twoFactor.enabled=true;showRecoveryCodes(result.recoveryCodes);});});controls();
    }
    function showRecoveryCodes(values) {
      // Previous: render codes without invalidating outstanding reads.
      // The confirmed mutation keeps its owner guard and signal; only reads retire.
      invalidateReads();
      recoveryCodes=Array.isArray(values)?values.filter(code=>typeof code==='string'):[];
      const target=content('totp');target.replaceChildren();addParagraph(target,'totp.recoveryTitle');addParagraph(target,'totp.recoveryHelp');const output=el('pre','ap-secret',recoveryCodes.join('\n'));const save=button('totp.download',()=>download(recoveryCodes.join('\n')+'\n','mediahz-recovery-codes.txt','text/plain'));save.dataset.apRecovery='';target.append(output,save);if(awaitingReauth){addParagraph(target,'security.reauth');const finish=button('totp.saved',()=>completeSignOut());finish.dataset.apRecovery='';target.append(finish);}clearStatus(dialogStatus('totp'));controls();
    }
    async function loadActivity() {
      const target=content('activity'),version=generation,who=owner,dv=dialogVersion;target.replaceChildren();say(dialogStatus('activity'),'status.loading');
      try{const data=await request('/security/activity');if(!current(version,who)||dv!==dialogVersion)return;clearStatus(dialogStatus('activity'));addParagraph(target,'activity.limit');const list=el('ol','ap-activity-list');
        if(!data.items?.length)addParagraph(target,'activity.empty');
        for(const item of (data.items||[]).slice(0,50)){const row=el('li'),eventKey='activity.'+item.type,title=keyed(el('span'),'activity.event');if(window.MediaHzLanguage?.t(eventKey,eventKey)!==eventKey)keyed(title,eventKey);const time=el('time','',date(item.createdAt));if(item.createdAt)time.dateTime=item.createdAt;row.append(title,time);list.append(row);}target.append(list);
      }catch(error){if(current(version,who)&&dv===dialogVersion){errorStatus(dialogStatus('activity'),error);target.append(button('common.retry',loadActivity));}}
    }
    box.addEventListener('change',event=>{if(event.target.matches('[data-pref]'))savePreference(event.target);},eventOptions);
    box.addEventListener('click',event=>{const trigger=event.target.closest('button');if(!trigger||!box.contains(trigger)||trigger.disabled)return;
      if(trigger.matches('[data-ap-open]'))openDialog(trigger.dataset.apOpen,trigger);
      if(trigger.matches('[data-ap-close]')){if(!busy)trigger.closest('dialog')?.close();}
      if(trigger.matches('[data-ap-retry]')){loadPreferences();loadSecurity();}
      if(trigger.matches('[data-ap-block-refresh]'))loadBlocks();
      if(trigger.matches('[data-ap-export]'))exportData();
      if(trigger.matches('[data-ap-clear-history]'))clearHistory();
    },eventOptions);
    find('[data-ap-block-form]').addEventListener('submit',event=>{event.preventDefault();changeBlock(find('[data-ap-target]').value.trim(),true);},eventOptions);
    find('[data-ap-target]').addEventListener('input',()=>{++searchVersion;searchAbort?.abort();find('[data-ap-suggestions]').replaceChildren();clearTimeout(searchTimer);searchTimer=setTimeout(searchRecipients,350);},eventOptions);
    for(const [kind,dialog]of dialogs){
      dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();},eventOptions);
      dialog.addEventListener('close',()=>{if(awaitingReauth){completeSignOut();return;}++dialogVersion;clearInterval(cooldownTimer);clearTimeout(setupTimer);recoveryCodes.fill('');recoveryCodes=[];searchAbort?.abort();++searchVersion;++blocksVersion;
        dialog.querySelectorAll('input,textarea').forEach(node=>node.value='');if(['email','google','totp','activity','closure'].includes(kind))content(kind).replaceChildren();
        if(kind==='blocks'){blocks=[];find('[data-ap-block-list]').replaceChildren();find('[data-ap-suggestions]').replaceChildren();}
        if(active()&&!document.querySelector('dialog[open]'))previousFocus?.focus({preventScroll:true});
      },eventOptions);
    }
    function changeUser(user) {
      ++generation;accountAbort.abort();accountAbort=new AbortController();clearPrivate();owner=isId(user?.id)?user.id:'';clearStatus(status);controls();if(owner){loadPreferences();loadSecurity();}else say(status,'status.auth');
    }
    window.addEventListener('mediahz:authenticated',event=>changeUser(event.detail?.user),eventOptions);
    views.set(root,{box,refresh(){loadPreferences();loadSecurity();},dispose(){disposed=true;++generation;events.abort();accountAbort.abort();clearPrivate();}});
    clearPrivate();if(owner){loadPreferences();loadSecurity();}else say(status,'status.auth');
  }
  function scan(refresh=false) {
    for(const [root,state]of views)if(!root.isConnected||!state.box.isConnected){state.dispose();views.delete(root);}
    for(const root of document.querySelectorAll('[data-account-settings]')){const box=root.querySelector('[data-account-preferences]');if(!box)continue;if(!views.has(root))init(root,box);else if(refresh)views.get(root).refresh();}
  }
  window.addEventListener('mediahz:authenticated',event=>{knownUser=event.detail?.user||null;});
  new MutationObserver(()=>scan()).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>{for(const state of views.values())state.dispose();views.clear();});
  window.addEventListener('pageshow',()=>scan());
  window.MediaHzAccountPreferences=Object.freeze({refresh:()=>scan(true),scan:()=>scan()});scan();
})();
