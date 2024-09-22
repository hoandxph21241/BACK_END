var Model = require("../model/db_song");

exports.Register = async (req, res, next) => {
  let msg = "";
  try {
    // Kiểm tra xem người dùng có để trống trường nào không
    if (!req.body.nameAccount || !req.body.namePassword) {
      msg = "Vui lòng không để trống trường nào";
      return res.render("auth/register.ejs", { msg: msg });
    }

    // Kiểm tra nameAccount
    const userExists = await Model.UserModel.findOne({
      nameAccount: req.body.nameAccount,
    });
    if (userExists) {
      msg = "Email is already in use";
      return res.render("auth/register.ejs", { msg: msg });
    }

    // Kiểm tra  namePassword và confirmPassword
    if (req.body.namePassword !== req.body.confirmPassword) {
      console.log(req.body.namePassword + " " + req.body.confirmPassword);
      msg = "Password and Confirm Password are incorrect";
      return res.render("auth/register.ejs", { msg: msg });
    }
    const user = new Model.UserModel({
      nameAccount: req.body.nameAccount,
      namePassword: req.body.namePassword,
      role: 1,
    });
    const savedUser = await user.save();
    console.log("Register Success!");
    console.log("|" + savedUser + "|");
    msg = "Đăng ký thành công!";
  } catch (error) {
    msg = error.message;
  }
  res.render("auth/register.ejs", { msg: msg });
};

exports.SignIn = async (req, res, next) => {
  let user;
  let msg = "";
  if (req.method == "POST") {
    try {
      let objU = await Model.UserModel.findOne({
        nameAccount: req.body.nameAccount,
      });
      console.log(objU);
      if (objU != null) {
        if (objU.namePassword == req.body.namePassword) {
          req.session.userLogin = objU;
          user = objU;
          console.log("==== Start login ====");
          console.log(user.fullName);
          console.log("==== End login ====");
          msg = "SignIn Success!";
          if (objU["role"] !== 2) {
            return res.redirect("/home");
          } else {
            return res.redirect("/home");
          }
        } else {
          msg = "Sai mật khẩu!";
        }
      } else {
        msg = "Không tồn tại user " + req.body.nameAccount;
      }
    } catch (error) {
      msg = error.message;
    }
  }
  res.render("auth/sign_in.ejs", { msg: msg, user: user });
};

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const client_id = "300181281255-1j7l2fmmm18u901kitvjtp6fjgb7ftlr.apps.googleusercontent.com";
const client_secret = "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";
// const redirect_uri = "htttps://developers.google.com/oauthplayground";
const redirect_uri = "http://localhost:3000/auth/google";
const refresh_token = "1//0401_MnbQxNI9CgYIARAAGAQSNwF-L9IrwTmvFFX4MCOSgq5FLmoQttpMG9qhm21xbRHfcQBleRmgdwn4litO5OG19NtsOnDqvn0";
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
  oAuth2Client.setCredentials({ refresh_token: refresh_token });


exports.Google = function(req, res, next) {
  passport.use(new GoogleStrategy({
      clientID: client_id,
      clientSecret: client_secret,
      callbackURL: redirect_uri
    },
    function(accessToken, refreshToken, profile, cb) {
      // Tìm hoặc tạo người dùng trong cơ sở dữ liệu của bạn
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  ));
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  passport.authenticate('google', { failureRedirect: '/auth/signin' }),
  function(req, res) {
    res.redirect('/home');
    sendMail(req.user.email);
  }
  async function sendMail(userEmail) {
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    );

    try {
      const accessToken = await oAuth2Client.getAccessToken();
      const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: 'hzdev231@gmail.com',
          clientId: client_id,
          clientSecret: client_secret,
          refreshToken: refresh_token,
          accessToken: accessToken,
        },
      });
      const mailOptions = {
        from: 'HZ_DEV 🎉<hzdev231@gmail.com>',
        to: userEmail,
        subject: 'Hello, Welcome to Shoes Shop',
        text: 'Hello guy',
        html: '<h1> Finish Login </h1>',
      };
      const result = await transport.sendMail(mailOptions);
      return result;
    } catch (err) {
      return err;
    }
  }
}


exports.SignOut = async (req, res, next) => {
  try {
    // Kiểm tra session
    if (req.session && Object.keys(req.session).length !== 0) {
      console.log("Account_session_SignOut");
      console.log(req.session.user);

      // Hủy session
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Complete_Data_session");
        }
      });
    } else {
      console.log("Session_Empty_And_Null");
    }
    res.redirect("/auth/signin");
  } catch (error) {
    console.error(error);
    res.redirect("/auth/signin");
  }
};
