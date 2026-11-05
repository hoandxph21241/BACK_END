const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const service = require('../service/AccountSettingsService');
const webAuth = require('../../../middlewares/auth/webAccessToken');
const guard = (req,res,next) => {
  res.set('Cache-Control','no-store');
  next();
};
const verifyAccessToken = require('../../../middlewares/auth/verifyAccessToken');
router.use(guard,(req,res,next) => {
  req.accountViaBearer = Boolean(req.headers.authorization);
  return req.accountViaBearer ? verifyAccessToken(req,res,next) : webAuth(req,res,next);
});
router.use(rateLimit({windowMs:60000,max:90,keyGenerator:req=>String(req.user.id),message:{success:false,message:'Bạn thao tác quá nhanh. Vui lòng thử lại sau.'}}));
router.use(async (req,res,next) => {
  try {
    const expected = req.get('X-Settings-Owner'), mutation = !['GET','HEAD'].includes(req.method);
    if (mutation && !expected) return res.status(400).json({success:false,message:'Thiếu xác nhận tài khoản hiện tại.'});
    if (expected && expected !== String(req.user.id)) return res.status(409).json({success:false,message:'Tài khoản đã thay đổi. Vui lòng mở lại cài đặt.'});
    if (mutation) {
      const origin = req.get('Origin');
      if (origin && origin !== req.protocol + '://' + req.get('host') || req.get('Sec-Fetch-Site') === 'cross-site') return res.status(403).json({success:false,message:'Yêu cầu không cùng nguồn.'});
      if (!req.is('application/json')) return res.status(415).json({success:false,message:'Yêu cầu phải dùng JSON.'});
      // Previous: every mutation allowed only {confirm:true}; each feature now validates its own payload.
      if (req.path.startsWith('/sessions') && Joi.object({confirm:Joi.boolean().valid(true).required()}).unknown(false).validate(req.body).error) return res.status(400).json({success:false,message:'Vui lòng xác nhận thao tác đăng xuất.'});
    }
    req.accountContext = await service.context(String(req.user.id || ''),req.accountViaBearer ? undefined : req.session?.authTokens?.refreshToken,req.user.sid,req.accountViaBearer);
    next();
  } catch(error) { next(error); }
});
router.get('/',(req,res)=>res.json({success:true,data:service.info(req.accountContext)}));
router.get('/sessions',(req,res)=>res.json({success:true,data:service.list(req.accountContext)}));
const preferences = require('../service/AccountPreferencesService');
router.get('/preferences',async(req,res)=>res.json({success:true,data:{viewerId:String(req.accountContext.user._id),preferences:await preferences.get(String(req.accountContext.user._id))}}));
router.patch('/preferences',async(req,res)=>res.json({success:true,data:{viewerId:String(req.accountContext.user._id),preferences:await preferences.patch(String(req.accountContext.user._id),req.body)}}));
router.use(require('./AccountPrivacyRouter'));
router.use('/security',require('./AccountSecurityRouter'));
const accountData=require('../service/AccountDataService');
const notices=require('../service/AccountNotificationService');
const confirmed=body=>!Joi.object({confirm:Joi.boolean().strict().valid(true).required()}).unknown(false).validate(body).error;
router.get('/export',async(req,res)=>{
  const data=await accountData.export(String(req.accountContext.user._id));
  res.set('Content-Disposition','attachment; filename="mediahz-account.json"').json({success:true,data});
});
router.delete('/history',async(req,res)=>{
  if(!confirmed(req.body))return res.status(400).json({success:false,message:'Please confirm clearing your listening history.'});
  res.json({success:true,data:await accountData.clearHistory(String(req.accountContext.user._id))});
});
router.get('/notifications',async(req,res)=>res.json({success:true,data:await notices.list(String(req.accountContext.user._id))}));
router.post('/notifications/read',async(req,res)=>{
  if(!confirmed(req.body))return res.status(400).json({success:false,message:'Confirmation is required.'});
  res.json({success:true,data:await notices.read(String(req.accountContext.user._id))});
});
router.delete('/notifications',async(req,res)=>{
  if(!confirmed(req.body))return res.status(400).json({success:false,message:'Confirmation is required.'});
  res.json({success:true,data:await notices.clear(String(req.accountContext.user._id))});
});
async function revoke(req,res,next,target) {
  try {
    const data = await service.revoke(req.accountContext,target);
    if (data.signedOut && !req.accountViaBearer) {
      await new Promise((resolve,reject)=>req.session.destroy(error=>error?reject(error):resolve()));
      // Previous: res.clearCookie('connect.sid',{path:'/'});
      // Destroy only this server session. A delayed response must not clear a newer login cookie.
      const nav = await new Promise((resolve,reject)=>res.render('inc/_nav_account',{user:null},(error,html)=>error?reject(error):resolve(html)));
      return res.json({success:true,data,nav});
    }
    res.json({success:true,data});
  } catch(error) { next(error); }
}
router.post('/sessions/revoke-others',(req,res,next)=>revoke(req,res,next,'others'));
router.delete('/sessions/:id',(req,res,next)=>revoke(req,res,next,req.params.id));
router.use((error,req,res,next)=>{
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({success:false,message:error.status?error.message:'Không thể cập nhật cài đặt lúc này. Vui lòng thử lại.'});
});
module.exports = router;
