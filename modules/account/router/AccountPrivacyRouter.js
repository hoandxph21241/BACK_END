const router = require('express').Router();
const Joi = require('joi');
const service = require('../service/AccountPrivacyService');
const input = Joi.object({ blocked: Joi.boolean().strict().required() }).unknown(false).required();

// The account parent owns web auth, owner/origin checks, and JSON enforcement.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const owner = req.accountContext?.user?._id;
  if (!owner || !req.user?.id) return next(Object.assign(new Error('Vui lòng đăng nhập lại.'), { status: 401 }));
  if (String(owner) !== String(req.user.id)) return next(Object.assign(new Error('Tài khoản đã thay đổi. Vui lòng mở lại cài đặt.'), { status: 409 }));
  next();
});
router.get('/blocks', async (req, res) => {
  const viewerId = String(req.accountContext.user._id);
  res.json({ success: true, data: { viewerId, items: await service.list(viewerId) } });
});
router.get('/blocks/recipients',async(req,res)=>{
  if(Object.keys(req.query).some(key=>key!=='q'))return res.status(400).json({success:false,message:'Invalid account search.'});
  const viewerId=String(req.accountContext.user._id);
  res.json({success:true,data:{viewerId,items:await service.search(viewerId,req.query.q)}});
});
router.put('/blocks/:id', async (req, res) => {
  const result = input.validate(req.body, { convert: false });
  if (result.error) return res.status(400).json({ success: false, message: 'Trạng thái chặn phải là true hoặc false.' });
  const viewerId = String(req.accountContext.user._id);
  // Previous: only an internal ObjectId could be entered; resolve public names/#tags too.
  res.json({ success: true, data: { viewerId, items: await service.set(viewerId, await service.resolveTarget(req.params.id), result.value.blocked) } });
});

module.exports = router;
