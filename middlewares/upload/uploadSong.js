const upload = require("../../config/multer");
const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");

module.exports = (req, res, next) => {

    upload.single("song")(req, res, (err) => {

        if (err) {

            return next(
                new ApiError(ErrorCode.SONG.UPLOAD_FAILED)
            );

        }

        if (!req.file) {

            return next(
                new ApiError(ErrorCode.SONG.FILE_REQUIRED)
            );

        }

        const allow = [

            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/flac",

        ];

        if (!allow.includes(req.file.mimetype)) {

            return next(
                new ApiError(ErrorCode.SONG.INVALID_FILE_TYPE)
            );

        }

        next();

    });

};