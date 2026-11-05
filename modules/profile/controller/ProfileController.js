const service = require('../service/ProfileService');
const profileUrl = require('../../../utils/profileUrl');
const ApiError = require('../../../utils/ApiError');
exports.get = async (req, res) => {
  const actor = await service.viewer(req.user?.userID || req.user?.id || req.user?._id, req.get('X-Profile-Owner'));
  res.json({ success: true, data: await service.get(req.query, actor, req.params.slug) });
};
/* Previous public page handler (now also serves named owner pages):
exports.page = async (req, res, next) => {
  res.vary('X-Requested-With'); res.set('Cache-Control', 'no-store');
  try {
    const slug = req.params.slug.toLowerCase(), canonical = '/profile/' + slug;
    if (req.path !== '/' + slug) return res.redirect(308, canonical + new URL(req.originalUrl, 'http://localhost').search);
    const actor = await service.viewer(req.session?.userLogin?._id || req.session?.userLogin?.userID);
    const data = await service.get(req.query, actor, slug);
    if (!req.xhr) { res.locals.initialView = canonical + new URL(req.originalUrl, 'http://localhost').search; return require('../../../controllers/CTL_home').Home(req, res, next); }
    return res.render('user/profile-page', { data, editorUser: null, ownRoute: false, canUpload: false, editOpen: false, message: '' });
  } catch (error) {
    if (error.status !== 404) return next(error);
    if (!req.xhr) { res.status(404); res.locals.initialView = req.originalUrl; return require('../../../controllers/CTL_home').Home(req, res, next); }
    return res.status(404).render('user/profile-missing');
  }
};
*/
async function page(req, res, next, editOpen = false) {
  res.vary('X-Requested-With');
  res.set('Cache-Control', 'no-store');
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const publicPath = profileUrl({ profileSlug: slug });
    if (!publicPath) throw new ApiError({ status: 404, message: 'Profile not found.' });
    const canonical = publicPath + (editOpen ? '/edit' : '');
    const destination = new URL(req.originalUrl, 'http://localhost');
    if (destination.pathname !== canonical) return res.redirect(308, canonical + destination.search);
    const actor = await service.viewer(req.session?.userLogin?._id || req.session?.userLogin?.userID);
    const data = await service.get(req.query, actor, slug);
    if (editOpen && !data.isSelf) return res.redirect(302, publicPath + destination.search);
    if (!req.xhr) {
      res.locals.initialView = canonical + destination.search;
      return require('../../../controllers/CTL_home').Home(req, res, next);
    }
    if (data.isSelf) {
      const owner = require('../../../controllers/CTL_user');
      return editOpen ? owner.getEditProfile(req, res) : owner.getProfile(req, res);
    }
    return res.render('user/profile-page', { data, editorUser: null, ownRoute: false, canUpload: false, editOpen: false, message: '' });
  } catch (error) {
    if (error.status !== 404) return next(error);
    if (!req.xhr) {
      res.status(404); res.locals.initialView = req.originalUrl;
      return require('../../../controllers/CTL_home').Home(req, res, next);
    }
    return res.status(404).render('user/profile-missing');
  }
}
exports.page = (req, res, next) => page(req, res, next);
exports.editPage = (req, res, next) => page(req, res, next, true);
exports.editEntry = async (req, res, next) => {
  res.vary('X-Requested-With');
  res.set('Cache-Control', 'no-store');
  try {
    // 'edit' was already a valid account/song namespace. Do not invalidate its permalinks.
    if (await service.exists('edit')) {
      req.params.slug = 'edit';
      return page(req, res, next);
    }
    return require('../../../controllers/CTL_user').redirectEditProfile(req, res, next);
  } catch (error) { return next(error); }
};
