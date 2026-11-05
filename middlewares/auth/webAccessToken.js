const AuthService = require("../../modules/auth/service/AuthService");
const JwtService = require("../../modules/auth/service/JwtService");
const verifyAccessToken = require("./verifyAccessToken");
const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");
const rotations = new Map();
const save = req => new Promise((resolve,reject) => req.session.save(error => error ? reject(error) : resolve()));
const actor = session => String(session?.userLogin?._id || session?.userLogin?.id || session?.userLogin?.userID || '');
async function rotate(req,tokens) {
  // One refresh per old token, including saving the winner before releasing waiters.
  const existing = rotations.get(tokens.refreshToken);
  if (existing) {
    req.session.authTokens = await existing;
    await save(req);
    return;
  }
  const pending = (async () => {
    let source = tokens;
    // A request can have loaded its session before a completed rotation. Reuse the
    // saved winner, instead of treating its old refresh token as a revoked session.
    if (req.sessionID && req.sessionStore?.get) {
      const stored = await new Promise((resolve,reject) => req.sessionStore.get(req.sessionID,(error,value) => error ? reject(error) : resolve(value)));
      if (!stored?.authTokens?.refreshToken || actor(stored) !== actor(req.session)) throw new ApiError(ErrorCode.AUTH.UNAUTHORIZED);
      source = stored.authTokens;
      if (source.refreshToken !== tokens.refreshToken) {
        try {
          if (JwtService.verifyAccessToken(source.accessToken).sid) {
            req.session.authTokens = source;
            await save(req);
            return source;
          }
        } catch(error) { if (error.name !== 'TokenExpiredError') throw error; }
      }
    }
    const result = await AuthService.refreshToken(source.refreshToken);
    req.session.authTokens = result;
    await save(req);
    return result;
  })();
  rotations.set(tokens.refreshToken,pending);
  try { await pending; }
  finally { if (rotations.get(tokens.refreshToken) === pending) rotations.delete(tokens.refreshToken); }
}
module.exports = async (req, res, next) => {
  const tokens = req.session?.authTokens;
  if (!req.session?.userLogin || !tokens?.accessToken) return next(new ApiError(ErrorCode.AUTH.UNAUTHORIZED));
  try {
    try {
      const payload = JwtService.verifyAccessToken(tokens.accessToken);
      // Upgrade an existing web session once, without forcing the user to log in again.
      if (!payload.sid && tokens.refreshToken) {
        // Previous: each request independently refreshed and saved the same token.
        // req.session.authTokens = await AuthService.refreshToken(tokens.refreshToken);
        // await new Promise((resolve,reject) => req.session.save(error => error ? reject(error) : resolve()));
        await rotate(req,tokens);
      }
    } catch (error) {
      if (error.name !== "TokenExpiredError" || !tokens.refreshToken) throw error;
      await rotate(req,tokens);
    }
    req.headers.authorization = "Bearer " + req.session.authTokens.accessToken;
    return verifyAccessToken(req, res, next);
  } catch (error) {
    return next(new ApiError(ErrorCode.AUTH.UNAUTHORIZED));
  }
};
