const express = require('express');
const verify = require('../../../middlewares/auth/verifyAccessToken');
const webAuth = require('../../../middlewares/auth/webAccessToken');
const controller = require('../controller/FeedController');
const router = express.Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.headers.authorization) return verify(req, res, next);
  if (req.user) return next();
  if (req.session?.userLogin) return webAuth(req, res, next);
  next();
});
router.get('/items', controller.items);
router.get('/creators', controller.creators);
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!error.status) console.error('Feed failed:', error.code || error.name);
  return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể tải Feed. Vui lòng thử lại.' });
});
module.exports = router;
