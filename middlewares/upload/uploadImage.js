const upload = require("../../config/multer");
const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");

module.exports = (req, res, next) => {

    upload.single("image")(req, res, (err) => {

        if (err) {

            return next(
                new ApiError(ErrorCode.SYSTEM.UPLOAD_FAILED)
            );

        }

        if (!req.file) {

            return next(
                new ApiError(ErrorCode.SYSTEM.IMAGE_REQUIRED)
            );

        }

        const allow = [
            "image/png",
            "image/jpeg",
            "image/webp",
        ];

        if (!allow.includes(req.file.mimetype)) {

            return next(
                new ApiError(ErrorCode.SYSTEM.INVALID_IMAGE)
            );

        }

        next();

    });

};