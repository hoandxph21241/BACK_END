const express = require('express');
const router = express.Router();
const userController = require('../controllers/CTL_user');
const check_login = require("../middlewares/check_login");
const profileImagesController = require('../controllers/CTL_profileImages');
const profileController = require('../modules/profile/controller/ProfileController');
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
    // Previous baseUrl + path dropped Profile tab/search query parameters on F5.
    res.locals.initialView = req.originalUrl;
    return homeController.Home(req, res, next);
  };
}
// router.get('/profile', check_login.yeu_cau_dang_nhap, userController.getProfile);
// Previous: router.get('/profile', check_login.yeu_cau_dang_nhap, profilePage(userController.getProfile));
router.get('/profile', check_login.yeu_cau_dang_nhap, userController.redirectProfile);

// Chỉnh sửa hồ sơ
// router.get('/profile/edit', check_login.yeu_cau_dang_nhap, userController.getEditProfile);
// Previous: router.get('/profile/edit', check_login.yeu_cau_dang_nhap, profilePage(userController.getEditProfile));
// Previous authenticated alias: userController.redirectEditProfile. Resolve an existing 'edit' profile first.
router.get('/profile/edit', profileController.editEntry);
// router.post('/profile/edit', check_login.yeu_cau_dang_nhap, userController.postEditProfile);
router.post('/profile/edit', check_login.yeu_cau_dang_nhap, uploadProfileImages, userController.postEditProfile);
// Register the legacy /edit entry before /:slug so it cannot become a username.
router.get('/profile/:slug/edit', check_login.yeu_cau_dang_nhap, profileController.editPage);
router.get('/profile/:slug', profileController.page);

// Danh sách yêu thích
router.get('/likes', check_login.yeu_cau_dang_nhap, userController.getLikes);

// Cài đặt
// Previous: router.get('/settings', check_login.yeu_cau_dang_nhap, userController.getSettings);
router.get('/settings', check_login.yeu_cau_dang_nhap, profilePage(userController.getSettings));

module.exports = router;
