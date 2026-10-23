const BaseRepository = require("../../../common/repository/BaseRepository");
const { UserModel } = require("../../../model/db_song");

class UserRepository extends BaseRepository {
  constructor() {
    super(UserModel);
  }

  async create(data) {
    // Previous inherited create(data): return this.model.create(data).
    return require('../../../utils/permalinkService').createUser(data, value => super.create(value));
  }

  findByAccount(nameAccount) {
    return this.model.findOne({
      nameAccount: nameAccount?.trim(),
    });
  }

  findByUserID(userID) {
    return this.model.findOne({ userID });
  }

  findByGmail(gmail) {
    return this.model.findOne({
      gmail: gmail?.trim().toLowerCase(),
    });
  }

  findByIdentifier(identifier) {
    return this.model.findOne({
      $or: [
        { userID: identifier },
        ...(this.model.base.Types.ObjectId.isValid(identifier)
          ? [{ _id: identifier }]
          : []),
      ],
    });
  }

  findByRefreshToken(refreshToken) {
    return this.model.findOne({
      "refreshTokens.token": refreshToken,
    });
  }

  updatePlayer(userId, songId) {
    return this.model.updateOne({ _id: userId }, { $set: { currentSongId: songId } }, { runValidators: true });
  }

  clearPlayerIfSelected(userId, songId) {
    return this.model.updateOne({ _id: userId, currentSongId: songId }, { $set: { currentSongId: null } });
  }

  async findAllUsers({ page = 1, limit = 20 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const [users, total] = await Promise.all([
      this.model
        .find({})
        .select("-namePassword -refreshTokens")
        .sort({ _id: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      this.model.countDocuments({}),
    ]);

    return {
      users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}

module.exports = new UserRepository();
