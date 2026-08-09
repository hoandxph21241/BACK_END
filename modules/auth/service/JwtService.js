const jwt = require("jsonwebtoken");

class JwtService {

    generateAccessToken(user) {

        return jwt.sign(
            {
                id: user._id,
                userID: user.userID,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_ACCESS_EXPIRES,
            }
        );
    }

    generateRefreshToken(user) {

        return jwt.sign(
            {
                id: user._id,
                userID: user.userID,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES,
            }
        );
    }

    verify(token) {

        return jwt.verify(
            token,
            process.env.JWT_SECRET,
        );
    }

}

module.exports = new JwtService();