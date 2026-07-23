const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Model = require("../model/db_song");
const path = require("path");
const passport = require("../../config/api/passport_api");
require("dotenv").config({
    path: path.join(__dirname, "../env/B_E_S.env"),
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID_GOOGLE,
            clientSecret: process.env.CLIENT_SECRET_GOOGLE,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;

                if (!email) {
                    return done(new Error("Google account has no email"));
                }

                let user = await Model.UserModel.findOne({
                    gmail: email,
                });

                if (!user) {
                    user = await Model.UserModel.create({
                        userID: Date.now().toString(),
                        gmail: email,
                        nameAccount: email,
                        namePassword: "",
                        fullName: profile.displayName,
                        userName: email.split("@")[0],
                        imageAccount: profile.photos?.[0]?.value ?? "",
                        role: 1,
                    });
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

module.exports = passport;