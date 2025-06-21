var express = require("express");
var router = express.Router();
var Contronlers = require("../controllers/CTL_auth");
var check_login = require("../middlewares/check_login");

router.get("/", check_login.yeu_cau_dang_nhap, function (req, res, next) {
  let uLogin = req.session.userLogin;
  console.log("Thông tin đăng nhập:");
  console.log(req.session.userLogin);
  console.log("+---------------+");
  res.send(uLogin);
});

router.get("/register", (req, res) => {
  res.render("auth/register.ejs", { msg: "" });
});

router.post("/register", Contronlers.Register);

router.get("/signin", (req, res) => {
  res.render("auth/sign_in.ejs", { msg: "", user: null });
});

router.post("/signin", Contronlers.SignIn);


router.get('/google', Contronlers.googleLogin);
router.get('/google/callback', Contronlers.googleCallback);

router.get("/signout", Contronlers.SignOut);
router.post("/signout", Contronlers.SignOut);

module.exports = router;
