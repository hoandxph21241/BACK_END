const ApiError = require("../../utils/ApiError");
const JwtService = require("../../modules/auth/service/JwtService");
const { ErrorCode } = require("../../constants");
module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new ApiError(ErrorCode.AUTH.UNAUTHORIZED));
  try {
    req.user = JwtService.verifyAccessToken(header.slice(7));
    next();
  } catch (error) {
    next(new ApiError(ErrorCode.AUTH.INVALID_TOKEN));
  }
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