const crypto=require('node:crypto');
const Joi=require('joi');
const {UserModel}=require('../../../model/db_song');
const Security=require('../model/AccountSecurity');
const Challenge=require('../model/AccountChallenge');
const Audit=require('../model/AccountAudit');
const EmailClaim=require('../model/AccountEmailClaim');
const Password=require('../../auth/service/PasswordService');
const Email=require('../../auth/service/EmailService');
const ApiError=require('../../../utils/ApiError');
const failure=(status,message,code='ACCOUNT_SECURITY',extra={})=>Object.assign(new ApiError({status,message,code}),extra);
const identity=user=>String(user._id);
const emailOf=user=>typeof user.gmail==='string'?user.gmail.trim().toLowerCase():'';
const version=user=>user.authVersion||0;
const fingerprint=user=>crypto.createHash('sha256').update(user.namePassword||'').digest('hex');
const grants=new WeakMap();
const googleBindings=new WeakMap();
exports.googleIdentity=user=>googleBindings.get(user)||null;
exports.rememberGoogleIdentity=(user,binding)=>{
 if(binding&&typeof binding.subject==='string'&&Number.isInteger(binding.revision))googleBindings.set(user,{subject:binding.subject,revision:binding.revision});
};
function checkGoogleBinding(s,binding){
 if(!binding||s.googleDisabled||s.googleSubject!==binding.subject||s.revision!==binding.revision)
  throw failure(401,'Liên kết Google đã thay đổi. Vui lòng đăng nhập lại.','GOOGLE_BINDING_CHANGED');
}
async function claimEmail(user,email){
 await EmailClaim.init();
 try{return (await EmailClaim.updateOne({_id:email,owner:user._id},{$setOnInsert:{owner:user._id}},{upsert:true,runValidators:true})).upsertedCount===1;}
 catch(error){if(error.code===11000)throw failure(409,'Email đã được sử dụng.','EMAIL_ALREADY_CLAIMED');throw error;}
}
const actions=['change-email','2fa-enroll','2fa-disable','google-link','google-unlink','deactivate','deletion-request','deletion-cancel'];
const eventTypes=new Set(['session_revoked','sessions_revoked','password_changed','email_verified','email_changed','email_challenge_sent','two_factor_enabled','two_factor_disabled','two_factor_failed','login_success','login_failed','google_linked','google_unlinked','account_deactivated','deletion_requested','deletion_cancelled','account_reactivated']);
function key(){const value=process.env.ACCOUNT_SECURITY_KEY||process.env.SESSION_SECRET;if(typeof value!=='string'||Buffer.byteLength(value)<32)throw failure(503,'Máy chủ chưa cấu hình khóa bảo mật.','SECURITY_KEY_MISSING');return crypto.createHash('sha256').update(value).digest();}
function digest(scope,value){return crypto.createHmac('sha256',key()).update(scope+':'+value).digest('hex');}
function equal(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function encrypt(user,value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(identity(user)));const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64url')).join('.');}
function decrypt(user,value){try{const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64url'));const cipher=crypto.createDecipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(identity(user)));cipher.setAuthTag(tag);return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8');}catch(e){if(e.status)throw e;throw failure(503,'Không thể mở khóa xác thực. Vui lòng liên hệ quản trị.','SECURITY_KEY_INVALID');}}
function base32(bytes){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,value=0,out='';for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){bits-=5;out+=chars[(value>>>bits)&31];}}if(bits)out+=chars[(value<<(5-bits))&31];return out;}
function unbase32(value){let bits=0,n=0;const out=[];for(const char of value.replace(/=+$/,'')){const i='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);if(i<0)throw failure(400,'Khóa xác thực không hợp lệ.');n=(n<<5)|i;bits+=5;if(bits>=8){bits-=8;out.push((n>>>bits)&255);}}return Buffer.from(out);}
exports.totp=(secret,time=Date.now())=>{const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(time/30000)));const hash=crypto.createHmac('sha1',unbase32(secret)).update(counter).digest(),i=hash[19]&15;return ((hash.readUInt32BE(i)&0x7fffffff)%1000000).toString().padStart(6,'0');};
function counterFor(secret,code){if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;const now=Math.floor(Date.now()/30000);for(const delta of [0,-1,1])if(equal(exports.totp(secret,(now+delta)*30000),code))return now+delta;return null;}
async function state(user){try{return await Security.findOneAndUpdate({userId:user._id},{$setOnInsert:{userId:user._id}},{upsert:true,new:true}).lean();}catch(e){if(e.code!==11000)throw e;return Security.findOne({userId:user._id}).lean();}}
exports.record=async(user,type)=>{if(!eventTypes.has(type))throw failure(400,'Loại hoạt động không hợp lệ.');await Audit.create({userId:user._id,type});};
exports.activity=async user=>({viewerId:identity(user),items:(await Audit.find({userId:user._id}).sort({createdAt:-1,_id:-1}).limit(50).lean()).map(x=>({id:String(x._id),type:x.type,createdAt:x.createdAt}))});
function localLogin(user,s){return Boolean(user.nameAccount&&user.namePassword&&(user.Authorization!=='GOOGLE'&&!s.googleOnly||s.localPasswordEnabled));}
function effectiveStatus(user,s){return s.status!=='active'?s.status:['deactivated','deletion-pending'].includes(user.accountStatus)?user.accountStatus:'active';}
function googleLinked(user,s){return !s.googleDisabled&&Boolean(s.googleSubject||user.Authorization==='GOOGLE');}
exports.status=async user=>{const s=await state(user);let available=true;try{key();}catch{available=false;}return {viewerId:identity(user),security:{email:{address:emailOf(user)||null,verified:s.verifiedEmail===emailOf(user)&&Boolean(s.emailVerifiedAt),verifiedAt:s.verifiedEmail===emailOf(user)?s.emailVerifiedAt||null:null},
 google:{linked:googleLinked(user,s),canUnlink:googleLinked(user,s)&&localLogin(user,s),linkAvailable:Boolean(process.env.CLIENT_ID_GOOGLE&&process.env.CLIENT_SECRET_GOOGLE&&process.env.GOOGLE_CALLBACK_URL)},
 twoFactor:{enabled:Boolean(s.twoFactor?.enabled),recoveryCodesRemaining:s.twoFactor?.recoveryHashes?.length||0,available},account:{status:effectiveStatus(user,s),deletionRequestedAt:s.deletionRequestedAt||null}}};};
