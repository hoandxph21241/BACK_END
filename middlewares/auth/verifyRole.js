const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");

module.exports = (...roles) => {

    return (req, res, next) => {

        if (!req.user) {

            return next(

                new ApiError(

                    ErrorCode.AUTH.UNAUTHORIZED

                )

            );

        }

        if (!roles.includes(req.user.role)) {

            return next(

                new ApiError(

                    ErrorCode.AUTH.FORBIDDEN

                )

            );

        }

        next();

    };

};