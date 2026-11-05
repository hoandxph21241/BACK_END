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
  async sessionResponse(req, res) {
    res.set("Cache-Control", "no-store");
    const user = req.session?.userLogin;
    if (!user) return res.json({ success: true, authenticated: false });
    const nav = await new Promise((resolve, reject) => {
      res.render("inc/_nav_account", { user }, (error, html) => error ? reject(error) : resolve(html));
    });
    return res.json({ success: true, authenticated: true, nav, user: {
      id: user._id, userID: user.userID, fullName: user.fullName,
      imageAccount: user.imageAccount, role: user.role,
    } });
  }

  session = async (req, res, next) => {
    // Previous session response trusted userLogin even after its tokens were revoked.
    try {
      if (req.session?.userLogin) await new Promise((resolve, reject) =>
        require('../../../middlewares/auth/webAccessToken')(req, res, error => error ? reject(error) : resolve()));
      return await this.sessionResponse(req, res);
    } catch (error) {
      if (error.status !== 401) return next(error);
      try {
        if (req.session) await new Promise((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()));
        // Previous: res.clearCookie('connect.sid', { path:'/' });
        // Do not clear the cookie here: this stale request may finish after another login.
        res.set('Cache-Control','no-store').json({ success:true, authenticated:false });
      } catch (failure) { next(failure); }
    }
  };

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
    // Previous: return res.redirect("/home");
    if (req.xhr && req.get("accept")?.includes("application/json")) return this.sessionResponse(req, res);
    return res.redirect("/discover");
  }

  login = async (req, res) => {
    try {
      const data = await AuthService.login(req);
      return await this.finishLogin(req, res, data);
    } catch (error) {
      if (req.xhr && req.get("accept")?.includes("application/json")) {
        res.set("Cache-Control", "no-store");
        return res.status(error instanceof ApiError ? error.status : 500)
          .json({ success: false, code:error.code || "AUTH_UNAVAILABLE", message: messageFor(error), ...(error.retryAfter ? {retryAfter:error.retryAfter}: {}) });
      }
      return res.status(error instanceof ApiError ? error.status : 500)
        .render("auth/sign_in.ejs", { msg: messageFor(error), user: null });
    }
  };

  googleLogin = async (req, res, user, verifiedData = {}) => {
    const security = require('../../account/service/AccountSecurityService');
    let securityGrant;
    try { securityGrant = await security.verifyLogin(user, verifiedData); }
    catch (error) {
      if (!['TWO_FACTOR_REQUIRED','TWO_FACTOR_RATE_LIMIT','ACCOUNT_INACTIVE'].includes(error.code)) throw error;
      if (!req.session.pendingTwoFactor) req.session.pendingTwoFactor = { userId:String(user._id), expiresAt:Date.now()+300000, authVersion:user.authVersion||0, csrf:randomBytes(24).toString('hex'), googleBinding:security.googleIdentity(user) };
      await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
      return this.factorPage(req,res,error);
    }
    delete req.session.pendingTwoFactor;
    if (!user.userID) user.userID = randomUUID();
    if (!user.namePassword) user.namePassword = await PasswordService.hash(randomBytes(32).toString('hex'));
    const tokens = await SessionService.createSession(user, AuthService.getDevice(req), {...AuthService.getSessionContext(req),securityGrant});
    return this.finishLogin(req, res, UserMapper.toLoginResponse(user, tokens));
  };

  factorPage(req,res,error) {
    res.set('Cache-Control','no-store');
    // The only interpolated value is a server-generated hexadecimal CSRF token.
    return res.status(error?.status || 401).type('html').send('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MediaHz - Xác thực đăng nhập</title><body><main><h1>Xác thực đăng nhập</h1><p>Nhập mã ứng dụng xác thực hoặc mã khôi phục. Nếu tài khoản tạm ngừng, xác nhận khôi phục bên dưới.</p><form method="post" action="/auth/two-factor"><input type="hidden" name="csrf" value="'+req.session.pendingTwoFactor.csrf+'"><label>Mã xác thực <input name="twoFactorCode" autocomplete="one-time-code" maxlength="32"></label><p><label><input type="checkbox" name="reactivate" value="true">Khôi phục tài khoản tạm ngừng</label></p><p><label><input type="checkbox" name="cancelDeletion" value="true">Hủy yêu cầu xóa tài khoản</label></p><button type="submit">Tiếp tục</button></form><a href="/auth/signin">Quay lại đăng nhập</a></main></body></html>');
  }

  completeGoogleFactor = async (req,res,next) => {
    try {
      const pending=req.session?.pendingTwoFactor;
      if (!pending || pending.expiresAt<=Date.now() || req.body?.csrf!==pending.csrf) return res.status(401).send('Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.');
      const origin=req.get('Origin');
      if (origin && origin!==req.protocol+'://'+req.get('host') || req.get('Sec-Fetch-Site')==='cross-site') return res.status(403).send('Yêu cầu không cùng nguồn.');
      const user=await require('../../../model/db_song').UserModel.findById(pending.userId);
      if (!user || (user.authVersion||0)!==pending.authVersion) {delete req.session.pendingTwoFactor;return res.status(401).send('Thông tin tài khoản đã thay đổi. Vui lòng đăng nhập lại.');}
      // Retain the provider generation through the server-held second-factor challenge.
      require('../../account/service/AccountSecurityService').rememberGoogleIdentity(user,pending.googleBinding);
      return await this.googleLogin(req,res,user,{twoFactorCode:req.body.twoFactorCode,reactivate:req.body.reactivate==='true'||req.body.reactivate===true,cancelDeletion:req.body.cancelDeletion==='true'||req.body.cancelDeletion===true});
    } catch(error) {next(error);}
  };

  //   googleLogin = async (req, res, user) => {
  //     if (!user.userID) user.userID = randomUUID();
  //     // A random hash satisfies the schema without giving Google users a shared password.
  //     if (!user.namePassword) user.namePassword = await PasswordService.hash(randomBytes(32).toString("hex"));
  //     // Previous: const tokens = await SessionService.createSession(user, AuthService.getDevice(req));
  //     const tokens = await SessionService.createSession(user, AuthService.getDevice(req), AuthService.getSessionContext(req));
  //     return this.finishLogin(req, res, UserMapper.toLoginResponse(user, tokens));
  //   };
  //

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
