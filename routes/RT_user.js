const express = require('express');
const router = express.Router();
const userController = require('../contronller/CTL_user');
const check_login = require("../middlewares/check_login");

router.get("/", check_login.yeu_cau_dang_nhap, function (req, res, next) {
  let uLogin = req.session.userLogin;
  console.log("Thông tin đăng nhập:");
  console.log(uLogin);
  console.log("+---------------+");
  res.send(uLogin);
});

router.get('/profile', check_login.yeu_cau_dang_nhap, userController.getProfile);

// Chỉnh sửa hồ sơ
router.get('/profile/edit', check_login.yeu_cau_dang_nhap, userController.getEditProfile);
router.post('/profile/edit', check_login.yeu_cau_dang_nhap, userController.postEditProfile);

module.exports = router;
