const router=require('express').Router();
const Joi=require('joi');
const rateLimit=require('express-rate-limit');
const {UserModel}=require('../../../model/db_song');
const service=require('../service/AccountSecurityService');
const proof={currentPassword:Joi.string().max(1024),emailProof:Joi.object({challengeId:Joi.string().guid().required(),code:Joi.string().pattern(/^\d{6}$/).required()}).unknown(false),twoFactorCode:Joi.string().max(32)};
router.use(async(req,res,next)=>{res.set('Cache-Control','no-store');try{
 const id=String(req.accountContext?.user?._id||'');if(!/^[a-f0-9]{24}$/i.test(id))return res.status(401).json({success:false,code:'AUTH_REQUIRED',message:'Vui lòng đăng nhập lại.'});
 const owner=req.get('X-Settings-Owner'),mutation=!['GET','HEAD'].includes(req.method);
 if(mutation&&!owner)return res.status(400).json({success:false,code:'SETTINGS_OWNER_REQUIRED',message:'Thiếu xác nhận tài khoản.'});
 if(owner&&owner!==id)return res.status(409).json({success:false,code:'SETTINGS_OWNER_CHANGED',message:'Tài khoản đã thay đổi.'});
 if(mutation){const origin=req.get('Origin');if(origin&&origin!==req.protocol+'://'+req.get('host')||req.get('Sec-Fetch-Site')==='cross-site')return res.status(403).json({success:false,code:'SAME_ORIGIN_REQUIRED',message:'Yêu cầu không cùng nguồn.'});if(!req.is('application/json'))return res.status(415).json({success:false,message:'Yêu cầu phải dùng JSON.'});}
 req.securityActor=await UserModel.findById(id);if(!req.securityActor)return res.sendStatus(401);await service.assertActive(req.securityActor);next();
 }catch(e){next(e);}});
router.use(rateLimit({windowMs:60000,max:45,keyGenerator:req=>String(req.securityActor._id),message:{success:false,code:'SECURITY_RATE_LIMIT',message:'Vui lòng chờ trước khi thử lại.'}}));
function route(path,schema,handler){router.post(path,async(req,res,next)=>{try{const result=Joi.object(schema).unknown(false).validate(req.body,{convert:false});if(result.error)return res.status(400).json({success:false,code:'SECURITY_BODY_INVALID',message:'Nội dung yêu cầu không hợp lệ.'});const data=await handler(req.securityActor,result.value,req);if(data.requiresLogin&&!req.accountViaBearer&&req.session?.destroy)await new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve()));res.json({success:true,data});}catch(e){next(e);}});}
router.get('/',async(req,res,next)=>{try{res.json({success:true,data:await service.status(req.securityActor)});}catch(e){next(e);}});
router.get('/activity',async(req,res,next)=>{try{res.json({success:true,data:await service.activity(req.securityActor)});}catch(e){next(e);}});
route('/email/challenge',{purpose:Joi.string().valid('verify-email','change-email','sensitive').required(),action:Joi.string().valid('change-email','2fa-enroll','2fa-disable','google-link','google-unlink','deactivate','deletion-request','deletion-cancel'),email:Joi.string().email().max(254),...proof},service.requestEmail);
route('/email/confirm',{challengeId:Joi.string().guid().required(),code:Joi.string().pattern(/^\d{6}$/).required()},service.confirmEmail);
route('/2fa/enroll',proof,service.enroll);
route('/2fa/confirm',{code:Joi.string().pattern(/^\d{6}$/).required()},service.confirmEnrollment);
route('/2fa/disable',proof,service.disable);
router.post('/google/link',(req,res,next)=>{
  if (req.accountViaBearer) return res.status(403).json({success:false,code:'WEB_OAUTH_REQUIRED',message:'Liên kết Google trong cài đặt tài khoản web.'});
  next();
});
route('/google/link',proof,service.startGoogleLink);
route('/google/unlink',proof,service.unlinkGoogle);
for(const action of ['deactivate','deletion-request','deletion-cancel'])route('/'+action,{confirm:Joi.boolean().valid(true).required(),...proof},(user,data)=>service.close(user,action,data));
router.use((e,req,res,next)=>{if(res.headersSent)return next(e);if(e.retryAfter)res.set('Retry-After',String(e.retryAfter));res.status(e.status||500).json({success:false,code:e.status?e.code:'SECURITY_UNAVAILABLE',message:e.status?e.message:'Không thể cập nhật bảo mật lúc này.',...(e.retryAfter?{retryAfter:e.retryAfter}:{})});});
module.exports=router;
