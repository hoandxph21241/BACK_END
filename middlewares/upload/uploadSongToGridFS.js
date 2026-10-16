const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const uploadFilename = require("../../utils/uploadFilename");
const validateAudioUpload = require("../../utils/validateAudioUpload");
const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");
const uploadDirectory = path.join(process.cwd(), "uploads", "api-songs");
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, done) => done(null, uploadDirectory),
  filename: (_req, file, done) => done(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 2, fields: 16 },
  fileFilter(_req, file, done) {
    const allowed = file.fieldname === "song"
      // Previous audio types: audio/mpeg, audio/mp3, audio/wav, audio/flac, audio/x-wav.
      ? ["audio/mpeg", "audio/mp3", "audio/wav", "audio/flac", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/x-m4a"]
      : ["image/jpeg", "image/png", "image/webp"];
    done(allowed.includes(file.mimetype) ? null : new Error("INVALID_FILE_TYPE"), allowed.includes(file.mimetype));
  },
}).fields([{ name: "song", maxCount: 1 }, { name: "imageFile", maxCount: 1 }]);
async function cleanup(req) {
  const files = Object.values(req.files || {}).flat();
  await Promise.all(files.map(file => fs.promises.unlink(file.path).catch(error => {
    if (error.code !== "ENOENT") console.error("Cannot clean temporary upload:", error.message);
  })));
}
module.exports = (req, res, next) => {
  upload(req, res, async error => {
    // Previously originalname was passed through unchanged, including misdecoded headers.
    // req.file = req.files?.song?.[0];
    for (const file of Object.values(req.files || {}).flat()) {
      file.originalname = uploadFilename(file.originalname);
    }
    req.file = req.files?.song?.[0];
    req.songImage = req.files?.imageFile?.[0];
    const fail = async message => {
      await cleanup(req);
      next(new ApiError({ ...ErrorCode.SONG.UPLOAD_FAILED, message }));
    };
    if (error) return fail("File không hợp lệ. Audio MP3/M4A/WAV/FLAC tối đa 25 MB; ảnh JPG/PNG/WebP tối đa 5 MB.");
    if (!req.file) { await cleanup(req); return next(new ApiError(ErrorCode.SONG.FILE_REQUIRED)); }
    if (req.songImage?.size > 5 * 1024 * 1024) return fail("Ảnh bìa tối đa 5 MB.");
    if (res.destroyed) return cleanup(req);
    // Previously only the browser-supplied MIME type was checked by fileFilter.
    try {
      await validateAudioUpload(req.file);
    } catch (error) {
      if (error.code === "INVALID_AUDIO_FILE") return fail(error.message);
      await cleanup(req);
      return next(error);
    }
    // Covers validation errors too, before the controller gets a chance to run.
    const onComplete = () => { cleanup(req).catch(error => console.error("Upload cleanup failed:", error.message)); };
    res.once("finish", onComplete);
    res.once("close", onComplete);
    next();
  });
};
// Previous audio-only parser retained for reference.
// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");
// const crypto = require("crypto");
//
// const ApiError = require("../../utils/ApiError");
// const { ErrorCode } = require("../../constants");
//
// const uploadDirectory = path.join(
//   process.cwd(),
//   "uploads",
//   "api-songs",
// );
//
// fs.mkdirSync(uploadDirectory, { recursive: true });
//
// const storage = multer.diskStorage({
//   destination: (_req, _file, callback) => {
//     callback(null, uploadDirectory);
//   },
//
//   filename: (_req, file, callback) => {
//     const extension = path.extname(file.originalname).toLowerCase();
//     callback(null, `${crypto.randomUUID()}${extension}`);
//   },
// });
//
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 25 * 1024 * 1024, // 25 MiB; điều chỉnh theo nhu cầu
//     files: 1,
//   },
//   fileFilter: (_req, file, callback) => {
//     const allowedMimeTypes = [
//       "audio/mpeg",
//       "audio/mp3",
//       "audio/wav",
//       "audio/flac",
//       "audio/x-wav",
//     ];
//
//     if (!allowedMimeTypes.includes(file.mimetype)) {
//       return callback(new Error("INVALID_AUDIO_FILE_TYPE"));
//     }
//
//     callback(null, true);
//   },
// });
//
// module.exports = (req, res, next) => {
//   upload.single("song")(req, res, (err) => {
//     console.log("Multer error:", err?.message);
//     console.log("Content-Type:", req.headers["content-type"]);
//     console.log("Uploaded file:", req.file);
//
//     if (err) {
//       return next(new ApiError(ErrorCode.SONG.UPLOAD_FAILED));
//     }
//
//     if (!req.file) {
//       return next(new ApiError(ErrorCode.SONG.FILE_REQUIRED));
//     }
//
//     next();
//   });
// };