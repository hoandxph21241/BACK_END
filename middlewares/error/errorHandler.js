const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");
const ApiResponse = require("../../utils/ApiResponse");

module.exports = (err, req, res, next) => {

    //------------------------------------
    // Log Error
    //------------------------------------

    console.error(err);

    //------------------------------------
    // Custom Error
    //------------------------------------

    if (err instanceof ApiError) {

        return ApiResponse.error(res, err);

    }

    //------------------------------------
    // JWT Error
    //------------------------------------

    if (err.name === "JsonWebTokenError") {

        return ApiResponse.error(
            res,
            new ApiError(
                ErrorCode.AUTH.INVALID_TOKEN
            )
        );

    }

    //------------------------------------
    // Token Expired
    //------------------------------------

    if (err.name === "TokenExpiredError") {

        return ApiResponse.error(
            res,
            new ApiError(
                ErrorCode.AUTH.REFRESH_TOKEN_EXPIRED
            )
        );

    }

    //------------------------------------
    // Mongoose Validation
    //------------------------------------

    if (err.name === "ValidationError") {

        return ApiResponse.error(
            res,
            new ApiError(
                ErrorCode.VALIDATION.INVALID
            )
        );

    }

    //------------------------------------
    // Mongo Duplicate
    //------------------------------------

    if (err.code === 11000) {

        return ApiResponse.error(
            res,
            new ApiError(
                ErrorCode.VALIDATION.INVALID
            )
        );

    }

    //------------------------------------
    // Unknown Error
    //------------------------------------

    return ApiResponse.error(
        res,
        new ApiError(
            ErrorCode.SYSTEM.INTERNAL
        )
    );

};