exports.assertActive=async user=>{const s=await state(user);if(s.mutationUntil&&new Date(s.mutationUntil).getTime()>Date.now())throw failure(409,'Bảo mật đang được cập nhật. Vui lòng thử lại.','SECURITY_BUSY');if(s.status!=='active'||user.accountStatus&&user.accountStatus!=='active')throw failure(403,'Tài khoản đã tạm ngừng. Xác thực lại để khôi phục.','ACCOUNT_INACTIVE');return s;};
async function passwordMatches(user,password){if(typeof password!=='string'||!password||typeof user.namePassword!=='string')return false;if(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.namePassword))return Password.compare(password,user.namePassword);return !user.namePassword.startsWith('$2')&&equal(password,user.namePassword);}
async function factor(user,code){let s=await state(user);if(!s.twoFactor?.enabled)return;
 const now=new Date();await Security.updateOne({userId:user._id,$or:[{factorWindow:{$lte:new Date(Date.now()-300000)}},{factorWindow:{$exists:false}}]},{$set:{factorWindow:now,factorAttempts:0}});
 s=await Security.findOneAndUpdate({userId:user._id,factorAttempts:{$lt:5}},{$inc:{factorAttempts:1}},{new:true}).lean();if(!s)throw failure(429,'Đã nhập sai quá nhiều lần. Vui lòng chờ 5 phút.','TWO_FACTOR_RATE_LIMIT',{retryAfter:300});
 let changed;
 if(typeof code==='string'&&/^[a-f0-9]{8}-[a-f0-9]{8}$/i.test(code)){const hash=digest('recovery:'+identity(user),code.toLowerCase());changed=await Security.updateOne({userId:user._id,'twoFactor.enabled':true,'twoFactor.recoveryHashes':hash},{$pull:{'twoFactor.recoveryHashes':hash}});}
 else {const counter=counterFor(decrypt(user,s.twoFactor.secret),code);if(counter!==null)changed=await Security.updateOne({userId:user._id,'twoFactor.enabled':true,$or:[{'twoFactor.lastCounter':{$lt:counter}},{'twoFactor.lastCounter':{$exists:false}}]},{$set:{'twoFactor.lastCounter':counter}});}
 if(!changed?.modifiedCount){await exports.record(user,'two_factor_failed');throw failure(401,'Cần mã xác thực hai bước hoặc mã khôi phục hợp lệ.','TWO_FACTOR_REQUIRED');}
 await Security.updateOne({userId:user._id},{$set:{factorAttempts:0}});
}
async function consume(user,proof,purpose,action){const invalid=()=>failure(400,'Mã không đúng, hết hạn, đã dùng hoặc sai mục đích.','SECURITY_CODE_INVALID');if(!proof||typeof proof.challengeId!=='string'||typeof proof.code!=='string'||!/^\d{6}$/.test(proof.code))throw invalid();
 const query={userId:user._id,challengeId:proof.challengeId,purpose,...(action?{action}:{}),sourceEmail:emailOf(user),authVersion:version(user),credentialHash:fingerprint(user),ready:true,consumed:false,expiresAt:{$gt:new Date()},attempts:{$lt:5}};
 const c=await Challenge.findOneAndUpdate(query,{$inc:{attempts:1}},{new:true}).lean();if(!c?.hash||!equal(c.hash,digest(identity(user)+':'+proof.challengeId,proof.code)))throw invalid();
 const claimed=await Challenge.findOneAndUpdate({...query,attempts:{$lte:5},hash:c.hash},{$set:{consumed:true,ready:false},$unset:{hash:''}},{new:true}).lean();if(!claimed)throw invalid();return claimed;
}
async function fresh(user,data,action){const s=await exports.assertActive(user);if(data.currentPassword){if(!localLogin(user,s)||!await passwordMatches(user,data.currentPassword))throw failure(403,'Mật khẩu hiện tại không đúng.','CURRENT_PASSWORD_INVALID');}
 else if(data.emailProof)await consume(user,data.emailProof,'sensitive',action);else throw failure(403,'Cần mật khẩu hiện tại hoặc mã email đúng mục đích.','FRESH_PROOF_REQUIRED');await factor(user,data.twoFactorCode);return s;}
