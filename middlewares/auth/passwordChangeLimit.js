const rateLimit = require("express-rate-limit");
module.exports = rateLimit({ windowMs: 900000, max: 10,
  keyGenerator: req => String(req.passwordActor?._id || req.user?._id || req.user?.id),
  message: { success: false, message: "Bạn đã thử quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại." },
});
