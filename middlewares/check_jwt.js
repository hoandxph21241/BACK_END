const jwtService = require("../service/jwt_service");

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({
      status: "error",
      message: "No token",
    });
  }

  try {
    const token = auth.replace("Bearer ", "");

    req.user = jwtService.verifyToken(token);

    next();
  } catch (e) {
    return res.status(401).json({
      status: "error",
      message: "Token invalid",
    });
  }
};
