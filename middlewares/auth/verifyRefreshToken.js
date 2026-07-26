const ApiError = require("../../utils/ApiError");
const JwtService = require("../../service/auth/JwtService");
const { ErrorCode, TokenType } = require("../../constants");

module.exports = (req, res, next) => {

    const { refreshToken } = req.body;

    if (!refreshToken) {

        return next(

            new ApiError(

                ErrorCode.AUTH.INVALID_REFRESH_TOKEN

            )

        );

    }

    try {

        const payload = JwtService.verify(

            refreshToken,

            TokenType.REFRESH

        );

        req.refreshUser = payload;

        req.refreshToken = refreshToken;

        next();

    } catch (err) {

        next(err);

    }

};