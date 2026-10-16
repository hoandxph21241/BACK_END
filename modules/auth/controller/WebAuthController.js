const AuthService = require("../service/AuthService");
const ApiError = require("../../../utils/ApiError");
const SessionService = require("../service/SessionService");
const UserMapper = require("../mapper/UserMapper");
const PasswordService = require("../service/PasswordService");
const { randomUUID, randomBytes } = require("crypto");

function messageFor(error) {
  const messages = {
    AUTH_001: "Tài khoản đã được sử dụng.",
    AUTH_002: "Tài khoản hoặc mật khẩu không đúng.",
    AUTH_003: "Tài khoản hoặc mật khẩu không đúng.",
  };
  if (!(error instanceof ApiError)) return "Không thể xử lý lúc này. Vui lòng thử lại sau.";
  return messages[error.code] || error.message;
}

class WebAuthController {
  register = async (req, res) => {
    try {
      if (!req.body?.confirmPassword) {
        return res.status(400).render("auth/register.ejs", {
          msg: "Vui lòng xác nhận mật khẩu.",
        });
      }
      await AuthService.register(req.body, req, { issueTokens: false });
      return res.render("auth/register.ejs", { msg: "Đăng ký thành công!" });
    } catch (error) {
      return res.status(error instanceof ApiError ? error.status : 500)
        .render("auth/register.ejs", { msg: messageFor(error) });
    }
  };

  // Previous web login without refresh tokens:
  //   login = async (req, res) => {
  //     try {
  //       const user = await AuthService.login(req, { issueTokens: false });
  //       await new Promise((resolve, reject) => {
  //         req.session.regenerate((error) => error ? reject(error) : resolve());
  //       });
  //       req.session.userLogin = {
  //         _id: user.id,
  //         userID: user.userID,
  //         nameAccount: user.account,
  //         fullName: user.fullName || "",
  //         imageAccount: user.avatar || "",
  //         gmail: user.gmail || "",
  //         role: user.role,
  //       };
  //       await new Promise((resolve, reject) => {
  //         req.session.save((error) => error ? reject(error) : resolve());
  //       });
  //       return res.redirect("/home");
  //     } catch (error) {
  //       return res.status(error instanceof ApiError ? error.status : 500)
  //         .render("auth/sign_in.ejs", { msg: messageFor(error), user: null });
  //     }
  //   };
  async finishLogin(req, res, data) {
    const { user, accessToken, refreshToken } = data;
    try {
      await new Promise((resolve, reject) => {
        req.session.regenerate((error) => error ? reject(error) : resolve());
      });
      req.session.userLogin = {
        _id: user.id,
        userID: user.userID,
        nameAccount: user.account,
        fullName: user.fullName || "",
        imageAccount: user.avatar || "",
        gmail: user.gmail || "",
        role: user.role,
      };
      // Tokens stay server-side, outside userLogin which is used by views.
      req.session.authTokens = { accessToken, refreshToken };
      await new Promise((resolve, reject) => {
        req.session.save((error) => error ? reject(error) : resolve());
      });
    } catch (error) {
      if (req.session) {
        delete req.session.userLogin;
        delete req.session.authTokens;
        await new Promise(resolve => req.session.destroy(() => resolve()));
      }
      await SessionService.removeSession(refreshToken).catch(() => {
        console.error("Cannot revoke refresh token after web session failure.");
      });
      throw error;
    }
    return res.redirect("/home");
  }

  login = async (req, res) => {
    try {
      const data = await AuthService.login(req);
      return await this.finishLogin(req, res, data);
    } catch (error) {
      return res.status(error instanceof ApiError ? error.status : 500)
        .render("auth/sign_in.ejs", { msg: messageFor(error), user: null });
    }
  };

  googleLogin = async (req, res, user) => {
    if (!user.userID) user.userID = randomUUID();
    // A random hash satisfies the schema without giving Google users a shared password.
    if (!user.namePassword) user.namePassword = await PasswordService.hash(randomBytes(32).toString("hex"));
    // Previous: const tokens = await SessionService.createSession(user, AuthService.getDevice(req));
    const tokens = await SessionService.createSession(user, AuthService.getDevice(req), AuthService.getSessionContext(req));
    return this.finishLogin(req, res, UserMapper.toLoginResponse(user, tokens));
  };

  logout = async (req, res, next) => {
    let failure;
    try {
      await SessionService.removeSession(req.session?.authTokens?.refreshToken);
    } catch (error) {
      failure = error;
    }
    if (req.session) {
      await new Promise(resolve => req.session.destroy(error => {
        if (error && !failure) failure = error;
        resolve();
      }));
    }
    res.clearCookie("connect.sid");
    if (failure) return next(failure);
    return res.redirect("/auth/signin");
  };
}

module.exports = new WebAuthController();