const webAccessToken = require("./webAccessToken");

module.exports = (req, res, next) => {
  if (!req.session?.userLogin || req.headers.authorization) return next();
  const original = req.headers.authorization;
  return webAccessToken(req, res, error => {
    if (original === undefined) delete req.headers.authorization;
    else req.headers.authorization = original;
    if (!error) return next();
    if (error.status !== 401) return next(error);
    // Replace revoked state with an untouched guest session, including on login POSTs.
    req.session.regenerate(failure => {
      if (failure) return next(failure);
      req.user = null; res.clearCookie("connect.sid"); return next();
    });
  });
};
