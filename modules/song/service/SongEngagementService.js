const { MP3 } = require("../../../model/db_song");
const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");
const SELECT = "playCount likeCount +likedBy";
function validId(id) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) throw new ApiError(ErrorCode.SONG.NOT_FOUND);
}
function result(song, userId) {
  if (!song) throw new ApiError(ErrorCode.SONG.NOT_FOUND);
  return { songId: String(song._id), playCount: Number(song.playCount) || 0,
    likeCount: Number(song.likeCount) || 0, liked: Boolean(userId && song.likedBy?.includes(String(userId))) };
}
class SongEngagementService {
  async getStats(id, userId) {
    validId(id);
    return result(await MP3.findById(id).select(SELECT).lean(), userId);
  }
  async recordListen(id, playbackId, userId) {
    validId(id);
    if (typeof playbackId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(playbackId)) {
      throw new ApiError(ErrorCode.VALIDATION.INVALID);
    }
    playbackId = playbackId.toLowerCase();
    // Atomic deduplication for the latest 256 playback requests, including retries.
    const song = await MP3.findOneAndUpdate({ _id: id, recentPlayIds: { $ne: playbackId } }, {
      $inc: { playCount: 1 }, $push: { recentPlayIds: { $each: [playbackId], $slice: -256 } },
    }, { new: true }).select(SELECT).lean();
    return song ? result(song, userId) : this.getStats(id, userId);
  }
  async setLike(id, userId, liked) {
    validId(id);
    if (!userId) throw new ApiError(ErrorCode.AUTH.UNAUTHORIZED);
    if (typeof liked !== "boolean") throw new ApiError(ErrorCode.VALIDATION.INVALID);
    const existing = { $ifNull: ["$likedBy", []] };
    const likedBy = liked
      ? { $setUnion: [existing, { $literal: [String(userId)] }] }
      : { $filter: { input: existing, as: "user", cond: { $ne: ["$$user", { $literal: String(userId) }] } } };
    // Keep membership and the count in one atomic document update (no transaction required).
    const song = await MP3.findByIdAndUpdate(id, [
      { $set: { likedBy } }, { $set: { likeCount: { $size: "$likedBy" } } },
    ], { new: true }).select(SELECT).lean();
    return result(song, userId);
  }
}
module.exports = new SongEngagementService();