exports.requestEmail=async(user,data)=>{if(!['verify-email','change-email','sensitive'].includes(data.purpose))throw failure(400,'Mục đích xác nhận không hợp lệ.');await exports.assertActive(user);const s=await state(user);
 if(data.purpose==='sensitive'&&(!actions.includes(data.action)||s.verifiedEmail!==emailOf(user)||!s.emailVerifiedAt))throw failure(400,'Cần email đã xác minh và mục đích hợp lệ.');
 if(data.purpose==='change-email')await fresh(user,data,'change-email');const email=data.purpose==='change-email'?data.email?.trim().toLowerCase():emailOf(user);
 if(Joi.string().email().max(254).required().validate(email).error)throw failure(400,'Email không hợp lệ.');
 if(data.purpose!=='sensitive'&&await UserModel.exists({_id:{$ne:user._id},gmail:{$regex:'^'+email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$', $options:'i'}}))throw failure(409,'Email đã được sử dụng.');
 Email.assertConfigured();key();const now=new Date(),bucket=data.purpose==='sensitive'?'sensitive:'+data.action:data.purpose,challengeId=crypto.randomUUID(),code=crypto.randomInt(1000000).toString().padStart(6,'0');
 try{await Challenge.updateOne({userId:user._id,bucket},{$setOnInsert:{windowStartedAt:now,sendCount:0}},{upsert:true});}catch(e){if(e.code!==11000)throw e;}
 await Challenge.updateOne({userId:user._id,bucket,windowStartedAt:{$lte:new Date(Date.now()-3600000)}},{$set:{windowStartedAt:now,sendCount:0}});
 const c=await Challenge.findOneAndUpdate({userId:user._id,bucket,sendCount:{$lt:5},$or:[{sentAt:{$lte:new Date(Date.now()-60000)}},{sentAt:{$exists:false}}]},{$set:{challengeId,purpose:data.purpose,action:data.action||'',email,sourceEmail:emailOf(user),authVersion:version(user),credentialHash:fingerprint(user),hash:digest(identity(user)+':'+challengeId,code),expiresAt:new Date(Date.now()+300000),sentAt:now,attempts:0,ready:false,consumed:false,deleteAt:new Date(Date.now()+3900000)},$inc:{sendCount:1}},{new:true}).lean();
 if(!c)throw failure(429,'Chờ 60 giây giữa các lần gửi, tối đa 5 mã mỗi giờ.','SECURITY_EMAIL_COOLDOWN',{retryAfter:60});
 let timer;try{const result=await Promise.race([Email.sendMail({to:email,subject:'MediaHz - Xác nhận bảo mật',text:`Mã xác nhận MediaHz: ${code}\nMục đích: ${data.action||data.purpose}. Có hiệu lực 5 phút, dùng một lần. Không chia sẻ mã.`}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),20000);})]);if(!result?.accepted?.length)throw Error('mail rejected');await Challenge.updateOne({userId:user._id,challengeId,consumed:false},{$set:{ready:true}});}
 catch{await Challenge.updateOne({userId:user._id,challengeId},{$set:{consumed:true,ready:false},$unset:{hash:''}});throw failure(503,'Không gửi được email xác nhận. Vui lòng thử lại sau.','SECURITY_EMAIL_DELIVERY_FAILED',{retryAfter:60});}finally{clearTimeout(timer);}
 await exports.record(user,'email_challenge_sent');return {viewerId:identity(user),challengeId,expiresAt:c.expiresAt,retryAfter:60};
};
async function invalidate(user,changes={}){const match={_id:user._id,namePassword:user.namePassword,...(version(user)?{authVersion:version(user)}:{$or:[{authVersion:0},{authVersion:{$exists:false}}]})};
 // Native collection permits accountStatus before main adds its schema field; never saves stale user data.
 const result=await UserModel.collection.updateOne(match,{$set:{refreshTokens:[],sessionBindingRequired:true,...changes},$inc:{authVersion:1,sessionRevision:1}});if(!result.modifiedCount)throw failure(409,'Thông tin đã thay đổi. Vui lòng đăng nhập lại.','SECURITY_STALE_ACCOUNT');}
// A short per-owner lease prevents token issuance between user credential CAS and security-state update.
// Failed stale proofs never change security state; expired leases can be retried without a new server process.
async function mutate(user,changes,apply,invalidateCredentials=true){
 const s=await state(user),mutationId=crypto.randomUUID();
 const locked=await Security.findOneAndUpdate({userId:user._id,revision:s.revision,$or:[{mutationUntil:{$lte:new Date()}},{mutationUntil:{$exists:false}}]},{$set:{mutationId,mutationUntil:new Date(Date.now()+60000)},$inc:{revision:1}},{new:true}).lean();
 if(!locked)throw failure(409,'Bảo mật đang được cập nhật. Vui lòng thử lại.','SECURITY_BUSY');
 try {
  if(invalidateCredentials)await invalidate(user,changes);
  else {
   // Non-revoking changes still check credentials and block stale login saves.
   const checked=await UserModel.collection.updateOne({_id:user._id,namePassword:user.namePassword,accountStatus:{$nin:['deactivated','deletion-pending']},...(version(user)?{authVersion:version(user)}:{$or:[{authVersion:0},{authVersion:{$exists:false}}]})},{$inc:{sessionRevision:1}});
   if(!checked.modifiedCount)throw failure(409,'Thông tin đã thay đổi. Vui lòng đăng nhập lại.','SECURITY_STALE_ACCOUNT');
  }
  return await apply({userId:user._id,mutationId},locked);
 }
 finally {await Security.updateOne({userId:user._id,mutationId},{$unset:{mutationId:'',mutationUntil:''}}).catch(()=>console.warn('Cannot release account security lease.'));}
}
exports.confirmEmail=async(user,data)=>{const c=await Challenge.findOne({userId:user._id,challengeId:data.challengeId}).lean();if(!c||!['verify-email','change-email'].includes(c.purpose))throw failure(400,'Mã xác nhận không hợp lệ.');await exports.assertActive(user);
 // Previous availability-read + separate assignments let two owners confirm the same address.
 await mutate(user,{},async locked=>{
  if(await UserModel.exists({_id:{$ne:user._id},gmail:c.email}))throw failure(409,'Email đã được sử dụng.');
  const claimed=await consume(user,data,c.purpose),created=await claimEmail(user,claimed.email);
  try {
   if(claimed.purpose==='change-email')await invalidate(user,{gmail:claimed.email});
   const updated=await Security.updateOne(locked,{$set:{verifiedEmail:claimed.email,emailVerifiedAt:new Date()},$inc:{revision:1}});
   if(!updated.modifiedCount)throw failure(409,'Thông tin đã thay đổi.','SECURITY_STALE_ACCOUNT');
   if(claimed.purpose==='change-email'&&emailOf(user)&&emailOf(user)!==claimed.email)await EmailClaim.deleteOne({_id:emailOf(user),owner:user._id});
  } catch(error) {
   if(created&&!await UserModel.exists({_id:user._id,gmail:claimed.email}))await EmailClaim.deleteOne({_id:claimed.email,owner:user._id});
   throw error;
  }
 },false);
 await exports.record(user,c.purpose==='change-email'?'email_changed':'email_verified');return {viewerId:identity(user),verified:true,requiresLogin:c.purpose==='change-email'};
};
exports.enroll=async(user,data)=>{const s=await fresh(user,data,'2fa-enroll');if(s.twoFactor?.enabled)throw failure(409,'Xác thực hai bước đã được bật.');const secret=base32(crypto.randomBytes(20)),expiresAt=new Date(Date.now()+300000);
 await Security.updateOne({userId:user._id,'twoFactor.enabled':{$ne:true}},{$set:{'twoFactor.pendingSecret':encrypt(user,secret),'twoFactor.pendingExpiresAt':expiresAt,'twoFactor.pendingAuthVersion':version(user),'twoFactor.pendingCredentialHash':fingerprint(user),'twoFactor.pendingAttempts':0},$inc:{revision:1}});
 return {viewerId:identity(user),secret,otpauthUrl:'otpauth://totp/'+encodeURIComponent('MediaHz:'+user.nameAccount)+'?secret='+secret+'&issuer=MediaHz&algorithm=SHA1&digits=6&period=30',expiresAt};};
exports.confirmEnrollment=async(user,data)=>{await exports.assertActive(user);const s=await Security.findOneAndUpdate({userId:user._id,'twoFactor.enabled':{$ne:true},'twoFactor.pendingSecret':{$exists:true},'twoFactor.pendingExpiresAt':{$gt:new Date()},'twoFactor.pendingAuthVersion':version(user),'twoFactor.pendingCredentialHash':fingerprint(user),'twoFactor.pendingAttempts':{$lt:5}},{$inc:{'twoFactor.pendingAttempts':1}},{new:true}).lean();
 if(!s||counterFor(decrypt(user,s.twoFactor.pendingSecret),data.code)===null)throw failure(400,'Mã xác thực không đúng hoặc thiết lập đã hết hạn.');
 const recoveryCodes=Array.from({length:10},()=>crypto.randomBytes(8).toString('hex').replace(/^(.{8})/,'$1-'));
 await mutate(user,{},async locked=>{const updated=await Security.updateOne({...locked,'twoFactor.enabled':{$ne:true},'twoFactor.pendingSecret':s.twoFactor.pendingSecret},{$set:{'twoFactor.enabled':true,'twoFactor.lastCounter':counterFor(decrypt(user,s.twoFactor.pendingSecret),data.code),'twoFactor.secret':s.twoFactor.pendingSecret,'twoFactor.recoveryHashes':recoveryCodes.map(x=>digest('recovery:'+identity(user),x))},$unset:{'twoFactor.pendingSecret':'','twoFactor.pendingExpiresAt':'','twoFactor.pendingAuthVersion':'','twoFactor.pendingCredentialHash':''},$inc:{revision:1}});
 if(!updated.modifiedCount)throw failure(409,'Thiết lập vừa thay đổi.');});await exports.record(user,'two_factor_enabled');return {viewerId:identity(user),recoveryCodes,requiresLogin:true};};
exports.disable=async(user,data)=>{await fresh(user,data,'2fa-disable');await mutate(user,{},locked=>Security.updateOne(locked,{$set:{twoFactor:{enabled:false,recoveryHashes:[]}},$inc:{revision:1}}));await exports.record(user,'two_factor_disabled');return {viewerId:identity(user),requiresLogin:true};};
exports.verifyLogin=async(user,data={})=>{
 let s=await state(user);
 const google=googleBindings.get(user);if(google)checkGoogleBinding(s,google);
 if(s.mutationUntil&&new Date(s.mutationUntil).getTime()>Date.now())throw failure(409,'Bảo mật đang được cập nhật. Vui lòng thử lại.','SECURITY_BUSY');
 await factor(user,data.twoFactorCode);
 const status=effectiveStatus(user,s);
 if(status!=='active'){
  const restore=status==='deactivated'&&data.reactivate===true||status==='deletion-pending'&&data.cancelDeletion===true;
  if(!restore)throw failure(403,'Tài khoản đã tạm ngừng. Xác nhận khôi phục khi đăng nhập.','ACCOUNT_INACTIVE');
  const changed=await UserModel.collection.updateOne({_id:user._id,namePassword:user.namePassword,...(version(user)?{authVersion:version(user)}:{$or:[{authVersion:0},{authVersion:{$exists:false}}]})},{$set:{accountStatus:'active'}});
  if(!changed.matchedCount)throw failure(409,'Thông tin đã thay đổi. Vui lòng đăng nhập lại.','SECURITY_STALE_ACCOUNT');
  const restored=await Security.updateOne({userId:user._id,revision:s.revision},{$set:{status:'active'},$unset:{deletionRequestedAt:''},$inc:{revision:1}});
  if(!restored.modifiedCount)throw failure(409,'Thông tin đã thay đổi. Vui lòng đăng nhập lại.','SECURITY_STALE_ACCOUNT');
  user.accountStatus='active';
  await exports.record(user,status==='deactivated'?'account_reactivated':'deletion_cancelled');s=await state(user);
 }
 const grant={};grants.set(grant,{id:identity(user),revision:s.revision,version:version(user),expires:Date.now()+30000,...(google?{google:{subject:google.subject,revision:s.revision}}:{})});return grant;
};
exports.authorizeSession=async(user,grant)=>{
 const s=await exports.assertActive(user),proof=grants.get(grant),google=proof?.google||googleBindings.get(user);
 // Previous: grants were checked only when MFA was enabled; an unlinked provider could still log in.
 if(google)checkGoogleBinding(s,google);
 if(s.twoFactor?.enabled||google){if(!proof||proof.id!==identity(user)||proof.revision!==s.revision||proof.version!==version(user)||proof.expires<Date.now())throw failure(401,'Cần xác thực lại trước khi tạo phiên.','TWO_FACTOR_REQUIRED');grants.delete(grant);}
};
exports.close=async(user,action,data)=>{if(data.confirm!==true||!['deactivate','deletion-request','deletion-cancel'].includes(action))throw failure(400,'Cần xác nhận thao tác.');await fresh(user,data,action);const status=action==='deactivate'?'deactivated':action==='deletion-request'?'deletion-pending':'active';
 await mutate(user,{accountStatus:status},locked=>Security.updateOne(locked,{$set:{status,...(status==='deletion-pending'?{deletionRequestedAt:new Date()}: {})},...(status!=='deletion-pending'?{$unset:{deletionRequestedAt:''}}:{}),$inc:{revision:1}}));await exports.record(user,action==='deactivate'?'account_deactivated':action==='deletion-request'?'deletion_requested':'deletion_cancelled');return {viewerId:identity(user),requiresLogin:true,status};};
exports.unlinkGoogle=async(user,data)=>{const s=await fresh(user,data,'google-unlink');if(!localLogin(user,s))throw failure(409,'Phải có mật khẩu đăng nhập cục bộ trước khi ngắt Google.','LAST_LOGIN_METHOD');await mutate(user,{},locked=>Security.updateOne(locked,{$set:{googleDisabled:true},$unset:{googleSubject:'',googleEmail:''},$inc:{revision:1}}));await exports.record(user,'google_unlinked');return {viewerId:identity(user),requiresLogin:true};};
exports.startGoogleLink=async(user,data,req)=>{await fresh(user,data,'google-link');if(!process.env.CLIENT_ID_GOOGLE||!process.env.CLIENT_SECRET_GOOGLE||!process.env.GOOGLE_CALLBACK_URL)throw failure(503,'Google OAuth chưa được cấu hình.');const token=crypto.randomBytes(32).toString('hex');req.session.accountGoogleIntent={owner:identity(user),state:token,expiresAt:Date.now()+300000,authVersion:version(user)};await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));return {viewerId:identity(user),url:'/auth/google?link='+token};};
exports.linkGoogle=async(user,profile,options={})=>{
 await exports.assertActive(user);const subject=profile.googleId;
 if(await Security.exists({userId:{$ne:user._id},googleSubject:subject})||await UserModel.exists({_id:{$ne:user._id},gmail:profile.gmail}))throw failure(409,'Google đã liên kết với tài khoản khác.');
 // Previous unconditional final update could undo an unlink that completed during the callback.
 try{await mutate(user,{},async locked=>{
  if(options.bootstrap)await claimEmail(user,profile.gmail);
  const result=await Security.updateOne(locked,{$set:{googleSubject:subject,googleEmail:profile.gmail,googleDisabled:false,...(options.bootstrap?{googleOnly:user.Authorization==='GOOGLE',verifiedEmail:profile.gmail,emailVerifiedAt:new Date()}: {})},$inc:{revision:1}});
  if(!result.modifiedCount)throw failure(409,'Liên kết đã thay đổi.','SECURITY_STALE_ACCOUNT');
 },false);}catch(e){if(e.code===11000)throw failure(409,'Google đã được liên kết.');throw e;}
 await exports.record(user,'google_linked');return user;
};
exports.localLogin=localLogin;

// Call only after PasswordChangeService's successful credential CAS.
exports.passwordChanged=async user=>{await state(user);await Security.updateOne({userId:user._id},{$set:{localPasswordEnabled:true},$unset:{'twoFactor.pendingSecret':'','twoFactor.pendingExpiresAt':''},$inc:{revision:1}});await exports.record(user,'password_changed');};
