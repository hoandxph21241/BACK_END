const BaseRepository = require("../../../common/repository/BaseRepository");
const { UserModel } = require("../../../model/db_song");

class AuthRepository extends BaseRepository {
  constructor() {
    super(UserModel);
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return this.model.findOne({
      email: email?.trim().toLowerCase(),
    });
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    return this.model.findOne({
      username: username?.trim(),
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(id) {
    return this.model.findById(id);
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId) {
    return this.model.findOne({
      googleId,
    });
  }

  /**
   * Find user by reset password token
   */
  async findByResetToken(token) {
    return this.model.findOne({
      resetPasswordToken: token,
    });
  }

  /**
   * Find user by refresh token
   */
  async findByRefreshToken(refreshToken) {
    return this.model.findOne({
      refreshToken,
    });
  }

  /**
   * Update refresh token
   */
  async updateRefreshToken(id, refreshToken) {
    return this.model.findByIdAndUpdate(
      id,
      {
        refreshToken,
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /**
   * Clear refresh token
   */
  async clearRefreshToken(id) {
    return this.model.findByIdAndUpdate(
      id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      },
    );
  }
}

module.exports = new AuthRepository();
