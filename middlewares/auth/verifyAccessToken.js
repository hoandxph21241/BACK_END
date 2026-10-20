const ApiError = require("../../utils/ApiError");
const JwtService = require("../../modules/auth/service/JwtService");
const { ErrorCode } = require("../../constants");
const { UserModel } = require("../../model/db_song");
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
    const identity = typeof req.user.id === "string" && /^[a-f0-9]{24}$/i.test(req.user.id)
      ? { _id: req.user.id } : typeof req.user.userID === "string" ? { userID: req.user.userID } : null;
    const user = identity && await UserModel.findOne(identity).select("authVersion").lean();
    if (!user || (req.user.authVersion || 0) !== (user.authVersion || 0)) return next(new ApiError(ErrorCode.AUTH.INVALID_TOKEN));
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
