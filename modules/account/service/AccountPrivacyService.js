const Block = require('../model/AccountBlock');
const Follow = require('../../user/model/UserFollow');
const { UserModel } = require('../../../model/db_song');
const profileUrl = require('../../../utils/profileUrl');
const failure = (status, message) => Object.assign(new Error(message), { status });

function id(value) {
  // Accept actual ObjectIds at internal boundaries, never arbitrary coerced input.
  if (value instanceof UserModel.base.Types.ObjectId) return value.toHexString();
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) throw failure(400, 'Tài khoản không hợp lệ.');
  return value.toLowerCase();
}
async function owner(value) {
  const userId = id(value);
  if (!await UserModel.exists({ _id: userId })) throw failure(404, 'Không tìm thấy tài khoản.');
  return userId;
}
async function pair(a, b) {
  const sender = id(a), recipient = id(b);
  if (sender === recipient) throw failure(400, 'Bạn không thể thực hiện thao tác này với chính mình.');
  await Promise.all([owner(sender), owner(recipient)]);
  return [sender, recipient];
}
const relation = (a, b) => ({ $or: [{ owner: a, target: b }, { owner: b, target: a }] });
const isBlocked = async (a, b) => Boolean(await Block.exists(relation(a, b)));
function avatar(value) {
  return typeof value === 'string' && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value))
    ? value : '/images/auth/person-circle.svg';
}
async function list(userId) {
  userId = await owner(userId);
  const rows = await Block.find({ owner: userId }).select('target').sort({ createdAt: -1, _id: -1 })
    .populate('target', '_id fullName userName imageAccount profileTag profileSlug').lean();
  return rows.filter(row => row.target?._id).map(({ target }) => ({
    id: String(target._id), name: target.fullName || target.userName || (target.profileTag ? '#' + target.profileTag : 'MediaHz'),
    avatar: avatar(target.imageAccount), tag: target.profileTag || '', profileUrl: profileUrl(target),
  }));
}
async function set(userId, targetId, blocked) {
  if (typeof blocked !== 'boolean') throw failure(400, 'Trạng thái chặn phải là true hoặc false.');
  const [a, b] = await pair(userId, targetId);
  if (blocked) {
    await Block.init();
    try { await Block.updateOne({ owner: a, target: b }, { $setOnInsert: { owner: a, target: b } }, { upsert: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
    // Store the policy first: a failure clearing stale edges must never permit mail/follows.
    await Follow.deleteMany({ $or: [{ follower: a, followee: b }, { follower: b, followee: a }] });
  } else await Block.deleteOne({ owner: a, target: b });
  return list(a);
}
async function blocked(a, b) {
  [a, b] = await pair(a, b);
  return isBlocked(a, b);
}
async function assertFollow(senderId, targetId) {
  const [a, b] = await pair(senderId, targetId);
  if (await isBlocked(a, b)) throw failure(403, 'Không thể theo dõi tài khoản này.');
}
async function assertMessage(senderId, recipientId) {
  const [a, b] = await pair(senderId, recipientId);
  if (await isBlocked(a, b)) throw failure(403, 'Không thể gửi thư cho tài khoản này.');
  // Read at send/search time so replies and direct recipient IDs obey current settings.
  const preferences = await require('./AccountPreferencesService').get(b);
  const mode = preferences?.privacy?.messages || 'everyone';
  if (mode === 'everyone') return;
  if (mode === 'following' && await Follow.exists({ follower: b, followee: a })) return;
  throw failure(403, 'Không thể gửi thư cho tài khoản này.');
}
async function excluded(userId) {
  userId = await owner(userId);
  const rows = await Block.find({ $or: [{ owner: userId }, { target: userId }] }).select('owner target').lean();
  return [...new Set(rows.map(row => String(row.owner) === userId ? String(row.target) : String(row.owner)))];
}
async function resolveTarget(value) {
  if(typeof value!=='string'||value.length>80)throw failure(400,'Invalid public account name.');
  const term=value.trim().toLowerCase();
  if(/^[a-f0-9]{24}$/.test(term)&&await UserModel.exists({_id:term}))return term;
  const filter=/^#?hz\d{3,12}$/.test(term)?{profileTag:term.replace(/^#/,'')}
    :/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(term)?{profileSlug:term}:null;
  if(!filter)throw failure(400,'Enter a profile name or #tag.');
  const target=await UserModel.findOne(filter).select('_id').lean();
  if(!target)throw failure(404,'Account not found.');
  return String(target._id);
}
async function search(userId,input) {
  userId=await owner(userId);
  if(typeof input!=='string'||input.trim().length<2||input.length>80)throw failure(400,'Enter at least two characters.');
  const term=input.trim().normalize('NFC').replace(/^#/,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const prefix=new RegExp('^'+term,'i');
  const targets=input.trim().startsWith('#')?[{profileTag:prefix}]:[{profileTag:prefix},{profileSlug:prefix},{fullName:new RegExp(term,'i')},{userName:prefix}];
  // Blocking is independent from permission to send mail; public account names stay discoverable.
  const users=await UserModel.find({_id:{$ne:userId},$or:targets}).select('_id fullName userName imageAccount profileTag profileSlug').sort({fullName:1,_id:1}).limit(8).maxTimeMS(1500).lean();
  return users.map(target=>({id:String(target._id),name:target.fullName||target.userName||'MediaHz',avatar:avatar(target.imageAccount),tag:target.profileTag||'',profileUrl:profileUrl(target)}));
}

module.exports = { list, set, blocked, assertMessage, assertFollow, excluded, resolveTarget, search };
