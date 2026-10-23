
const express = require("express");

const UserController = require("../controller/UserController");
const verifyToken = require("../../../middlewares/verifyToken");
const webAccessToken = require("../../../middlewares/auth/webAccessToken");

const router = express.Router();

const playerAuth = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.headers.authorization) return verifyToken(req, res, next);
  if (req.method === "PUT") {
    if (!req.is("application/json")) return res.status(415).json({ success: false, message: "JSON is required." });
    if (!/^[a-f0-9]{24}$/i.test(req.get("X-Player-Owner") || "")) return res.status(400).json({ success: false, message: "Player account is required." });
    if (req.get("Origin") && req.get("Origin") !== `${req.protocol}://${req.get("host")}`) {
      return res.status(403).json({ success: false, message: "Cross-origin player updates are not allowed." });
    }
  }
  return webAccessToken(req, res, next);
};
router.get("/me/player", playerAuth, UserController.getMyPlayer);
router.put("/me/player", playerAuth, UserController.updateMyPlayer);

// Các API dành cho User đã đăng nhập.
router.get("/me", verifyToken, UserController.getMe);
// Previous: router.put("/me/profile", verifyToken, UserController.updateMyProfile);
router.put("/me/profile", verifyToken, (req, res, next) => req.body?.gmail
  ? require("../../../middlewares/auth/passwordChangeLimit")(req, res, next) : next(), UserController.updateMyProfile);
// Previous: router.put("/me/password", verifyToken, UserController.changeMyPassword);
router.put("/me/password", verifyToken, require("../../../middlewares/auth/passwordChangeLimit"), UserController.changeMyPassword);

// Xem User theo ID và liệt kê User cần middleware phân quyền quản trị.
const requireAdmin = (req, res, next) => {
  if (!req.user || Number(req.user.role) !== 1) {
    return res.status(403).json({
      success: false,
      message: "Admin permission required.",
    });
  }

  next();
};

router.get("/", verifyToken, requireAdmin, UserController.list);
router.get("/:id", verifyToken, requireAdmin, UserController.getById);

module.exports = router;
