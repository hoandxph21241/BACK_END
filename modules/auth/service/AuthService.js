const crypto = require("crypto");
const AuthValidator = require("../validator/AuthValidator");

const TokenBlacklistService = require("./TokenBlacklistService");
const JwtService = require("./JwtService");
const PasswordService = require("./PasswordService");
const SessionService = require("./SessionService");
const UserService = require("../../user/service/UserService");
const GoogleAuthService = require("./GoogleAuthService");

const UserRepository = require("../../user/repository/UserRepository");
const UserMapper = require("../mapper/UserMapper");

const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");
class AuthService {
  getSessionContext(req) {
    return {
      browserId: req?.authBrowserId,
      previousToken: req?.session?.authTokens?.refreshToken,
    };
  }

  getDevice(req) {
    return req?.headers?.["user-agent"] || "Unknown Device";
  }

  // async login(req) {
  //   const { nameAccount, namePassword } = req.body;

  //   const user = await UserRepository.findByAccount(nameAccount);

  //   if (!user) throw new ApiError(ErrorCode.AUTH.ACCOUNT_NOT_FOUND);

  //   const matched = await PasswordService.compare(
  //     namePassword,
  //     user.namePassword,
  //   );

  //   if (!matched) throw new ApiError(ErrorCode.AUTH.INVALID_PASSWORD);

  //   const tokens = await SessionService.createSession(
  //     user,
  //     req.headers["user-agent"],
  //   );

  //   return UserMapper.toLoginResponse(user, tokens);
  // }

// Previous login/register implementations retained for reference.
  //   async login(req) {
  //     const { nameAccount, namePassword } = req.body;
  //
  //     const user = await UserRepository.findByAccount(nameAccount);
  //
  //     if (!user) {
  //       throw new ApiError(ErrorCode.AUTH.ACCOUNT_NOT_FOUND);
  //     }
  //
  //     const matched = await PasswordService.compare(
  //       namePassword,
  //       user.namePassword,
  //     );
  //
  //     if (!matched) {
  //       throw new ApiError(ErrorCode.AUTH.INVALID_PASSWORD);
  //     }
  //
  //     const tokens = await SessionService.createSession(
  //       user,
  //       this.getDevice(req),
  //     );
  //
  //     return UserMapper.toLoginResponse(user, tokens);
  //   }
  //
  //   // async register(data) {
  //   //   const { nameAccount, namePassword, gmail, fullName } = data;
  //
  //   //   await UserService.checkAccountExists(nameAccount);
  //
  //   //   const password = await PasswordService.hash(namePassword);
  //
  //   //   const user = await UserService.create({
  //   //     userID: crypto.randomUUID(),
  //   //     nameAccount,
  //   //     namePassword: password,
  //   //     gmail,
  //   //     fullName,
  //   //     role: 1,
  //   //   });
  //
  //   //   const tokens = await SessionService.createSession(user);
  //
  //   //   return UserMapper.toLoginResponse(user, tokens);
  //   // }
  //
  //   async register(data, req) {
  //     const { nameAccount, namePassword, gmail, fullName } = data;
  //
  //     await UserService.checkAccountExists(nameAccount);
  //
  //     const password = await PasswordService.hash(namePassword);
  //
  //     const user = await UserService.create({
  //       userID: crypto.randomUUID(),
  //       nameAccount,
  //       namePassword: password,
  //       gmail,
  //       fullName,
  //       role: 1,
  //     });
  //
  //     const tokens = await SessionService.createSession(
  //       user,
  //       this.getDevice(req),
  //     );
  //
  //     return UserMapper.toLoginResponse(user, tokens);
  //   }

