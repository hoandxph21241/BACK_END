const ApiError = require("../../utils/ApiError");
const JwtService = require("../../service/auth/JwtService");
const { ErrorCode, TokenType } = require("../../constants");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {

        return next(
            new ApiError(ErrorCode.AUTH.UNAUTHORIZED)
        );

    }

    const token = authHeader.split(" ")[1];

    try {

        const payload = JwtService.verify(
            token,
            TokenType.ACCESS,
        );

        req.user = payload;

        next();

    } catch (err) {

        next(err);

    }

};