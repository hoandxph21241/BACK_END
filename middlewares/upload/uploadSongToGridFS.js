const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "api-songs",
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MiB; điều chỉnh theo nhu cầu
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/flac",
      "audio/x-wav",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(new Error("INVALID_AUDIO_FILE_TYPE"));
    }

    callback(null, true);
  },
});

module.exports = (req, res, next) => {
  upload.single("song")(req, res, (err) => {
    console.log("Multer error:", err?.message);
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Uploaded file:", req.file);

    if (err) {
      return next(new ApiError(ErrorCode.SONG.UPLOAD_FAILED));
    }

    if (!req.file) {
      return next(new ApiError(ErrorCode.SONG.FILE_REQUIRED));
    }

    next();
  });
};