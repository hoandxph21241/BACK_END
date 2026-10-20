const express = require("express");
const rateLimit = require("express-rate-limit");
const verify = require("../../../middlewares/auth/verifyAccessToken");
const webAuth = require("../../../middlewares/auth/webAccessToken");
const service = require("../service/PasswordChangeService");
const router = express.Router();
const auth = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  req.passwordViaWeb = !req.headers.authorization;
  return req.passwordViaWeb ? webAuth(req, res, next) : verify(req, res, next);
};
const actor = async (req, res, next) => {
  try {
    req.passwordActor = await service.actor(
      String(req.user?.userID || req.user?.id || ""),
    );
    next();
  } catch (error) {
    next(error);
  }
};
const json = (req, res, next) =>
  req.is("application/json")
    ? next()
    : res
        .status(415)
        .json({ success: false, message: "Yêu cầu phải dùng JSON." });
// Previous: const limit = (windowMs, max) =>
const limit = (windowMs, max, code = 'PASSWORD_REQUEST_LIMIT') =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => String(req.passwordActor._id),
    message: {
      success: false,
      message: "Bạn đã thử quá nhiều lần. Vui lòng đợi rồi thử lại.",
    },
    handler(req, res) {
      const retryAfter = Math.max(1, Math.ceil(((req.rateLimit?.resetTime?.getTime() || Date.now() + windowMs) - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfter)).status(429).json({ success: false, code, retryAfter,
        message: 'Bạn đã thử quá nhiều lần. Vui lòng chờ hết thời gian đếm ngược rồi thử lại.' });
    },
  });
// Previous options returned a fixed 60-second delay, ignoring the stored send window.
router.get("/password/options", auth, actor, limit(60000, 60), async (req, res) =>
  res.json({ success: true, data: await service.getOptions(req.passwordActor) }),
);
router.post(
  "/password/otp",
  json,
  auth,
  actor,
  // Previous: limit(3600000, 5), counted blocked/rejected requests as hourly sends.
  // The DB enforces 60 seconds / 5 sends per hour; this limiter only guards request bursts.
  limit(60000, 30, 'OTP_REQUEST_LIMIT'),
  async (req, res) => {
    if (Object.keys(req.body || {}).length)
      return res
        .status(400)
        .json({
          success: false,
          message: "OTP chỉ được gửi đến email của tài khoản.",
        });
    return res.json({
      success: true,
      data: await service.requestOtp(req.passwordActor),
    });
  },
);
router.put(
  "/password",
  json,
  auth,
  actor,
  require("../../../middlewares/auth/passwordChangeLimit"),
  async (req, res) => {
    const data = await service.change(req.passwordActor, req.body);
    if (req.passwordViaWeb && req.session) {
      await new Promise((resolve) =>
        req.session.destroy((error) => {
          if (error)
            console.error("Cannot remove changed-password web session.");
          resolve();
        }),
      );
      res.clearCookie("connect.sid");
    }
    let nav;
    if (req.passwordViaWeb)
      nav = await new Promise((resolve) =>
        res.render("inc/_nav_account", { user: null }, (error, html) =>
          resolve(error ? undefined : html),
        ),
      );
    return res.json({ success: true, data, ...(nav ? { nav } : {}) });
  },
);
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!error.status) console.error("Password operation failed.");
  const retryAfter = Number.isFinite(error.retryAfter) && error.retryAfter > 0 ? Math.ceil(error.retryAfter) : null;
  if (retryAfter) res.set('Retry-After', String(retryAfter));
  res
    .status(error.status || 500)
    .json({
      success: false,
      message: error.status
        ? error.message
        : "Không thể xử lý lúc này. Vui lòng thử lại.",
      ...(retryAfter ? { retryAfter } : {}),
      ...(error.retryAt ? { retryAt: error.retryAt } : {}),
      ...(error.code && error.status ? { code: error.code } : {}),
    });
});
module.exports = router;
