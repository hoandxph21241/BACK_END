const JwtService = require("./JwtService");
const UserRepository = require("../../user/repository/UserRepository");
const { durationToMs } = require("../../../utils");

const REFRESH_TOKEN_TTL_MS = durationToMs(
  process.env.JWT_REFRESH_EXPIRES || "7d",
);
const MAX_ACTIVE_SESSIONS = 5;

class SessionService {
  /**
   * Tạo session mới cho người dùng.
   */
  // async createSession(user, device = "Unknown Device") {
  //   if (!user || typeof user.save !== "function") {
  //     throw new Error(
  //       "SessionService.createSession: user must be a Mongoose document",
  //     );
  //   }

  //   const now = new Date();

  //   // Chỉ loại bỏ các session đã hết hạn.
  //   user.refreshTokens = (user.refreshTokens || []).filter(
  //     (session) =>
  //       session.expiresAt &&
  //       new Date(session.expiresAt).getTime() > now.getTime(),
  //   );

  //   const accessToken = JwtService.generateAccessToken(user);
  //   const refreshToken = JwtService.generateRefreshToken(user);

  //   user.refreshTokens.push({
  //     token: refreshToken,
  //     device,
  //     createdAt: now,
  //     expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
  //   });

  //   await user.save();

  //   return {
  //     accessToken,
  //     refreshToken,
  //   };
  // }
  // Previous implementation appended a new entry on every login:
  //   async createSession(user, device = "Unknown Device") {
  //   if (!user || typeof user.save !== "function") {
  //     throw new Error(
  //       "SessionService.createSession: user must be a Mongoose document",
  //     );
  //   }
  //
  //   const now = new Date();
  //
  //   // 1. Chỉ giữ các session còn hạn.
  //   const activeSessions = (user.refreshTokens || []).filter(
  //     (session) =>
  //       session.token &&
  //       session.expiresAt &&
  //       new Date(session.expiresAt).getTime() > now.getTime(),
  //   );
  //
  //   // 2. Nếu đã đủ giới hạn, loại bỏ session cũ nhất trước.
  //   activeSessions.sort(
  //     (a, b) =>
  //       new Date(a.createdAt || 0).getTime() -
  //       new Date(b.createdAt || 0).getTime(),
  //   );
  //
  //   while (activeSessions.length >= MAX_ACTIVE_SESSIONS) {
  //     activeSessions.shift();
  //   }
  //
  //   // 3. Tạo cặp token mới.
  //   const accessToken = JwtService.generateAccessToken(user);
  //   const refreshToken = JwtService.generateRefreshToken(user);
  //
  //   // 4. Lưu refresh token của session mới.
  //   activeSessions.push({
  //     token: refreshToken,
  //     device,
  //     createdAt: now,
  //     expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
  //   });
  //
  //   user.refreshTokens = activeSessions;
  //
  //   await user.save();
  //
  //   return {
  //     accessToken,
  //     refreshToken,
  //   };
  // }
  async createSession(user, device = "Unknown Device", context = {}) {
    if (!user || typeof user.save !== "function") {
      throw new Error("SessionService.createSession: user must be a Mongoose document");
    }
    await require("../../account/service/AccountSecurityService").authorizeSession(user, context.securityGrant);
    const now = new Date();
    const browserId = context.browserId;
    const activeSessions = (user.refreshTokens || []).filter(session =>
      session.token && session.expiresAt && new Date(session.expiresAt).getTime() > now.getTime(),
    );
    const matchesBrowser = session => browserId && (
      session.browserId === browserId ||
      (!session.browserId && context.previousToken && session.token === context.previousToken)
    );
    // Preserve the existing subdocument (including its _id), not just its position.
    const existing = (user.refreshTokens || []).filter(matchesBrowser)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
    // Previous tokens had no stable session identity, so deleting a refresh token
    // could not immediately reject an already-issued access token.
    const entry = existing || { _id: new (require('mongoose').Types.ObjectId)() };
    const accessToken = JwtService.generateAccessToken(user, entry._id);
    const refreshToken = JwtService.generateRefreshToken(user, entry._id);
    entry.token = refreshToken;
    entry.device = device;
    if (browserId) entry.browserId = browserId;
    entry.createdAt = now;
    entry.expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    // Remove old duplicates for this browser, while retaining other browsers.
    const retained = activeSessions.filter(session => session !== existing && !matchesBrowser(session));
    retained.push(entry);
    retained.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    while (retained.length > MAX_ACTIVE_SESSIONS) {
      const oldest = retained.findIndex(session => session !== entry);
      retained.splice(oldest, 1);
    }
    user.refreshTokens = retained;
    // Previous: await user.save();
    // A login that started before a password change must not write stale credentials back.
    const previousWhere = user.$where;
    // Previous save predicate checked authVersion only. A stale login must also
    // fail after session revocation instead of restoring its old session array.
    user.$where = { $and: [previousWhere || {}, (user.authVersion || 0)
      ? { authVersion: user.authVersion } : { $or: [{ authVersion: 0 }, { authVersion: { $exists: false } }] },
      (user.sessionRevision || 0) ? { sessionRevision: user.sessionRevision }
        : { $or: [{ sessionRevision: 0 }, { sessionRevision: { $exists: false } }] }] };
    try { await user.save(); }
    finally { user.$where = previousWhere; }
    await require("../../account/service/AccountSecurityService").record(user, "login_success");
    return { accessToken, refreshToken };
  }
  /**
   * Làm mới access token và refresh token.
   */
  async refreshSession(refreshToken) {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    // Xác minh chữ ký, thời hạn và loại refresh token.
    const payload = JwtService.verifyRefreshToken(refreshToken);

    const identifier = payload.userID || payload.id || payload._id;

    if (!identifier) {
      throw new Error("Invalid refresh token payload");
    }

    const user = await UserRepository.findByIdentifier(identifier);

    if (!user) {
      throw new Error("User not found");
    }
    await require("../../account/service/AccountSecurityService").assertActive(user);
    if ((payload.authVersion || 0) !== (user.authVersion || 0)) throw new Error("Credentials changed");

    const now = new Date();

    // Chỉ chấp nhận token còn tồn tại và chưa hết hạn trong database.
    const session = (user.refreshTokens || []).find(
      (item) =>
        item.token === refreshToken &&
        item.expiresAt &&
        new Date(item.expiresAt).getTime() > now.getTime(),
    );

    if (!session) {
      throw new Error("Refresh token is invalid or expired");
    }

    // Tạo token mới trước khi cập nhật database.
    // Preserve the subdocument ID through rotation, including legacy refresh upgrades.
    const newRefreshToken = JwtService.generateRefreshToken(user, session._id);
    const accessToken = JwtService.generateAccessToken(user, session._id);
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    let updatedUser;

    try {
      // Cập nhật nguyên tử: chỉ thay token nếu token cũ vẫn hợp lệ.
      updatedUser = await UserRepository.model.findOneAndUpdate(
        {
          _id: user._id,
          namePassword: user.namePassword,
          refreshTokens: {
            $elemMatch: {
              token: refreshToken,
              expiresAt: { $gt: now },
            },
          },
        },
        {
          $set: {
            "refreshTokens.$.token": newRefreshToken,
            "refreshTokens.$.createdAt": now,
            "refreshTokens.$.expiresAt": expiresAt,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
    } catch (error) {
      console.error(
        "SessionService.refreshSession: database update failed",
        error,
      );

      // Không trả token mới khi database báo lỗi.
      throw error;
    }

    if (!updatedUser) {
      throw new Error("Refresh token is invalid, expired, or already used");
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Xóa một session theo refresh token.
   */
  async removeSession(refreshToken) {
    if (!refreshToken) {
      return false;
    }

    // Previous read/filter/user.save() could restore concurrently revoked sessions.
    // const user = await UserRepository.findByRefreshToken(refreshToken);
    // user.refreshTokens = user.refreshTokens.filter(session => session.token !== refreshToken);
    // await user.save();
    const result = await UserRepository.model.updateOne(
      { 'refreshTokens.token': refreshToken },
      { $pull: { refreshTokens: { token: refreshToken } }, $inc: { sessionRevision: 1 } },
    );
    return result.modifiedCount > 0;
  }
}

module.exports = new SessionService();
