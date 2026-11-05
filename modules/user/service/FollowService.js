const Joi = require('joi');
const Follow = require('../model/UserFollow');
const UserRepository = require('../repository/UserRepository');
const { UserModel } = require('../../../model/db_song');
const ApiError = require('../../../utils/ApiError');
const Privacy = require('../../account/service/AccountPrivacyService');

const isId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const failure = (status, message) => new ApiError({ status, code: 'FOLLOW_FAILED', message });
const input = Joi.object({ following: Joi.boolean().strict().required() }).unknown(false).required();

async function identities(id, identifier, expectedOwner) {
  if (!isId(id)) throw failure(400, 'Người đăng không hợp lệ.');
  if (!await UserModel.exists({ _id: id })) throw failure(404, 'Không tìm thấy người đăng.');
  const actor = identifier ? await UserRepository.findByIdentifier(identifier).select('_id').lean() : null;
  if (identifier && !actor) throw failure(401, 'Vui lòng đăng nhập lại.');
  if (expectedOwner && expectedOwner !== String(actor?._id)) {
    throw failure(409, 'Tài khoản đã thay đổi. Vui lòng thử lại.');
  }
  return actor;
}

async function state(id, actor) {
  const [followers, relation] = await Promise.all([
    Follow.countDocuments({ followee: id }),
    actor ? Follow.exists({ follower: actor._id, followee: id }) : null,
  ]);
  return { creatorId: id, userId: actor ? String(actor._id) : null,
    followers, following: Boolean(relation), isSelf: Boolean(actor && String(actor._id) === id) };
}

exports.get = async (id, identifier) => {
  const actor = await identities(id, identifier);
  return state(id.toLowerCase(), actor);
};
exports.update = async (id, identifier, body, expectedOwner) => {
  const { error, value } = input.validate(body);
  if (error) throw failure(400, 'Trạng thái theo dõi phải là true hoặc false.');
  if (!identifier) throw failure(401, 'Vui lòng đăng nhập để theo dõi.');
  const actor = await identities(id, identifier, expectedOwner);
  id = id.toLowerCase();
  if (String(actor._id) === id) throw failure(400, 'Bạn không thể theo dõi chính mình.');
  const relation = { follower: actor._id, followee: id };
  if (value.following) {
    await Privacy.assertFollow(actor._id, id);
    await Follow.init();
    let created = false, eventId;
    // Previous: try { await Follow.updateOne(relation, { $setOnInsert: relation }, { upsert: true }); }
    try {
      const result = await Follow.updateOne(relation, { $setOnInsert: relation }, { upsert: true });
      created = result.upsertedCount === 1; eventId = result.upsertedId;
    }
    catch (error) { if (error.code !== 11000) throw error; }
    try { await Privacy.assertFollow(actor._id, id); }
    catch (error) {
      if (error.status === 403) await Follow.deleteOne(relation);
      throw error;
    }
    if (created) {
      try {
        await require('../../account/service/AccountNotificationService').publish({
          owner: id, actor: actor._id, type: 'follows', title: 'New follower',
          message: 'You have a new follower.',
          url: require('../../../utils/profileUrl')(await UserModel.findById(actor._id).select('profileSlug').lean()) || '/feed',
          dedupeKey: 'follow:' + eventId,
        });
      } catch (_) { /* A notification failure must not undo the follow. */ }
    }
  } else await Follow.deleteOne(relation);
  return state(id, actor);
};
