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
// Previous: router.post("/upload", requireAdmin, Contronlers.uploadFiles, Contronlers.handleMulterError, Contronlers.saveMP3);
const webAccessToken = require("../middlewares/auth/webAccessToken");
const uploadSongToGridFS = require("../middlewares/upload/uploadSongToGridFS");
const validate = require("../middlewares/validate/validate");
const SongValidator = require("../modules/song/validator/SongValidator");
const SongController = require("../modules/song/controller/SongController");
router.post("/upload", webAccessToken, (req, res, next) => {
  if (req.user.role !== 2) return res.status(403).json({ success: false, message: "Bạn không có quyền upload." });
  next();
}, uploadSongToGridFS, validate(SongValidator.upload), SongController.upload);
router.use("/upload", (error, req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : "Không thể upload bài hát. Vui lòng thử lại.",
  });
});

module.exports = router;

