const service = require('../service/LibraryService');
exports.get = async (req, res) => {
  const actor = await service.viewer(req.user?.userID || req.user?.id || req.user?._id, req.get('X-Library-Owner'));
  res.json({ success: true, data: await service.get(req.query, actor) });
};
// Previous template: home/Library.
exports.page = (req, res) => res.render('home/library-page', { ownerId: String(req.session?.userLogin?._id || '') });
