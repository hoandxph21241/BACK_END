const express = require("express");
const rateLimit = require("express-rate-limit");
const service = require("../service/MailService");
const verify = require("../../../middlewares/auth/verifyAccessToken");
const webAuth = require("../../../middlewares/auth/webAccessToken");
const router = express.Router();
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  return req.headers.authorization ? verify(req, res, next) : webAuth(req, res, next);
});
router.use(async (req, res, next) => {
  try { req.mailActor = await service.actor(String(req.user?.userID || req.user?.id || "")); next(); }
  catch (error) { next(error); }
});
const sendLimit = rateLimit({ windowMs: 10 * 60000, max: 10,
  keyGenerator: req => String(req.mailActor._id),
  message: { success: false, message: "Bạn đã gửi quá nhiều thư. Vui lòng thử lại sau ít phút." } });
const searchLimit = rateLimit({ windowMs: 60000, max: 60,
  keyGenerator: req => String(req.mailActor._id),
  message: { success: false, message: "Bạn đang tìm quá nhanh. Vui lòng chờ một chút rồi thử lại." } });
router.get("/unread-count", async (req, res) => res.json({ success: true, data: { unread: await service.unread(req.mailActor) } }));
router.get("/recipients", searchLimit, async (req, res) => res.json({ success: true, data: await service.recipients(req.mailActor, req.query) }));
router.get("/", async (req, res) => res.json({ success: true, data: await service.list(req.mailActor, req.query) }));
router.get("/:id", async (req, res) => res.json({ success: true, data: await service.detail(req.mailActor, req.params.id) }));
// JSON requests cannot be submitted by a cross-site HTML form using the web session.
router.post("/", (req, res, next) => req.is("application/json") ? next() : res.status(415).json({ success: false, message: "Vui lòng gửi thư dưới dạng JSON." }),
  sendLimit, async (req, res) => res.status(201).json({ success: true, data: await service.send(req.mailActor, req.body) }));
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!error.status) console.error("Mail failed:", error.message);
  res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Không thể xử lý thư. Vui lòng thử lại." });
});
module.exports = router;
