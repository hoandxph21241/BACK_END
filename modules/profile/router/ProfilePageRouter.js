const router = require('express').Router();
// Compatibility entry: the handler redirects /profile/:slug to /users/profile/:slug.
router.get('/:slug', require('../controller/ProfileController').page);
module.exports = router;
