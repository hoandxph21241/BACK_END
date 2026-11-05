const { MP3 } = require("../../../model/db_song");
const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");
const SELECT = "playCount likeCount +likedBy";
const UserRepository = require('../../user/repository/UserRepository');
const aliasesFor = actor => actor ? [String(actor._id), actor.userID].filter(Boolean) : [];
function validId(id) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) throw new ApiError(ErrorCode.SONG.NOT_FOUND);
}
function result(song, userId) {
  if (!song) throw new ApiError(ErrorCode.SONG.NOT_FOUND);
  return { songId: String(song._id), playCount: Number(song.playCount) || 0,
    // Previous: only compared the authenticated UUID, missing legacy Mongo-ID likes.
    likeCount: Number(song.likeCount) || 0, liked: (Array.isArray(userId) ? userId : userId ? [String(userId)] : []).some(id => song.likedBy?.includes(id)) };
}
class SongEngagementService {
  async getStats(id, userId) {
    validId(id);
    // Previous: return result(await MP3.findById(id).select(SELECT).lean(), userId);
    const actor = userId ? await UserRepository.findByIdentifier(String(userId)).select('_id userID').lean() : null;
    return result(await MP3.findById(id).select(SELECT).lean(), aliasesFor(actor));
  }
  // Previous: async recordListen(id, playbackId, userId)
  async recordListen(id, playbackId, userId, expectedOwner) {
    validId(id);
    if (typeof playbackId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(playbackId)) {
      throw new ApiError(ErrorCode.VALIDATION.INVALID);
    }
    playbackId = playbackId.toLowerCase();
    const actor = userId ? await UserRepository.findByIdentifier(String(userId)).select('_id userID').lean() : null;
    if (userId && !actor) throw new ApiError(ErrorCode.AUTH.UNAUTHORIZED);
    const owner = actor ? String(actor._id) : 'guest';
    const changedOwner = () => new ApiError({ status: 409, code: 'LISTEN_OWNER_CHANGED', message: 'Tài khoản của lượt nghe đã thay đổi.' });
    if (expectedOwner && expectedOwner !== owner) throw changedOwner();
    const publicSong = { _id: id, isPublic: { $ne: false }, isDeleted: { $ne: true } };
    const receipt = { playbackId, owner, acceptedAt: new Date() };
    // Atomic deduplication for the latest 256 playback requests, including retries.
    // Previous update only kept recentPlayIds, so retries could change the history owner.
    let song = await MP3.findOneAndUpdate({ ...publicSong, recentPlayIds: { $ne: playbackId } }, {
      $inc: { playCount: 1 }, $push: { recentPlayIds: { $each: [playbackId], $slice: -256 },
        recentPlayOwners: { $each: [receipt], $slice: -256 } },
    }, { new: true }).select(SELECT + ' +recentPlayOwners').lean();
    if (!song) song = await MP3.findOne(publicSong).select(SELECT + ' +recentPlayOwners').lean();
    if (!song) throw new ApiError(ErrorCode.SONG.NOT_FOUND);
    const original = song.recentPlayOwners?.find(r => r.playbackId === playbackId);
    if (original && original.owner !== owner) throw changedOwner();
    // Previous: return song ? result(song, userId) : this.getStats(id, userId);
    // A retry can repair a history write after the counter already accepted its playback ID.
    // Legacy deduped IDs have no trustworthy owner receipt: never invent personal history for them.
    if (userId && original) await require('../../home/service/ListeningHistoryService').record(userId, id, original.acceptedAt);
    return result(song, aliasesFor(actor));
  }
  // Previous signature: setLike(id, userId, liked).
  async setLike(id, userId, liked, expectedOwner) {
    validId(id);
    if (!userId) throw new ApiError(ErrorCode.AUTH.UNAUTHORIZED);
    if (typeof liked !== "boolean") throw new ApiError(ErrorCode.VALIDATION.INVALID);
    const actor = await UserRepository.findByIdentifier(String(userId)).select('_id userID').lean();
    if (!actor) throw new ApiError(ErrorCode.AUTH.UNAUTHORIZED);
    if (expectedOwner && expectedOwner !== String(actor._id)) throw new ApiError({ status: 409, code: 'LIKE_OWNER_CHANGED', message: 'Your account has changed. Please refresh.' });
    const aliases = aliasesFor(actor);
    const existing = { $ifNull: ["$likedBy", []] };
    // Remove both aliases before storing a single membership for this account.
    const others = { $filter: { input: existing, as: 'user', cond: { $not: [{ $in: ['$$user', { $literal: aliases }] }] } } };
    // Previous membership expressions (left legacy Mongo-ID membership behind):
    // liked ? { $setUnion: [existing, { $literal: [String(userId)] }] }
    //   : { $filter: { input: existing, as: "user", cond: { $ne: ["$$user", { $literal: String(userId) }] } } };
    const likedBy = liked
      ? { $setUnion: [others, { $literal: [actor.userID || String(actor._id)] }] }
      : others;
    // Keep membership and the count in one atomic document update (no transaction required).
    // Previous: findByIdAndUpdate also allowed likes on hidden/deleted songs.
    const song = await MP3.findOneAndUpdate({ _id: id, isPublic: { $ne: false }, isDeleted: { $ne: true } }, [
      { $set: { likedBy } }, { $set: { likeCount: { $size: "$likedBy" } } },
    ], { new: true }).select(SELECT).lean();
    return result(song, aliases);
  }
}
module.exports = new SongEngagementService();
