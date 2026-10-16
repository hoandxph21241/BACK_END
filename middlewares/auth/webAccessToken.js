const AuthService = require("../../modules/auth/service/AuthService");
const JwtService = require("../../modules/auth/service/JwtService");
const verifyAccessToken = require("./verifyAccessToken");
const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");
module.exports = async (req, res, next) => {
  const tokens = req.session?.authTokens;
  if (!req.session?.userLogin || !tokens?.accessToken) return next(new ApiError(ErrorCode.AUTH.UNAUTHORIZED));
  try {
    try {
      JwtService.verifyAccessToken(tokens.accessToken);
    } catch (error) {
      if (error.name !== "TokenExpiredError" || !tokens.refreshToken) throw error;
      req.session.authTokens = await AuthService.refreshToken(tokens.refreshToken);
      await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    }
    req.headers.authorization = "Bearer " + req.session.authTokens.accessToken;
    return verifyAccessToken(req, res, next);
  } catch (error) {
    return next(new ApiError(ErrorCode.AUTH.UNAUTHORIZED));
  }
};