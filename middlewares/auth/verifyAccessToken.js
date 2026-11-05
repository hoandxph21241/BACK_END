const ApiError = require("../../utils/ApiError");
const JwtService = require("../../modules/auth/service/JwtService");
const { ErrorCode } = require("../../constants");
const { UserModel } = require("../../model/db_song");
const accessPolicy = require('./accessTokenPolicy');
// Previous verifier only checked the JWT signature/type, without credential revocation:
// module.exports = (req, res, next) => {
//   const header = req.headers.authorization;
//   if (!header?.startsWith("Bearer ")) return next(new ApiError(ErrorCode.AUTH.UNAUTHORIZED));
//   try { req.user = JwtService.verifyAccessToken(header.slice(7)); next(); }
//   catch (error) { next(new ApiError(ErrorCode.AUTH.INVALID_TOKEN)); }
// };
module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new ApiError(ErrorCode.AUTH.UNAUTHORIZED));
  try {
    req.user = JwtService.verifyAccessToken(header.slice(7));
  } catch (error) {
    return next(new ApiError(ErrorCode.AUTH.INVALID_TOKEN));
  }
  try {
    // Session and legacy migration checks are shared with middlewares/verifyToken.
    // Previous inline filter: identity + optional refreshTokens.$elemMatch by sid/expiry.
    const filter = accessPolicy.filter(req.user);
    if (!filter) return next(new ApiError(ErrorCode.AUTH.INVALID_TOKEN));
    const user = filter && await UserModel.findOne(filter).select("authVersion sessionBindingRequired").lean();
    // Legacy access remains compatible until this account explicitly revokes a session.
    // Its retained refresh tokens can still rotate into bound tokens.
    if (!accessPolicy.accepts(user,req.user)) return next(new ApiError(ErrorCode.AUTH.INVALID_TOKEN));
    return next();
  } catch (error) { return next(error); }
};
// Previous verifier did not enforce the access token type.
// const ApiError = require("../../utils/ApiError");
// const JwtService = require("../../service/auth/JwtService");
// const { ErrorCode, TokenType } = require("../../constants");
//
// module.exports = (req, res, next) => {
//
//     const authHeader = req.headers.authorization;
//
//     if (!authHeader?.startsWith("Bearer ")) {
//
//         return next(
//             new ApiError(ErrorCode.AUTH.UNAUTHORIZED)
//         );
//
//     }
//
//     const token = authHeader.split(" ")[1];
//
//     try {
//
//         const payload = JwtService.verify(
//             token,
//             TokenType.ACCESS,
//         );
//
//         req.user = payload;
//
//         next();
//
//     } catch (err) {
//
//         next(err);
//
//     }
//
// };
