const AuthService = require('../../service/auth/AuthService');
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
 
exports.register =   async (req, res) => {
        try {

            const result = await AuthService.register(req);

            if (result.success) {
                return res.status(201).json(result);
            }

            return res.status(400).json(result);

        } catch (err) {

            console.error("Register Controller Error:", err);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });

        }
    }


exports.login = async (req, res) => {

    const result = await AuthService.login(req);

    if(!result.success){
        return res.status(400).json(result);
    }

    return res.json(result);

};

exports.googleLogin = passport.authenticate(
    "google",
    {
        scope: ["profile", "email"],
        session: false,
    }
);
exports.googleCallback = (req, res, next) => {

    passport.authenticate(
        "google",
        {
            session: false,
        },
        async (err, user) => {

            if (err) {
                return res.status(500).json({
                    message: err.message,
                });
            }

            if (!user) {
                return res.status(401).json({
                    message: "Login failed",
                });
            }

            // Gọi AuthService
            return AuthService.googleCallback(req, res, user);

        }
    )(req, res, next);

};

exports.refreshToken = async (req, res) => {
    try {

        const result = await AuthService.refreshToken(req);

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.status(200).json(result);

    } catch (err) {

        console.error("Refresh Token Error:", err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

exports.logout = async (req, res) => {
    try {

        const result = await AuthService.logout(req);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);

    } catch (err) {

        console.error("Logout Error:", err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

exports.profile = async (req, res) => {
    try {

        const result = await AuthService.profile(req);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.json(result);

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};