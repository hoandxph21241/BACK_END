const { MP3, UserModel } = require('../model/db_song');
const { parseSearch, literalPattern } = require('./songSearch');
const { getImageUrl } = require('./songResponse');
const { songPath, validProfileSlug } = require('./permalink');
const profileUrl = require('./profileUrl');
const Privacy = require('../modules/account/service/AccountPrivacyService');

const publicSong = { isPublic: { $ne: false }, isDeleted: { $ne: true } };
const active = { $nin: ['deactivated', 'deletion-pending'] };
const safeImage = (value, fallback) => {
  const url = getImageUrl(value);
  return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? url : fallback;
};
const match = (field, regex) => ({ $regexMatch: { input: { $ifNull: ['$' + field, ''] }, regex, options: 'i' } });
function rank(fields, pattern) {
  return { $switch: { branches: fields.flatMap((field, i) => [
    { case: match(field, '^' + pattern + '$'), then: i * 3 },
    { case: match(field, '^' + pattern), then: i * 3 + 1 },
    { case: match(field, pattern), then: i * 3 + 2 },
  ]), default: 999 } };
}

exports.get = async function (query, viewerId) {
  if (Object.keys(query).some(key => key !== 'q')) throw Object.assign(new Error('Invalid suggestion query.'), { status: 400 });
  const { q } = parseSearch(query);
  if (q.length < 2) return { q, tracks: [], people: [] };
  const pattern = literalPattern(q.replace(/^#/, ''));
  if (!pattern || q.replace(/^#/, '').length < 2) return { q, tracks: [], people: [] };
  const excluded = viewerId ? await Privacy.excluded(viewerId) : [];
  const blocked = excluded.map(id => new UserModel.base.Types.ObjectId(id));
  const names = ['fullName', 'userName', 'profileSlug', 'profileTag'];
  const usersCollection = UserModel.collection.name;
  const [matchingUsers, hiddenUsers] = await Promise.all([
    UserModel.aggregate([
      { $match: { accountStatus: active, _id: { $nin: blocked },
        $or: names.map(field => ({ [field]: { $regex: pattern, $options: 'i' } })) } },
      { $project: { fullName: 1, userName: 1, userID: 1, imageAccount: 1, profileSlug: 1, profileTag: 1 } },
      { $set: { _rank: rank(names, pattern) } }, { $sort: { _rank: 1, _id: 1 } },
    ]).option({ maxTimeMS: 3000 }),
    UserModel.find({ $or: [{ _id: { $in: blocked } },
      { accountStatus: { $in: ['deactivated', 'deletion-pending'] } }] })
      .select('_id userID').maxTimeMS(3000).lean(),
  ]);
  const aliases = users => users.flatMap(user => [String(user._id), user.userID]).filter(Boolean);
  const tracks = await MP3.aggregate([
      // Previous per-track uploader joins preceded matching and timed out on
      // large catalogues. Resolve aliases once, filter and rank before joining.
      { $match: { ...publicSong, userID: { $nin: aliases(hiddenUsers) }, $or: [
        { name: { $regex: pattern, $options: 'i' } }, { artist: { $regex: pattern, $options: 'i' } },
        { userID: { $in: aliases(matchingUsers) } },
      ] } },
      // Aggregation ignores schema select:false; discard audio, waveform and
      // private arrays before joining/ranking, including legacy inline MP3 data.
      { $project: { name: 1, artist: 1, userID: 1, profileSlug: 1, slug: 1,
        'image.url': 1, 'image.display_url': 1, 'image.thumb.url': 1 } },
      { $set: { _rank: { $min: [rank(['name', 'artist'], pattern), 6] },
        _length: { $strLenCP: { $ifNull: ['$name', ''] } } } },
      { $sort: { _rank: 1, _length: 1, _id: 1 } }, { $limit: 5 },
      // Both legacy UUID owners and canonical ObjectId-string owners are in use.
      // Separate indexed lookups avoid a per-track unindexed $toString user scan.
      { $set: { _ownerId: { $convert: { input: '$userID', to: 'objectId', onError: null, onNull: null } } } },
      { $lookup: { from: usersCollection, localField: '_ownerId', foreignField: '_id', as: '_byId',
        pipeline: [{ $project: { fullName: 1, userName: 1, profileSlug: 1, profileTag: 1, accountStatus: 1 } }] } },
      { $lookup: { from: usersCollection, localField: 'userID', foreignField: 'userID', as: '_byAlias',
        pipeline: [{ $project: { fullName: 1, userName: 1, profileSlug: 1, profileTag: 1, accountStatus: 1 } }] } },
      { $set: { _owner: { $ifNull: [{ $arrayElemAt: ['$_byId', 0] }, { $arrayElemAt: ['$_byAlias', 0] }] } } },
      { $project: { name: 1, artist: 1, profileSlug: 1, slug: 1, 'image.url': 1,
        'image.display_url': 1, 'image.thumb.url': 1, '_owner.fullName': 1, '_owner.userName': 1 } },
    ]).option({ maxTimeMS: 3000 });
  return { q, tracks: tracks.map(song => ({ id: String(song._id), name: song.name,
    artist: song.artist || song._owner?.fullName || song._owner?.userName || 'Unknown',
    image: safeImage(song.image, '/images/chibi.gif'),
    url: songPath(song) || '/home/song/' + song._id })),
  people: matchingUsers.filter(person => validProfileSlug(person.profileSlug)).slice(0, 3).map(person => ({
    id: String(person._id), name: person.fullName || person.userName || 'MediaHz',
    tag: person.profileTag ? '#' + person.profileTag : '', url: profileUrl(person),
    image: safeImage(person.imageAccount, '/images/auth/person-circle.svg'),
  })) };
};