  // Previous: async login(req, options = {})
  async login(req) {
    const { nameAccount, namePassword } = AuthValidator.login(req.body);
    // Previous: const user = await UserRepository.findByAccount(nameAccount);
    let user = await UserRepository.findByAccount(nameAccount);
    if (!user) throw new ApiError(ErrorCode.AUTH.ACCOUNT_NOT_FOUND);

    const storedPassword = user.namePassword;
    const isHash = typeof storedPassword === "string" &&
      /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(storedPassword);
    let matched = false;
    if (isHash) {
      matched = await PasswordService.compare(namePassword, storedPassword);
    } else if (typeof storedPassword === "string" && storedPassword &&
               !storedPassword.startsWith("$2")) {
      // Upgrade old web passwords only after a successful exact comparison.
      const supplied = Buffer.from(namePassword, "utf8");
      const stored = Buffer.from(storedPassword, "utf8");
      matched = supplied.length === stored.length &&
        crypto.timingSafeEqual(supplied, stored);
    }
    if (!matched) throw new ApiError(ErrorCode.AUTH.INVALID_PASSWORD);

    if (!isHash && Buffer.byteLength(namePassword, "utf8") > 72) {
      throw new ApiError({
        ...ErrorCode.VALIDATION.FAILED,
        message: "Mật khẩu cũ vượt quá 72 byte. Vui lòng liên hệ hỗ trợ để đặt lại mật khẩu.",
      });
    }
    if (!isHash || !user.userID) {
      // Previous migration could overwrite a concurrent password reset:
      // if (!isHash) user.namePassword = await PasswordService.hash(namePassword);
      // if (!user.userID) user.userID = crypto.randomUUID();
      // await user.save();
      const changes = {};
      if (!isHash) changes.namePassword = await PasswordService.hash(namePassword);
      if (!user.userID) changes.userID = crypto.randomUUID();
      user = await UserRepository.model.findOneAndUpdate({ _id: user._id, namePassword: storedPassword }, { $set: changes }, { new: true });
      if (!user) throw new ApiError(ErrorCode.AUTH.INVALID_PASSWORD);
    }
    // Previous: if (options.issueTokens === false) return UserMapper.toProfile(user);
    // Previous: const tokens = await SessionService.createSession(user, this.getDevice(req));
    const tokens = await SessionService.createSession(user, this.getDevice(req), this.getSessionContext(req));
    return UserMapper.toLoginResponse(user, tokens);
  }

  async register(data, req, options = {}) {
    const { nameAccount, namePassword, gmail, fullName } = AuthValidator.register(data);
    await UserService.checkAccountExists(nameAccount);
    const password = await PasswordService.hash(namePassword);
    let user;
    try {
      user = await UserService.create({
        userID: crypto.randomUUID(),
        nameAccount,
        namePassword: password,
        gmail,
        fullName,
        role: 1,
      });
    } catch (error) {
      if (error.code === 11000) throw new ApiError(ErrorCode.AUTH.ACCOUNT_EXISTS);
      throw error;
    }
    if (options.issueTokens === false) return UserMapper.toProfile(user);
    // Previous: const tokens = await SessionService.createSession(user, this.getDevice(req));
    const tokens = await SessionService.createSession(user, this.getDevice(req), this.getSessionContext(req));
    return UserMapper.toLoginResponse(user, tokens);
  }

  async refreshToken(refreshToken) {
    return await SessionService.refreshSession(refreshToken);
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(ErrorCode.AUTH.INVALID_TOKEN);
    }
    const removed = await SessionService.removeSession(refreshToken);
    return {
      success: true,
      message: removed
        ? "Logged out successfully."
        : "Session already removed or invalid.",
    };
  }

  async logoutAll(userId) {
    const user = await UserService.getById(userId);

    user.refreshTokens = [];

    await UserService.save(user);
  }

  // async googleCallback(profile) {
  //   const user = await GoogleAuthService.authenticate(profile);
  //   const tokens = await SessionService.createSession(user);
  //   return UserMapper.toLoginResponse(user, tokens);
  // }

  async googleCallback(profile, req) {
    const user = await GoogleAuthService.authenticate(profile);

    const tokens = await SessionService.createSession(
      user,
      this.getDevice(req),
      this.getSessionContext(req),
    );

    return UserMapper.toLoginResponse(user, tokens);
  }

  async profile(userId) {
    const user = await UserService.getByIdentifier(userId);
    return UserMapper.toProfile(user);
  }

  async changePassword(userId, oldPassword, newPassword) {
    // Previous implementation:
    // const user = await UserService.getByIdentifier(userId);
    // const matched = await PasswordService.compare(oldPassword, user.namePassword);
    // if (!matched) throw new ApiError(ErrorCode.AUTH_INVALID_PASSWORD);
    // user.namePassword = await PasswordService.hash(newPassword);
    // user.refreshTokens = [];
    // await UserService.save(user);
    const service = require("./PasswordChangeService");
    return service.change(await service.actor(String(userId)), { oldPassword, newPassword });
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
module.exports = new AuthService();
