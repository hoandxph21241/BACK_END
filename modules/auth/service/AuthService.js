const TokenBlacklistService = require("./TokenBlacklistService");
const JwtService = require("./JwtService");
const PasswordService = require("./PasswordService");

class AuthService {
  async login(req) {
    const { nameAccount, namePassword } = req.body;

    const user = await UserRepository.findByAccount(nameAccount);

    if (!user) throw new ApiError(ErrorCode.AUTH.ACCOUNT_NOT_FOUND);

    const matched = await PasswordService.compare(
      namePassword,
      user.namePassword,
    );

    if (!matched) throw new ApiError(ErrorCode.AUTH.INVALID_PASSWORD);

    const tokens = await SessionService.createSession(
      user,
      req.headers["user-agent"],
    );

    return UserMapper.toLoginResponse(user, tokens);
  }

  async register(data) {
    const { nameAccount, namePassword, gmail, fullName } = data;

    await UserService.checkAccountExists(nameAccount);

    const password = await PasswordService.hash(namePassword);

    const user = await UserService.create({
      userID: crypto.randomUUID(),
      nameAccount,
      namePassword: password,
      gmail,
      fullName,
      role: UserRole.USER,
    });

    const tokens = await SessionService.createSession(user);

    return UserMapper.toLoginResponse(user, tokens);
  }

  async refreshToken(refreshToken) {
    return await SessionService.refreshSession(refreshToken);
  }

  async logout(refreshToken) {
    await SessionService.removeSession(refreshToken);
    const payload = JwtService.verify(accessToken);
    TokenBlacklistService.add(
      accessToken,
      payload.exp * 1000,
    );
    return {
      success: true,
    };
  }
  async logoutAll(userId) {
    const user = await UserService.getById(userId);

    user.refreshTokens = [];

    await UserService.save(user);
  }

  async googleCallback(profile) {
    const user = await GoogleAuthService.authenticate(profile);
    const tokens = await SessionService.createSession(user);
    return UserMapper.toLoginResponse(user, tokens);
  }

  async profile(userId) {
    const user = await UserService.getById(userId);
    return UserMapper.toProfile(user);
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await UserService.getById(userId);

    const matched = await PasswordService.compare(
      oldPassword,
      user.namePassword,
    );

    if (!matched) {
      throw new ApiError(ErrorCode.AUTH_INVALID_PASSWORD);
    }

    user.namePassword = await PasswordService.hash(newPassword);

    user.refreshTokens = [];

    await UserService.save(user);
  }

  async revokeToken(refreshToken) {
    return SessionService.removeSession(refreshToken);
  }

  async verifyAccessToken(token) {
    return JwtService.verify(token);
  }

  async verifyRefreshToken(token) {
    const blacklist = TokenBlacklistService.exists(token);

    if (blacklist) {
      throw new ApiError(ErrorCode.AUTH_INVALID_TOKEN);
    }
    return SessionService.verify(token);
  }
}
