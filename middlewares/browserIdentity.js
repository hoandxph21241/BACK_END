const { randomUUID } = require("crypto");
const COOKIE_NAME = "hz_browser_id";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

module.exports = (req, res, next) => {
  const saved = req.cookies?.[COOKIE_NAME];
  const browserId = typeof saved === "string" && UUID.test(saved) ? saved.toLowerCase() : randomUUID();
  req.authBrowserId = browserId;
  if (saved !== browserId) {
    res.cookie(COOKIE_NAME, browserId, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure,
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }
  next();
};