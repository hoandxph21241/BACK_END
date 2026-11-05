const Joi = require("joi");
const UserRepository = require("../repository/UserRepository");
const { MP3 } = require("../../../model/db_song");
const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");

const updateSchema = Joi.object({
  currentSongId: Joi.string().pattern(/^[a-f0-9]{24}$/i).lowercase().allow(null).required(),
}).required();

class PlayerStateService {
  async actor(identifier, expectedOwner) {
    // Previous projection did not include the account's song-memory policy.
    const user = await UserRepository.findByIdentifier(identifier).select("_id userID currentSongId rememberSongEnabled").lean();
    if (!user) throw new ApiError(ErrorCode.USER.NOT_FOUND);
    if (expectedOwner && expectedOwner !== String(user._id)) {
      throw new ApiError({ status: 409, code: "PLAYER_ACCOUNT_CHANGED", message: "The signed-in account has changed." });
    }
    return user;
  }

  state(user, songId = user.currentSongId) {
    // Previous: always return the selected track, even after memory was disabled.
    return { userId: String(user._id), currentSongId: user.rememberSongEnabled !== false && songId ? String(songId) : null };
  }

  async get(identifier, expectedOwner) {
    const user = await this.actor(identifier, expectedOwner);
    if (user.currentSongId && !await this.songExists(user, user.currentSongId)) {
      // Do not clear a newer selection made while this read was checking the old song.
      const result = await UserRepository.clearPlayerIfSelected(user._id, user.currentSongId);
      if (!result.matchedCount) return this.state(await this.actor(identifier, expectedOwner));
      return this.state(user, null);
    }
    return this.state(user);
  }

  async songExists(user, songId) {
    const owners = [String(user._id), user.userID].filter(Boolean);
    return Boolean(await MP3.exists({ _id: songId, isDeleted: { $ne: true },
      $or: [{ isPublic: { $ne: false } }, { userID: { $in: owners } }],
    }));
  }

  async update(identifier, body, expectedOwner) {
    const { error, value } = updateSchema.validate(body, { abortEarly: false });
    if (error) throw new ApiError({ ...ErrorCode.VALIDATION.FAILED, message: error.details.map(item => item.message).join(", ") });
    const user = await this.actor(identifier, expectedOwner);
    if(user.rememberSongEnabled === false)return this.state(user,null);
    if (value.currentSongId && !await this.songExists(user, value.currentSongId)) throw new ApiError(ErrorCode.SONG.NOT_FOUND);
    const result = await UserRepository.updatePlayer(user._id, value.currentSongId);
    if (!result.matchedCount) {
      // A concurrent preference update may have disabled song memory, not deleted the account.
      const fresh=await this.actor(identifier,expectedOwner);
      if(fresh.rememberSongEnabled===false)return this.state(fresh,null);
      throw new ApiError(ErrorCode.USER.NOT_FOUND);
    }
    return this.state(user, value.currentSongId);
  }
}

module.exports = new PlayerStateService();
