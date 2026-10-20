const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  // Previous: limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 6 },
  limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 12, fieldSize: 16 * 1024 },
  fileFilter(req, file, done) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      // Previous: return done(new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP."));
      return done(new Error("Only JPG, PNG and WebP images are supported."));
    }
    done(null, true);
  },
}).fields([{ name: "avatar", maxCount: 1 }, { name: "banner", maxCount: 1 }]);
module.exports = (req, res, next) => {
  upload(req, res, error => {
    // Previous errors: "Mỗi ảnh tối đa 5 MB." / "Không thể tải ảnh. Chọn tối đa một avatar và một banner JPG, PNG hoặc WebP, mỗi ảnh tối đa 5 MB."
    if (error) req.profileUploadError = error.code === "LIMIT_FILE_SIZE"
      ? "Each image must be 5 MB or smaller." : "Unable to upload images. Choose one profile picture and one banner at most, in JPG, PNG or WebP format, up to 5 MB each.";
    next();
  });
};
