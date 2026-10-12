
const JwtService = require("../modules/auth/service/JwtService");
const { UserModel } = require("../model/db_song");
const ApiError = require("../utils/ApiError");
const { ErrorCode } = require("../constants");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(ErrorCode.AUTH.UNAUTHORIZED);
    }

    const [scheme, token, ...extra] = authHeader.trim().split(/\s+/);

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !token ||
      extra.length > 0
    ) {
      throw new ApiError(ErrorCode.AUTH.INVALID_TOKEN);
    }

    const payload = JwtService.verifyAccessToken(token);

    if (!payload.id) {
      throw new ApiError(ErrorCode.AUTH.INVALID_TOKEN);
    }

    const user = await UserModel.findById(payload.id);

    if (!user) {
      throw new ApiError(ErrorCode.USER.NOT_FOUND);
    }

    req.user = user;
    return next();
  } catch (err) {
    if (
      err instanceof ApiError ||
      err.name === "TokenExpiredError" ||
      err.name === "JsonWebTokenError" ||
      err.name === "NotBeforeError"
    ) {
      const isExpired = err.name === "TokenExpiredError";
      const error = err instanceof ApiError
        ? err
        : new ApiError(ErrorCode.AUTH.INVALID_TOKEN);

      return res.status(error.status).json({
        success: false,
        code: error.code,
        message: isExpired
          ? "Access token expired."
          : error.message,
      });
    }

    console.error("verifyToken error:", err);

    const error = new ApiError(ErrorCode.SYSTEM.INTERNAL);

    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }
};