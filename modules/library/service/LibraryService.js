const Joi = require('joi');
const { MP3, UserModel, CategoryModel } = require('../../../model/db_song');
const Follow = require('../../user/model/UserFollow');
const Feed = require('../../feed/service/FeedService');
const History = require('../../home/service/ListeningHistoryService');
const { formatSongSummary, getImageUrl } = require('../../../utils/songResponse');
const { parseSearch, searchFilter } = require('../../../utils/songSearch');
const ApiError = require('../../../utils/ApiError');

const PUBLIC = { isPublic: { $ne: false }, isDeleted: { $ne: true } };
const SELECT = 'name artist image categoryId duration createdAt uploadDate profileSlug slug userID likeCount +likedBy';
const schema = Joi.object({
  tab: Joi.string().valid('likes', 'history', 'following').default('likes'),
  q: Joi.string().max(100).allow('').default(''),
  categoryId: Joi.string().pattern(/^[a-f0-9]{24}$/i).allow('').default(''),
  sort: Joi.string().valid('recent', 'title', 'artist').default('recent'),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(48).default(24),
}).unknown(false);
const failure = (status, message) => new ApiError({ status, code: 'LIBRARY_FAILED', message });
const safeImage = (value, fallback) => {
  const url = getImageUrl(value);
  return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? url : fallback;
};
const person = user => ({ id: String(user._id), name: user.fullName || user.userName || 'MediaHz',
  profileUrl: require('../../../utils/profileUrl')(user),
  avatar: safeImage(user.imageAccount, '/images/auth/person-circle.svg'), tag: user.profileTag || '',
  location: [user.city, user.country].filter(Boolean).join(', ') });
// Reuse the accent-aware literal matcher for public creator fields, too.
const peopleSearch = q => {
  const pattern = searchFilter(q).$or[0].name;
  return { $or: ['fullName', 'userName', 'profileTag', 'city', 'country'].map(field => ({ [field]: pattern })) };
};

exports.viewer = async (identifier, expectedOwner) => {
  const actor = await Feed.viewer(identifier);
  if (!actor) throw failure(401, 'Sign in to open your Library.');
  if (expectedOwner && expectedOwner !== String(actor._id)) throw failure(409, 'Your account has changed. Please refresh Library.');
  return actor;
};

exports.get = async (input, actor) => {
  const parsed = schema.validate(input);
  if (parsed.error) throw failure(400, 'Invalid Library filter.');
  const query = parsed.value;
  const { q } = parseSearch({ q: query.q });
  const { tab, categoryId, sort, page, limit } = query;
  const skip = (page - 1) * limit;
  if (tab === 'following') {
    if (categoryId || sort === 'artist') throw failure(400, 'Invalid Following filter.');
    const pipeline = [
      { $match: { follower: actor._id, followee: { $ne: actor._id } } },
      { $lookup: { from: UserModel.collection.name, localField: 'followee', foreignField: '_id', as: 'person' } },
      { $unwind: '$person' },
      { $project: { _id: 1, createdAt: 1, person: { _id: '$person._id', fullName: '$person.fullName', userName: '$person.userName',
        profileTag: '$person.profileTag', profileSlug: '$person.profileSlug', imageAccount: '$person.imageAccount', city: '$person.city', country: '$person.country' } } },
    ];
    if (q) pipeline.push({ $match: { $or: peopleSearch(q).$or.map(condition => {
      const [field, value] = Object.entries(condition)[0]; return { ['person.' + field]: value };
    }) } });
    pipeline.push({ $sort: sort === 'title' ? { 'person.fullName': 1, _id: 1 } : { createdAt: -1, _id: -1 } }, { $skip: skip }, { $limit: limit + 1 });
    const rows = await Follow.aggregate(pipeline).option({ maxTimeMS: 3000 });
    return { viewerId: String(actor._id), tab, page, hasMore: rows.length > limit, categories: [],
      items: rows.slice(0, limit).map(row => ({ ...person(row.person), following: true })) };
  }

  const aliases = [String(actor._id), actor.userID].filter(Boolean);
  const history = tab === 'history' ? await History.recent(actor._id) : [];
  const base = { ...PUBLIC, ...(tab === 'likes' ? { likedBy: { $in: aliases } } : { _id: { $in: history.map(e => e.songId) } }) };
  const categoryIds = await MP3.distinct('categoryId', base).maxTimeMS(3000);
  const categories = await CategoryModel.find({ _id: { $in: categoryIds.filter(Boolean) } }).select('nameCategory').sort({ nameCategory: 1 }).lean();
  const filter = { ...base, ...(categoryId ? { categoryId } : {}) };
  if (q) {
    const creators = await UserModel.find(peopleSearch(q)).select('_id userID').limit(200).maxTimeMS(3000).lean();
    filter.$or = [...searchFilter(q).$or, ...(creators.length ? [{ userID: { $in: creators.flatMap(u => [String(u._id), u.userID]).filter(Boolean) } }] : [])];
  }
  let rows;
  const order = sort === 'title' ? { name: 1, _id: 1 } : sort === 'artist' ? { artist: 1, name: 1, _id: 1 } : { createdAt: -1, _id: -1 };
  const find = () => MP3.find(filter).select(SELECT).populate('categoryId', 'nameCategory').maxTimeMS(3000).lean();
  if (tab === 'history') {
    const played = new Map(history.map(e => [String(e.songId), e.lastPlayedAt]));
    rows = await find().sort(order);
    rows.forEach(song => { song.lastPlayedAt = played.get(String(song._id)); });
    if (sort === 'recent') rows.sort((a, b) => new Date(b.lastPlayedAt) - new Date(a.lastPlayedAt) || String(a._id).localeCompare(String(b._id)));
    rows = rows.slice(skip, skip + limit + 1);
  } else rows = await find().sort(order).skip(skip).limit(limit + 1);
  const ownerIds = [...new Set(rows.map(s => s.userID).filter(Boolean))];
  const people = ownerIds.length ? await UserModel.find({ $or: [{ userID: { $in: ownerIds } }, { _id: { $in: ownerIds.filter(id => /^[a-f0-9]{24}$/i.test(id)) } }] })
    .select('_id userID fullName userName profileTag profileSlug imageAccount').maxTimeMS(3000).lean() : [];
  const byOwner = new Map();
  for (const user of people) { const profile = person(user); byOwner.set(String(user._id), profile); if (user.userID) byOwner.set(user.userID, profile); }
  return { viewerId: String(actor._id), tab, page, hasMore: rows.length > limit,
    categories: categories.map(c => ({ id: String(c._id), name: c.nameCategory })),
    items: rows.slice(0, limit).map(song => ({ ...formatSongSummary(song), id: String(song._id),
      image: safeImage(song.image, '/images/chibi.gif'), creator: byOwner.get(song.userID) || null,
      liked: (song.likedBy || []).some(id => aliases.includes(id)),
      ...(song.lastPlayedAt ? { lastPlayedAt: song.lastPlayedAt } : {}) })) };
};
