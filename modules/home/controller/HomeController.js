const service = require('../service/HomeService');
exports.get = async (req, res) => {
  const actor = await service.viewer(req.user?.userID || req.user?.id || req.user?._id, req.get('X-Home-Owner'));
  res.json({ success: true, data: await service.get(req.query, actor) });
};
// Previous template: home/Discover.
exports.page = (req, res) => res.render('home/discover-page', { ownerId: String(req.session?.userLogin?._id || '') });
