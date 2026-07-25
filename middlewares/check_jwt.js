const jwtService = require("../service/jwt_service");

// module.exports = (req, res, next) => {
//   const auth = req.headers.authorization;

//   if (!auth) {
//     return res.status(401).json({
//       status: "error",
//       message: "No token",
//     });
//   }

//   try {
//     const token = auth.replace("Bearer ", "");

//     req.user = jwtService.verifyToken(token);

//     next();
//   } catch (e) {
//     return res.status(401).json({
//       status: "error",
//       message: "Token invalid",
//     });
//   }
// };


const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    const auth = req.headers.authorization;

    if (!auth) {
        return res.status(401).json({
            success: false,
            message: "Missing token",
        });
    }

    const token = auth.split(" ")[1];

    try {

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET,
        );

        req.user = payload;

        next();

    } catch {

        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });

    }

};