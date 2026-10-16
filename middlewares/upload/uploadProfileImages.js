const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 6 },
  fileFilter(req, file, done) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return done(new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP."));
    }
    done(null, true);
  },
}).fields([{ name: "avatar", maxCount: 1 }, { name: "banner", maxCount: 1 }]);
module.exports = (req, res, next) => {
  upload(req, res, error => {
    if (error) req.profileUploadError = error.code === "LIMIT_FILE_SIZE"
      ? "Mỗi ảnh tối đa 5 MB." : "Không thể tải ảnh. Chọn tối đa một avatar và một banner JPG, PNG hoặc WebP, mỗi ảnh tối đa 5 MB.";
    next();
  });
};