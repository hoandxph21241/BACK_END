const jwt = require("jsonwebtoken");

class JwtUtil {
  static sign(payload, options = {}) {
    return jwt.sign(payload, process.env.JWT_SECRET, options);
  }
  static verify(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
  static decode(token) {
    return jwt.decode(token);
  }
}
module.exports = JwtUtil;
