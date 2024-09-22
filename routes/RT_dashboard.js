var express = require("express");
var router = express.Router();
var Contronlers = require("../contronller/CTL_dashboard");

function requireAdmin(req, res, next) {
    // Check Login
    if (!req.session.userLogin) {
      return res.redirect('/auth/signin');
    }
    // Check Admin
    if (req.session.userLogin['role'] === 1) {
      res.redirect('/home');
      return next();
    } else if (req.session.userLogin['role'] === 2) {
      return next();
    } else {
      return res.send('Bạn không đủ quyền hạn');
    }
}

router.get("",requireAdmin, Contronlers.Dashboard);


module.exports = router;
