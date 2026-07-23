const jwt = require("jsonwebtoken");

exports.generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            gmail: user.gmail,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES,
        }
    );
};

exports.verifyToken = (token) => {
    return jwt.verify(
        token,
        process.env.JWT_SECRET
    );
};