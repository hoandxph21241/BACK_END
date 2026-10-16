const express = require('express');
const router = express.Router();
const userController = require('../controllers/CTL_user');
const check_login = require("../middlewares/check_login");
const profileImagesController = require('../controllers/CTL_profileImages');
router.get('/profile-images/:id', profileImagesController.getProfileImage);

router.get("/", check_login.yeu_cau_dang_nhap, function (req, res, next) {
  let uLogin = req.session.userLogin;
  console.log("Thông tin đăng nhập:");
  console.log(uLogin);
  console.log("+---------------+");
  res.send(uLogin);
});

const homeController = require('../controllers/CTL_home');
const uploadProfileImages = require('../middlewares/upload/uploadProfileImages');
function profilePage(handler) {
  return (req, res, next) => {
    res.vary('X-Requested-With');
    if (req.xhr) return handler(req, res, next);
    res.locals.initialView = req.baseUrl + req.path;
    return homeController.Home(req, res, next);
  };
}
// router.get('/profile', check_login.yeu_cau_dang_nhap, userController.getProfile);
router.get('/profile', check_login.yeu_cau_dang_nhap, profilePage(userController.getProfile));

// Chỉnh sửa hồ sơ
// router.get('/profile/edit', check_login.yeu_cau_dang_nhap, userController.getEditProfile);
router.get('/profile/edit', check_login.yeu_cau_dang_nhap, profilePage(userController.getEditProfile));
// router.post('/profile/edit', check_login.yeu_cau_dang_nhap, userController.postEditProfile);
router.post('/profile/edit', check_login.yeu_cau_dang_nhap, uploadProfileImages, userController.postEditProfile);

// Danh sách yêu thích
router.get('/likes', check_login.yeu_cau_dang_nhap, userController.getLikes);

// Cài đặt
router.get('/settings', check_login.yeu_cau_dang_nhap, userController.getSettings);

module.exports = router;
