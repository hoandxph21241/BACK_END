const BaseController = require("../../../common/controller/BaseController");
const AuthService = require("../service/AuthService");
const UserMapper = require("../mapper/UserMapper");

class AuthController extends BaseController {
  constructor() {
    super(AuthService, UserMapper);
  }

  // POST /api/auth/login
  login = async (req, res) => {
    const data = await this.service.login(req);

    return this.success(res, data);
  };

  // POST /api/auth/register
  register = async (req, res) => {
    const data = await this.service.register(req.body);

    return this.success(res, data);
  };

  // POST /api/auth/refresh-token
  refreshToken = async (req, res) => {
    const data = await this.service.refreshToken(
      req.body.refreshToken
    );

    return this.success(res, data);
  };

  // POST /api/auth/logout
  logout = async (req, res) => {
    const data = await this.service.logout(
      req.body.refreshToken
    );

    return this.success(res, data);
  };

  // POST /api/auth/logout-all
  logoutAll = async (req, res) => {
    await this.service.logoutAll(req.user.userId);

    return this.success(res, null);
  };

  // POST /api/auth/google
  googleCallback = async (req, res) => {
    const data = await this.service.googleCallback(req.body);

    return this.success(res, data);
  };

  // GET /api/auth/profile
  profile = async (req, res) => {
    const data = await this.service.profile(req.user.userId);

    return this.success(res, data);
  };

  // PUT /api/auth/change-password
  changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    await this.service.changePassword(
      req.user.userId,
      oldPassword,
      newPassword
    );

    return this.success(res, null);
  };

  // POST /api/auth/revoke-token
  revokeToken = async (req, res) => {
    const data = await this.service.revokeToken(
      req.body.refreshToken
    );

    return this.success(res, data);
  };

  // POST /api/auth/verify-access-token
  verifyAccessToken = async (req, res) => {
    const data = await this.service.verifyAccessToken(
      req.body.token
    );

    return this.success(res, data);
  };

  // POST /api/auth/verify-refresh-token
  verifyRefreshToken = async (req, res) => {
    const data = await this.service.verifyRefreshToken(
      req.body.token
    );

    return this.success(res, data);
  };
}

module.exports = new AuthController();