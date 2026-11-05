const express = require('express');
const rateLimit = require('express-rate-limit');
const verify = require('../../../middlewares/auth/verifyAccessToken');
const webAuth = require('../../../middlewares/auth/webAccessToken');
const service = require('../service/FollowService');
const router = express.Router({ mergeParams: true });
const identifier = req => String(req.user?.userID || req.user?.id || req.user?._id || '');

router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/', (req, res, next) => {
  if (req.headers.authorization) return verify(req, res, next);
  return req.session?.userLogin && req.session?.authTokens?.accessToken ? webAuth(req, res, next) : next();
}, async (req, res) => res.json({ success: true, data: await service.get(req.params.id, identifier(req)) }));

const limit = rateLimit({ windowMs: 60000, max: 30,
  keyGenerator: identifier,
  message: { success: false, message: 'Bạn đang thao tác quá nhanh. Vui lòng chờ một chút.' } });
router.put('/', (req, res, next) => {
  if (!req.is('application/json')) return res.status(415).json({ success: false, message: 'Vui lòng gửi dữ liệu JSON.' });
  if (req.headers.authorization) return verify(req, res, next);
  if (!/^[a-f0-9]{24}$/i.test(req.get('X-Follow-Owner') || '')) {
    return res.status(400).json({ success: false, message: 'Thiếu tài khoản thực hiện theo dõi.' });
  }
  if (req.get('Sec-Fetch-Site') === 'cross-site'
      || (req.get('Origin') && req.get('Origin') !== `${req.protocol}://${req.get('host')}`)) {
    return res.status(403).json({ success: false, message: 'Không cho phép yêu cầu theo dõi từ trang khác.' });
  }
  return webAuth(req, res, next);
}, limit, async (req, res) => res.json({ success: true,
  data: await service.update(req.params.id, identifier(req), req.body, req.get('X-Follow-Owner')) }));

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!error.status) console.error('Follow failed:', error.message);
  res.status(error.status || 500).json({ success: false,
    message: error.status ? error.message : 'Không thể cập nhật theo dõi. Vui lòng thử lại.' });
});
module.exports = router;
