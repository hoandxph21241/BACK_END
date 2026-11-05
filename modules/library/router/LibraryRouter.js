const router = require('express').Router();
const verify = require('../../../middlewares/auth/verifyAccessToken');
const webAuth = require('../../../middlewares/auth/webAccessToken');
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.headers.authorization) return verify(req, res, next);
  if (req.user) return next();
  if (req.session?.userLogin) return webAuth(req, res, next);
  next();
});
router.get('/', require('../controller/LibraryController').get);
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!error.status) console.error('Library failed:', error.code || error.name);
  res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Unable to load Library. Please try again.' });
});
module.exports = router;
