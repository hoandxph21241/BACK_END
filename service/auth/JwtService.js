const jwt = require("jsonwebtoken");
const { TokenType } = require("../../constants");

class JwtService {

    static sign(payload, expires) {

        return jwt.sign(

            payload,

            process.env.JWT_SECRET,

            {

                expiresIn: expires,

            }

        );

    }

    static verify(token, type = TokenType.ACCESS) {

        const payload = jwt.verify(

            token,

            process.env.JWT_SECRET

        );

        return payload;

    }

}

module.exports = JwtService;