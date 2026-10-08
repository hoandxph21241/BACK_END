
const express = require("express");

const UserController = require("../controller/UserController");
const verifyToken = require("../../../middlewares/verifyToken");

const router = express.Router();

// Các API dành cho User đã đăng nhập.
router.get("/me", verifyToken, UserController.getMe);
router.put("/me/profile", verifyToken, UserController.updateMyProfile);
router.put("/me/password", verifyToken, UserController.changeMyPassword);

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