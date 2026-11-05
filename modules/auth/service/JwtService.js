const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

class JwtService {
  // sessionId is optional for legacy callers; login/refresh always provide it.
  generateAccessToken(user, sessionId) {
    return jwt.sign(
      {
        id: user._id,
        userID: user.userID,
        role: user.role,
        tokenType: "access",
        authVersion: user.authVersion || 0,
        ...(sessionId ? { sid: String(sessionId) } : {}),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRES,
      }
    );
  }

  generateRefreshToken(user, sessionId) {
    return jwt.sign(
      {
        id: user._id,
        userID: user.userID,
        tokenType: "refresh",
        authVersion: user.authVersion || 0,
        ...(sessionId ? { sid: String(sessionId) } : {}),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES,
        jwtid: randomUUID(),
      }
    );
  }

  verify(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  verifyAccessToken(token) {
    const payload = this.verify(token);

    if (payload.tokenType !== "access") {
      throw new Error("Invalid access token");
    }

    return payload;
  }

  verifyRefreshToken(token) {
    const payload = this.verify(token);

    if (payload.tokenType !== "refresh") {
      throw new Error("Invalid refresh token");
    }

    return payload;
  }
}

module.exports = new JwtService();
