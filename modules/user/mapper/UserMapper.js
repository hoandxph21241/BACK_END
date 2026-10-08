
class UserMapper {
  static summary(user) {
    if (!user) return null;

    return {
      id: user._id,
      userID: user.userID,
      userName: user.userName,
      fullName: user.fullName,
      imageAccount: user.imageAccount,
      role: user.role,
    };
  }

  static profile(user) {
    if (!user) return null;

    return {
      id: user._id,
      userID: user.userID,
      userName: user.userName,
      fullName: user.fullName,
      gmail: user.gmail,
      imageAccount: user.imageAccount,
      grender: user.grender,
      role: user.role,
    };
  }

  static detail(user) {
    return this.profile(user);
  }

  static list(users) {
    return users.map((user) => this.summary(user));
  }
}

module.exports = UserMapper;