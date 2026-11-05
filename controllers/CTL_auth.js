var Model = require("../model/db_song");
require("dotenv").config();
const crypto = require("crypto");
const PasswordService = require("../modules/auth/service/PasswordService");

// Previous web handlers retained for reference; plaintext password flow is disabled.
// exports.Register = async (req, res, next) => {
//   let msg = "";
//   try {
//     // Kiểm tra xem người dùng có để trống trường nào không
//     if (!req.body.nameAccount || !req.body.namePassword) {
//       msg = "Vui lòng không để trống trường nào";
//       return res.render("auth/register.ejs", { msg: msg });
//     }
//
//     // Kiểm tra nameAccount
//     const userExists = await Model.UserModel.findOne({
//       nameAccount: req.body.nameAccount,
//     });
//     if (userExists) {
//       msg = "Email is already in use";
//       return res.render("auth/register.ejs", { msg: msg });
//     }
//
//     // Kiểm tra  namePassword và confirmPassword
//     if (req.body.namePassword !== req.body.confirmPassword) {
//       console.log(req.body.namePassword + " " + req.body.confirmPassword);
//       msg = "Password and Confirm Password are incorrect";
//       return res.render("auth/register.ejs", { msg: msg });
//     }
//     const user = new Model.UserModel({
//       nameAccount: req.body.nameAccount,
//       namePassword: req.body.namePassword,
//       role: 1,
//       Authorization: crypto.randomBytes(32).toString("hex"),
//     });
//     const savedUser = await user.save();
//     console.log("Register Success!");
//     console.log("|" + savedUser + "|");
//     msg = "Đăng ký thành công!";
//   } catch (error) {
//     msg = error.message;
//   }
//   res.render("auth/register.ejs", { msg: msg });
// };
//
// exports.SignIn = async (req, res, next) => {
//   let user;
//   let msg = "";
//   if (req.method == "POST") {
//     try {
//       let objU = await Model.UserModel.findOne({
//         nameAccount: req.body.nameAccount,
//       });
//       console.log(objU);
//       if (objU != null) {
//         if (objU.namePassword == req.body.namePassword) {
//           req.session.userLogin = objU;
//           user = objU;
//           console.log("==== Start login ====");
//           console.log(user.fullName);
//           console.log("==== End login ====");
//           msg = "SignIn Success!";
//           if (objU["role"] !== 2) {
//             return res.redirect("/home");
//           } else {
//             return res.redirect("/home");
//           }
//         } else {
//           msg = "Sai mật khẩu!";
//         }
//       } else {
//         msg = "Không tồn tại user " + req.body.nameAccount;
//       }
//     } catch (error) {
//       msg = error.message;
//     }
//   }
//   res.render("auth/sign_in.ejs", { msg: msg, user: user });
// };

const WebAuthController = require("../modules/auth/controller/WebAuthController");
exports.Register = WebAuthController.register;
exports.SignIn = WebAuthController.login;

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const redirect_uri = process.env.GOOGLE_REDIRECT_URI;
const refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
const email_sender = process.env.EMAIL_SENDER;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
);
oAuth2Client.setCredentials({ refresh_token: refresh_token });

exports.googleLogin = async (req,res,next) => {
  try {
    if (!passport._strategy('google')) return res.status(503).send('Google OAuth chưa được cấu hình.');
    if (req.get?.('Sec-Fetch-Site')==='cross-site' && req.query?.link) return res.status(403).send('Yêu cầu không cùng nguồn.');
    if (req.query?.link) {
      const intent=req.session?.accountGoogleIntent;
      if (!intent || typeof req.query.link!=='string' || intent.state!==req.query.link || intent.expiresAt<=Date.now() || intent.owner!==String(req.session.userLogin?._id||'')) return res.status(403).send('Phiên liên kết Google không hợp lệ.');
    } else {
      delete req.session.accountGoogleIntent;
      delete req.session.pendingTwoFactor;
    }
    await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
    return passport.authenticate('google',{scope:['profile','email'],session:false})(req,res,next);
  } catch(error) {next(error);}
};

exports.googleCallback = (req,res,next) => {
  if (!passport._strategy('google')) return res.status(503).send('Google OAuth chưa được cấu hình.');
  passport.authenticate('google',{session:false},async(error,user)=>{
    if(error||!user){delete req.session.accountGoogleIntent;return res.redirect('/auth/signin?oauth=failed');}
    try {
      if(req.accountGoogleLinked){await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));return res.redirect('/users/settings?google=linked');}
      if(!user.profileSlug){await require('../utils/permalinkService').ensureUserProfileSlug(user);user=await Model.UserModel.findById(user._id);}
      return await WebAuthController.googleLogin(req,res,user);
    }catch(failure){return next(failure);}
  })(req,res,next);
};

// Previous web OAuth handlers retained, unloaded.
// exports.googleLogin = (req, res, next) => {
//   passport.authenticate("google", { scope: ["profile", "email"] })(
//     req,
//     res,
//     next
//   );
// };
// 
// exports.googleCallback = (req, res, next) => {
//   passport.authenticate('google', { failureRedirect: '/auth/signin' }, async (err, user, info) => {
//     if (err || !user) return res.redirect('/auth/signin');
// 
//     try {
//       const email = user.gmail;
//       let existingUser = await Model.UserModel.findOne({ gmail: email });
// 
//       if (!existingUser) {
//         // Previous: existingUser = await Model.UserModel.create({
//         existingUser = await require('../utils/permalinkService').createUser({
//           userID: Date.now().toString(),
//           nameAccount: email,
//           // Previous: namePassword: '',
//           namePassword: await PasswordService.hash(crypto.randomBytes(32).toString("hex")),
//           imageAccount: user.imageAccount,
//           userName: email.split('@')[0],
//           fullName: user.fullName,
//           gmail: email,
//           grender: '',
//           role: 1
//         });
//       }
// 
//       // Previous: req.session.userLogin = existingUser;
//       // Previous: return res.redirect('/home');
//       if (!existingUser.profileSlug) {
//         await require('../utils/permalinkService').ensureUserProfileSlug(existingUser);
//         // SessionService requires a hydrated document, not the backfill's lean result.
//         existingUser = await Model.UserModel.findById(existingUser._id);
//       }
//       return await WebAuthController.googleLogin(req, res, existingUser);
// 
//     } catch (error) {
//       console.error("Lỗi lưu user:", error);
//       return res.redirect('/auth/signin');
//     }
//   })(req, res, next);
// };
// 
// 
// Previous logout only destroyed the web session:
// exports.SignOut = async (req, res, next) => {
//   try {
//     // Kiểm tra session
//     if (req.session && Object.keys(req.session).length !== 0) {
//       console.log("Account_session_SignOut");
//       console.log(req.session.user);
//
//       // Hủy session
//       req.session.destroy((err) => {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log("Complete_Data_session");
//         }
//       });
//     } else {
//       console.log("Session_Empty_And_Null");
//     }
//     res.redirect("/auth/signin");
//   } catch (error) {
//     console.error(error);
//     res.redirect("/auth/signin");
//   }
// };
exports.SignOut = WebAuthController.logout;
