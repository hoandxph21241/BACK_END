const JwtService = require("../../service/auth/JwtService");
const { TokenType } = require("../../constants");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {

        return next();

    }

    try {

        const token = authHeader.split(" ")[1];

        req.user = JwtService.verify(

            token,

            TokenType.ACCESS

        );

    } catch (err) {}

    next();

};