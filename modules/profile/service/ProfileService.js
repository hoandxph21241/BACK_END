const Joi = require('joi');
const { MP3, UserModel } = require('../../../model/db_song');
const Follow = require('../../user/model/UserFollow');
const Feed = require('../../feed/service/FeedService');
const { validProfileSlug } = require('../../../utils/permalink');
const profileUrl = require('../../../utils/profileUrl');
const { parseSearch, searchFilter } = require('../../../utils/songSearch');
const { formatSongSummary, getImageUrl } = require('../../../utils/songResponse');
const { isWebLink } = require('../../../utils/profileFields');
const ApiError = require('../../../utils/ApiError');
const PUBLIC = { isPublic: { $ne: false }, isDeleted: { $ne: true } };
// Existing slugs take precedence over the legacy /users/profile/edit entry.
exports.exists = slug => UserModel.exists({ profileSlug: slug }).maxTimeMS(3000);
const FIELDS = '_id userID profileSlug fullName userName imageAccount bannerImage profileTag bio city country links';
const SONG_FIELDS = 'name artist image categoryId duration createdAt uploadDate profileSlug slug playCount likeCount';
const schema = Joi.object({ q: Joi.string().max(100).allow('').default(''), sort: Joi.string().valid('newest', 'popular', 'title').default('newest'),
  tab: Joi.string().valid('tracks', 'about').default('tracks'), page: Joi.number().integer().min(1).max(1000).default(1), limit: Joi.number().integer().min(1).max(24).default(12) }).unknown(false);
const fail = (status, message) => new ApiError({ status, code: 'PROFILE_FAILED', message });
const number = value => Math.max(0, Number(value) || 0);
const image = (value, fallback) => { const url = getImageUrl(value); return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? url : fallback; };
exports.viewer = async (identifier, expectedOwner) => {
  const actor = await Feed.viewer(identifier);
  if (expectedOwner && expectedOwner !== String(actor?._id || '')) throw fail(409, 'Your account has changed. Please refresh Profile.');
  return actor;
};
exports.get = async (input, actor, slug) => {
  const parsed = schema.validate(input); if (parsed.error) throw fail(400, 'Invalid Profile filter.');
  const query = parsed.value; query.q = parseSearch({ q: query.q }).q;
  if (!slug && !actor) throw fail(401, 'Sign in to open your profile.');
  if (slug && !validProfileSlug(slug)) throw fail(404, 'Profile not found.');
  const user = await UserModel.findOne(slug ? { profileSlug: slug } : { _id: actor._id }).select(FIELDS).maxTimeMS(3000).lean();
  if (!user) throw fail(404, 'Profile not found.');
  const aliases = [String(user._id), user.userID].filter(Boolean), filter = { ...PUBLIC, userID: { $in: aliases } };
  const order = query.sort === 'popular' ? { playCount: -1, likeCount: -1, _id: -1 } : query.sort === 'title' ? { name: 1, _id: 1 } : { createdAt: -1, _id: -1 };
  const [totals, followers, followingCount, relation, rows] = await Promise.all([
    MP3.aggregate([{ $match: filter }, { $group: { _id: null, tracks: { $sum: 1 }, plays: { $sum: '$playCount' }, likes: { $sum: '$likeCount' } } }]).option({ maxTimeMS: 3000 }),
    Follow.countDocuments({ followee: user._id }).maxTimeMS(3000), Follow.countDocuments({ follower: user._id }).maxTimeMS(3000),
    actor ? Follow.exists({ follower: actor._id, followee: user._id }) : null,
    MP3.find({ ...filter, ...(query.q ? { $or: searchFilter(query.q).$or } : {}) }).select(SONG_FIELDS).populate('categoryId', 'nameCategory')
      .sort(order).skip((query.page - 1) * query.limit).limit(query.limit + 1).maxTimeMS(3000).lean(),
  ]);
  return { viewerId: actor ? String(actor._id) : null, isSelf: Boolean(actor && String(actor._id) === String(user._id)), following: Boolean(relation),
    // Previous URL: validProfileSlug(user.profileSlug) ? '/profile/' + user.profileSlug : null.
    profile: { id: String(user._id), slug: user.profileSlug || null, url: profileUrl(user),
      name: user.fullName || user.userName || 'MediaHz listener', avatar: image(user.imageAccount, '/images/auth/person-circle.svg'),
      banner: image(user.bannerImage, '/images/bg_main.png'), tag: user.profileTag || '', bio: user.bio || '', city: user.city || '', country: user.country || '',
      links: (user.links || []).filter(link => isWebLink(link.url)).slice(0, 5).map(link => ({ label: link.label || '', url: link.url })) },
    stats: { tracks: number(totals[0]?.tracks), plays: number(totals[0]?.plays), likes: number(totals[0]?.likes), followers, following: followingCount },
    query, page: query.page, hasMore: rows.length > query.limit, items: rows.slice(0, query.limit).map(song => ({ ...formatSongSummary(song), id: String(song._id),
      image: image(song.image, '/images/chibi.gif'), playCount: number(song.playCount), likeCount: number(song.likeCount) })) };
};
