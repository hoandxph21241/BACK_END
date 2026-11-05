const Joi = require('joi');
const { MP3, UserModel } = require('../../../model/db_song');
const Follow = require('../../user/model/UserFollow');
const UserRepository = require('../../user/repository/UserRepository');
const { formatSongSummary, getImageUrl } = require('../../../utils/songResponse');
const ApiError = require('../../../utils/ApiError');
const Privacy = require('../../account/service/AccountPrivacyService');
const { Types } = MP3.base;
const PUBLIC = { isDeleted: { $ne: true }, isPublic: { $ne: false } };
const id = Joi.string().pattern(/^[a-f0-9]{24}$/i);
const querySchema = Joi.object({
  mode: Joi.string().valid('following', 'discover').default('discover'),
  sort: Joi.when('mode', { is: 'following', then: Joi.string().valid('newest').default('newest'),
    otherwise: Joi.string().valid('newest', 'popular').default('newest') }),
  categoryId: id.allow('').default(''),
  limit: Joi.number().integer().min(1).max(24).default(12),
  cursor: Joi.string().max(1024).allow('').default(''),
}).unknown(false);
const cursorSchema = Joi.object({
  v: Joi.number().valid(1).strict().required(), mode: Joi.string().required(), sort: Joi.string().required(),
  categoryId: Joi.string().required().allow(''), viewerId: id.allow(null).required(),
  id: id.required(), date: Joi.date().iso().allow(null).required(),
  plays: Joi.number().min(0).allow(null).required(), likes: Joi.number().min(0).allow(null).required(),
}).unknown(false);
const fail = (status, message) => new ApiError({ status, code: 'FEED_FAILED', message });
const number = value => Math.max(0, Number(value) || 0);
const image = (value, fallback) => {
  const source = getImageUrl(value);
  return typeof source === 'string' && (/^https?:\/\//i.test(source) || /^\/(?!\/)/.test(source)) ? source : fallback;
};

async function viewer(identifier, expectedOwner) {
  if (!identifier) return null;
  const user = await UserRepository.findByIdentifier(String(identifier)).select('_id userID').lean();
  if (!user) throw fail(401, 'Vui lòng đăng nhập lại.');
  if (expectedOwner && expectedOwner.toLowerCase() !== String(user._id)) throw fail(409, 'Tài khoản đã thay đổi. Vui lòng tải lại Feed.');
  return user;
}

async function followed(viewer) {
  if (!viewer) return [];
  return (await Follow.find({ follower: viewer._id }).select('followee').lean()).map(row => row.followee);
}

function readCursor(value, query, viewer) {
  if (!value) return null;
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error();
    const result = cursorSchema.validate(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    const cursor = result.value;
    if (result.error || cursor.mode !== query.mode || cursor.sort !== query.sort || cursor.categoryId !== query.categoryId
        || cursor.viewerId !== (viewer ? String(viewer._id) : null)) throw new Error();
    return cursor;
  } catch { throw fail(400, 'Mốc tải Feed không hợp lệ. Vui lòng làm mới danh sách.'); }
}

function nextCursor(song, query, viewer) {
  const date = song.createdAt instanceof Date && Number.isFinite(song.createdAt.getTime()) ? song.createdAt.toISOString() : null;
  return Buffer.from(JSON.stringify({ v: 1, mode: query.mode, sort: query.sort, categoryId: query.categoryId,
    viewerId: viewer ? String(viewer._id) : null, id: String(song._id), date,
    plays: Number.isFinite(song.playCount) ? song.playCount : null,
    likes: Number.isFinite(song.likeCount) ? song.likeCount : null })).toString('base64url');
}

function after(cursor, popular) {
  if (!cursor) return {};
  const olderId = { _id: { $lt: new Types.ObjectId(cursor.id) } };
  if (!popular) return { $or: [
    ...(cursor.date ? [{ createdAt: { $lt: cursor.date } }, { createdAt: null }] : []),
    { createdAt: cursor.date, ...olderId },
  ] };
  const less = (field, value) => [{ [field]: { $lt: value } }, { [field]: null }];
  return { $or: [
    ...(cursor.plays !== null ? less('playCount', cursor.plays) : []),
    ...(cursor.likes !== null ? less('likeCount', cursor.likes).map(condition => ({ playCount: cursor.plays, ...condition })) : []),
    { playCount: cursor.plays, likeCount: cursor.likes, ...olderId },
  ] };
}

function person(user, following, followers = 0) {
  return { id: String(user._id), name: user.fullName || user.userName || (user.profileTag ? '#' + user.profileTag : 'MediaHz'),
    profileUrl: require('../../../utils/profileUrl')(user),
    avatar: image(user.imageAccount, '/images/auth/person-circle.svg'), tag: user.profileTag || '',
    location: [user.city, user.country].filter(Boolean).join(', '), followers,
    following: following.has(String(user._id)) };
}

async function items(input, actor) {
  const result = querySchema.validate(input);
  if (result.error) throw fail(400, 'Bộ lọc Feed không hợp lệ.');
  const query = result.value;
  if (query.mode === 'following' && !actor) throw fail(401, 'Đăng nhập để xem nhạc từ người bạn theo dõi.');
  const cursor = readCursor(query.cursor, query, actor);
  // Previous: const ids = await followed(actor), following = new Set(ids.map(String));
  const blockedIds = actor ? await Privacy.excluded(actor._id) : [];
  const blockedSet = new Set(blockedIds.map(String));
  const ids = (await followed(actor)).filter(id => !blockedSet.has(String(id))), following = new Set(ids.map(String));
  const filters = [PUBLIC, after(cursor, query.sort === 'popular')];
  if (blockedIds.length) {
    const users = await UserModel.find({ _id: { $in: blockedIds } }).select('_id userID').lean();
    // Songs have used both the Mongo account ID and the public UUID as uploader keys.
    const aliases = [...blockedIds.map(String), ...users.map(user => user.userID).filter(Boolean)];
    filters.push({ userID: { $nin: aliases } });
  }
  if (query.categoryId) filters.push({ categoryId: new Types.ObjectId(query.categoryId) });
  if (query.mode === 'following') {
    const people = ids.length ? await UserModel.find({ _id: { $in: ids } }).select('_id userID').lean() : [];
    const aliases = people.flatMap(user => [String(user._id), user.userID]).filter(Boolean);
    if (!aliases.length) return { items: [], nextCursor: null, viewerId: String(actor._id), followingCount: ids.length };
    filters.push({ userID: { $in: aliases } });
  }
  const songs = await MP3.find({ $and: filters })
    .select('name artist image categoryId duration fileSize uploadDate createdAt profileSlug slug userID playCount likeCount +waveform')
    .populate('categoryId', 'nameCategory').sort(query.sort === 'popular' ? { playCount: -1, likeCount: -1, _id: -1 } : { createdAt: -1, _id: -1 })
    .limit(query.limit + 1).maxTimeMS(3000).lean();
  const page = songs.slice(0, query.limit), owners = [...new Set(page.map(song => song.userID).filter(Boolean))];
  const people = owners.length ? await UserModel.find({ $or: [{ userID: { $in: owners } },
    { _id: { $in: owners.filter(value => /^[a-f0-9]{24}$/i.test(value)) } }] })
    .select('_id userID fullName userName imageAccount profileTag profileSlug city country').lean() : [];
  const counts = people.length ? await Follow.aggregate([{ $match: { followee: { $in: people.map(user => user._id) } } },
    { $group: { _id: '$followee', count: { $sum: 1 } } }]) : [];
  const followers = new Map(counts.map(row => [String(row._id), row.count])), byOwner = new Map();
  for (const user of people) {
    const profile = person(user, following, followers.get(String(user._id)) || 0);
    byOwner.set(String(user._id), profile); if (user.userID) byOwner.set(user.userID, profile);
  }
  return { items: page.map(song => {
    const summary = formatSongSummary(song), waveform = song.waveform;
    const validWaveform = waveform?.duration > 0 && Array.isArray(waveform.peaks) && waveform.peaks.length === 480
      && waveform.peaks.every(value => Number.isFinite(value) && value >= 0 && value <= 255);
    return { ...summary, id: String(song._id), image: image(song.image, '/images/chibi.gif'),
      publishedAt: song.createdAt || summary.uploadDate, playCount: number(song.playCount), likeCount: number(song.likeCount),
      creator: byOwner.get(song.userID) || null,
      waveform: validWaveform ? { duration: waveform.duration, peaks: waveform.peaks } : null };
  }), nextCursor: songs.length > query.limit ? nextCursor(page.at(-1), query, actor) : null,
  viewerId: actor ? String(actor._id) : null, followingCount: ids.length };
}

async function creators(actor) {
  // Previous: const followingIds = await followed(actor), excluded = [...followingIds, ...(actor ? [actor._id] : [])];
  const followingIds = await followed(actor), blockedIds = actor ? await Privacy.excluded(actor._id) : [];
  // Aggregate pipelines do not cast string IDs as Mongoose find queries do.
  const excluded = [...followingIds, ...blockedIds.map(id => new Types.ObjectId(String(id))), ...(actor ? [actor._id] : [])];
  const rows = await MP3.aggregate([
    { $match: { ...PUBLIC, userID: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$userID', tracks: { $sum: 1 }, plays: { $sum: '$playCount' } } },
    { $lookup: { from: UserModel.collection.name, let: { owner: '$_id' }, pipeline: [
      { $match: { $expr: { $or: [{ $eq: ['$userID', '$$owner'] }, { $eq: [{ $toString: '$_id' }, '$$owner'] }] } } },
      { $project: { _id: 1, fullName: 1, userName: 1, imageAccount: 1, profileTag: 1, profileSlug: 1, city: 1, country: 1 } },
    ], as: 'person' } },
    { $unwind: '$person' },
    { $group: { _id: '$person._id', person: { $first: '$person' }, tracks: { $sum: '$tracks' }, plays: { $sum: '$plays' } } },
    { $match: { _id: { $nin: excluded } } },
    { $sort: { plays: -1, tracks: -1, _id: 1 } }, { $limit: 6 },
  ]).option({ maxTimeMS: 3000 });
  const counts = rows.length ? await Follow.aggregate([{ $match: { followee: { $in: rows.map(row => row._id) } } },
    { $group: { _id: '$followee', count: { $sum: 1 } } }]) : [];
  const followers = new Map(counts.map(row => [String(row._id), row.count]));
  return { items: rows.map(row => ({ ...person(row.person, new Set(), followers.get(String(row._id)) || 0),
    tracks: row.tracks })), viewerId: actor ? String(actor._id) : null };
}

module.exports = { viewer, items, creators };
