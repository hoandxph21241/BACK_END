const Joi = require('joi');
const { MP3, UserModel, CategoryModel } = require('../../../model/db_song');
const Follow = require('../../user/model/UserFollow');
const Feed = require('../../feed/service/FeedService');
const History = require('./ListeningHistoryService');
const { formatSongSummary, getImageUrl } = require('../../../utils/songResponse');
const ApiError = require('../../../utils/ApiError');
const Privacy = require('../../account/service/AccountPrivacyService');
const PUBLIC = { isDeleted: { $ne: true }, isPublic: { $ne: false } };
const SELECT = 'name artist image categoryId duration createdAt uploadDate profileSlug slug userID playCount likeCount';
const querySchema = Joi.object({ categoryId: Joi.string().pattern(/^[a-f0-9]{24}$/i).allow('').default('') }).unknown(false);
const failure = (status, message) => new ApiError({ status, code: 'HOME_FAILED', message });
const safeImage = (value, fallback) => { const url = getImageUrl(value); return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? url : fallback; };
exports.viewer = async (identifier, expectedOwner) => {
  const actor = await Feed.viewer(identifier);
  if (expectedOwner && expectedOwner !== String(actor?._id || '')) throw failure(409, 'Your account has changed. Please refresh Home.');
  return actor;
};
const songs = (filter, popular = false) => MP3.find({ ...PUBLIC, ...filter }).select(SELECT).populate('categoryId', 'nameCategory')
  .sort(popular ? { playCount: -1, likeCount: -1, _id: -1 } : { createdAt: -1, _id: -1 }).limit(12).maxTimeMS(3000).lean();

exports.get = async (input, actor) => {
  const parsed = querySchema.validate(input); if (parsed.error) throw failure(400, 'Invalid Home filter.');
  // Previous: const categoryId = parsed.value.categoryId, filter = categoryId ? { categoryId } : {};
  // const activeCategories = await MP3.distinct('categoryId', PUBLIC).maxTimeMS(3000);
  const blockedIds = actor ? await Privacy.excluded(actor._id) : [];
  const blockedUsers = blockedIds.length ? await UserModel.find({ _id: { $in: blockedIds } }).select('_id userID').lean() : [];
  const blockedAliases = [...blockedIds.map(String), ...blockedUsers.map(user => user.userID).filter(Boolean)];
  const categoryId = parsed.value.categoryId, filter = { ...(categoryId ? { categoryId } : {}), userID: { $nin: blockedAliases } };
  const activeCategories = await MP3.distinct('categoryId', { ...PUBLIC, userID: { $nin: blockedAliases } }).maxTimeMS(3000);
  const categories = await CategoryModel.find({ _id: { $in: activeCategories.filter(Boolean) } }).select('nameCategory').sort({ nameCategory: 1 }).limit(12).lean();
  const sections = [];
  if (actor) {
    const aliases = [String(actor._id), actor.userID].filter(Boolean);
    const liked = await MP3.find({ ...PUBLIC, likedBy: { $in: aliases } }).select('_id categoryId').sort({ createdAt: -1, _id: -1 }).limit(100).maxTimeMS(3000).lean();
    const relations = await Follow.find({ follower: actor._id }).select('followee').limit(1000).lean();
    const uploaders = relations.length ? await UserModel.find({ _id: { $in: relations.map(r => r.followee) } }).select('_id userID').lean() : [];
    const genres = [...new Set(liked.map(s => String(s.categoryId || '')).filter(Boolean))];
    const owners = uploaders.flatMap(u => [String(u._id), u.userID]).filter(Boolean);
    const signals = [...(genres.length ? [{ categoryId: { $in: genres } }] : []), ...(owners.length ? [{ userID: { $in: owners } }] : [])];
    if (signals.length) {
      // Previous: const recommended = await songs({ ...filter, _id: { $nin: liked.map(s => s._id) }, userID: { $nin: aliases }, $or: signals });
      const recommended = await songs({ ...filter, _id: { $nin: liked.map(s => s._id) }, userID: { $nin: [...aliases, ...blockedAliases] }, $or: signals });
      if (recommended.length) sections.push({ id: 'for-you', title: 'More of what you like', subtitle: 'Based on genres you like and creators you follow', items: recommended });
    }
  }
  sections.push({ id: 'newest', title: 'New releases', subtitle: 'Fresh sounds on MediaHz', items: await songs(filter) },
    { id: 'popular', title: 'Popular tracks', subtitle: 'Most played by the community', items: await songs(filter, true) });
  for (const category of categories.filter(c => !categoryId || String(c._id) === categoryId).slice(0, 3)) {
    // Previous: sections.push({ id: 'genre-' + category._id, title: category.nameCategory, subtitle: 'Explore this genre', items: await songs({ categoryId: category._id }) });
    sections.push({ id: 'genre-' + category._id, title: category.nameCategory, subtitle: 'Explore this genre', items: await songs({ ...filter, categoryId: category._id }) });
  }
  const history = await History.recent(actor?._id);
  const recentSongs = history.length ? await MP3.find({ ...PUBLIC, ...filter, _id: { $in: history.map(e => e.songId) } }).select(SELECT).populate('categoryId', 'nameCategory').maxTimeMS(3000).lean() : [];
  const byId = new Map(recentSongs.map(s => [String(s._id), s]));
  const recent = history.filter(e => byId.has(String(e.songId))).slice(0, 5).map(e => ({ ...byId.get(String(e.songId)), lastPlayedAt: e.lastPlayedAt }));
  const all = [...sections.flatMap(s => s.items), ...recent], ownerIds = [...new Set(all.map(s => s.userID).filter(Boolean))];
  const people = ownerIds.length ? await UserModel.find({ $or: [{ userID: { $in: ownerIds } }, { _id: { $in: ownerIds.filter(id => /^[a-f0-9]{24}$/i.test(id)) } }] })
    .select('_id userID fullName userName profileTag profileSlug imageAccount').lean() : [];
  const byOwner = new Map();
  for (const user of people) {
    const profile = { id: String(user._id), name: user.fullName || user.userName || 'MediaHz', avatar: safeImage(user.imageAccount, '/images/auth/person-circle.svg'), tag: user.profileTag || '', profileUrl: require('../../../utils/profileUrl')(user) };
    byOwner.set(String(user._id), profile); if (user.userID) byOwner.set(user.userID, profile);
  }
  const summary = song => ({ ...formatSongSummary(song), id: String(song._id), creator: byOwner.get(song.userID) || null,
    image: safeImage(song.image, '/images/chibi.gif'), playCount: Number(song.playCount) || 0, likeCount: Number(song.likeCount) || 0,
    ...(song.lastPlayedAt ? { lastPlayedAt: song.lastPlayedAt } : {}) });
  return { viewerId: actor ? String(actor._id) : null,
    sections: sections.filter(s => s.items.length).map(s => ({ ...s, items: s.items.map(summary) })),
    categories: categories.map(c => ({ id: String(c._id), name: c.nameCategory })),
    creators: (await Feed.creators(actor)).items.slice(0, 4), recent: recent.map(summary) };
};
