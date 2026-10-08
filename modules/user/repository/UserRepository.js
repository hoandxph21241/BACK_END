
const BaseRepository = require("../../../common/repository/BaseRepository");
const { UserModel } = require("../../../model/db_song");

class UserRepository extends BaseRepository {
  constructor() {
    super(UserModel);
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