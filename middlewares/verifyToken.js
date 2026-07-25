const jwt = require("jsonwebtoken");
const Model = require("../model/db_song");

module.exports = async (req, res, next) => {
  try {
    //---------------------------------------
    // Authorization Header
    //---------------------------------------

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required.",
      });
    }

    //---------------------------------------
    // Bearer Token
    //---------------------------------------

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    //---------------------------------------
    // Verify JWT
    //---------------------------------------

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    //---------------------------------------
    // Find User
    //---------------------------------------

    const user = await Model.UserModel.findById(payload.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User does not exist.",
      });
    }

    //---------------------------------------
    // Save User
    //---------------------------------------

    req.user = user;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access Token expired.",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid Access Token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
