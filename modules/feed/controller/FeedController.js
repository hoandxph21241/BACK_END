const service = require('../service/FeedService');
const { CategoryModel } = require('../../../model/db_song');
const identity = req => req.user?.userID || req.user?.id || req.user?._id;
async function actor(req) { return service.viewer(identity(req), req.get('X-Feed-Owner')); }

exports.items = async (req, res) => res.json({ success: true, data: await service.items(req.query, await actor(req)) });
exports.creators = async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ success: false, message: 'Truy vấn người đăng không hợp lệ.' });
  return res.json({ success: true, data: await service.creators(await actor(req)) });
};
exports.page = async (req, res, next) => {
  try {
    const categories = await CategoryModel.find().select('nameCategory').sort({ nameCategory: 1 }).lean();
    const ownerId = req.session?.userLogin?._id ? String(req.session.userLogin._id) : '';
    // Previous template: home/Feed.
    return res.render('home/feed-page', { categories, ownerId });
  } catch (error) { next(error); }
};
