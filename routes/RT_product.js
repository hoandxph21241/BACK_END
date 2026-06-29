var express = require("express");
var router = express.Router();
var Contronlers = require("../controllers/CTL_product");

function requireAdmin(req, res, next) {
  if (!req.session.userLogin) {
    return res.redirect('/auth/signin');
  }

  if (req.session.userLogin['role'] === 1) {
    return res.redirect('/home');
  }

  if (req.session.userLogin['role'] === 2) {
    return next();
  }

  return res.send('Ban khong du quyen han');
}

router.get("", requireAdmin, Contronlers.Product);
router.get("/update", requireAdmin, Contronlers.EditSongsPage);
router.post("/update/:id", requireAdmin, Contronlers.updateImageFile, Contronlers.handleMulterError, Contronlers.UpdateSong);
router.post("/upload", requireAdmin, Contronlers.uploadFiles, Contronlers.handleMulterError, Contronlers.saveMP3);

module.exports = router;

