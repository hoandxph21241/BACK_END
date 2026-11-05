const router = require('express').Router();
const verify = require('../../../middlewares/auth/verifyAccessToken'), webAuth = require('../../../middlewares/auth/webAccessToken');
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); if (req.headers.authorization) return verify(req, res, next); if (req.user) return next(); if (req.session?.userLogin) return webAuth(req, res, next); next(); });
router.get('/', require('../controller/ProfileController').get);
router.get('/:slug', require('../controller/ProfileController').get);
router.use((error, req, res, next) => { if (res.headersSent) return next(error); res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Unable to load Profile. Please try again.' }); });
module.exports = router;
