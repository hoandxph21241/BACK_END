
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
      bannerImage: user.bannerImage || '',
      profileTag: user.profileTag || '',
      bio: user.bio || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      city: user.city || '',
      country: user.country || '',
      links: (user.links || []).map(link => ({ label: link.label || '', url: link.url })),
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
