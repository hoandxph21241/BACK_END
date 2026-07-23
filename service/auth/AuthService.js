const Model = require("../../model/db_song");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

class AuthService {

    async register(req) {
        try {
            const { nameAccount, namePassword, confirmPassword, fullName, gmail } =
                req.body;

            //------------------------------------
            // Validate
            //------------------------------------

            if (!nameAccount || !namePassword) {
                return {
                    success: false,
                    message: "Please enter account and password.",
                };
            }

            if (namePassword !== confirmPassword) {
                return {
                    success: false,
                    message: "Password confirmation does not match.",
                };
            }

            //------------------------------------
            // Check account
            //------------------------------------

            const exists = await Model.UserModel.findOne({
                nameAccount,
            });

            if (exists) {
                return {
                    success: false,
                    message: "Account already exists.",
                };
            }

            //------------------------------------
            // Encrypt password
            //------------------------------------

            const hashPassword = await bcrypt.hash(namePassword, 10);

            //------------------------------------
            // Create User
            //------------------------------------

            const user = await Model.UserModel.create({
                userID: crypto.randomUUID(),

                nameAccount,

                namePassword: hashPassword,

                fullName: fullName ?? "",

                gmail: gmail ?? "",

                Authorization: "",

                refreshToken: "",

                role: 1,
            });

            //------------------------------------
            // Success
            //------------------------------------

            return {
                success: true,

                message: "Register successfully.",

                data: {
                    id: user._id,

                    userID: user.userID,

                    account: user.nameAccount,
                },
            };
        } catch (err) {
            return {
                success: false,

                message: err.message,
            };
        }
    }

    async login(req) {
        try {
            const { nameAccount, namePassword } = req.body;
            //------------------------------------
            // Validate
            //------------------------------------
            if (!nameAccount || !namePassword) {
                return {
                    success: false,
                    message: "Please enter account and password.",
                };
            }
            //------------------------------------
            // Find User
            //------------------------------------

            const user = await Model.UserModel.findOne({
                nameAccount,
            });
            if (!user) {
                return {
                    success: false,
                    message: "Account does not exist.",
                };
            }
            //------------------------------------
            // Compare Password
            //------------------------------------
            const isMatch = await bcrypt.compare(namePassword, user.namePassword);
            if (!isMatch) {
                return {
                    success: false,
                    message: "Incorrect password.",
                };
            }
            //------------------------------------
            // Generate JWT
            //------------------------------------
            const accessToken = jwt.sign(
                {
                    id: user._id,
                    userID: user.userID,
                    role: user.role,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "30m",
                },
            );
            //------------------------------------
            // Generate Refresh Token
            //------------------------------------
            const refreshToken = jwt.sign(
                {
                    id: user._id,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRES,
                },
            );
            //------------------------------------
            // Save Refresh Token
            //------------------------------------
            user.refreshToken = refreshToken;
            await user.save();
            //------------------------------------
            // Success
            //------------------------------------
            return {
                success: true,
                message: "Login successfully.",
                accessToken,
                refreshToken,
                data: {
                    id: user._id,
                    userID: user.userID,
                    account: user.nameAccount,
                    fullName: user.fullName,
                    avatar: user.imageAccount,
                    gmail: user.gmail,
                    role: user.role,
                },
            };
        } catch (err) {
            return {
                success: false,
                message: err.message,
            };
        }
    }

    async refreshToken(req) {
        try {

            //------------------------------------
            // Get Refresh Token
            //------------------------------------

            const { refreshToken } = req.body;

            if (!refreshToken) {
                return {
                    success: false,
                    message: "Refresh token is required."
                };
            }

            //------------------------------------
            // Verify JWT
            //------------------------------------

            let payload;

            try {

                payload = jwt.verify(
                    refreshToken,
                    process.env.JWT_SECRET
                );

            } catch (err) {

                return {
                    success: false,
                    message: "Refresh token is invalid."
                };

            }

            //------------------------------------
            // Find User
            //------------------------------------

            const user = await Model.UserModel.findById(payload.id);

            if (!user) {
                return {
                    success: false,
                    message: "User not found."
                };
            }

            //------------------------------------
            // Compare Refresh Token
            //------------------------------------

            if (user.refreshToken !== refreshToken) {

                return {
                    success: false,
                    message: "Refresh token has expired."
                };

            }

            //------------------------------------
            // Generate New Access Token
            //------------------------------------

            const accessToken = jwt.sign(
                {
                    id: user._id,
                    userID: user.userID,
                    role: user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "30m"
                }
            );

            //------------------------------------
            // Generate New Refresh Token
            //------------------------------------

            const newRefreshToken = jwt.sign(
                {
                    id: user._id
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRES
                }
            );

            //------------------------------------
            // Save New Refresh Token
            //------------------------------------

            user.refreshToken = newRefreshToken;

            await user.save();

            //------------------------------------
            // Return
            //------------------------------------

            return {

                success: true,

                message: "Refresh token successfully.",

                accessToken,

                refreshToken: newRefreshToken

            };

        } catch (err) {

            return {

                success: false,

                message: err.message

            };

        }
    }

    async logout(req) {
        try {

            //------------------------------------
            // Get Refresh Token
            //------------------------------------

            const { refreshToken } = req.body;

            if (!refreshToken) {
                return {
                    success: false,
                    message: "Refresh token is required."
                };
            }

            //------------------------------------
            // Find User
            //------------------------------------

            const user = await Model.UserModel.findOne({
                refreshToken
            });

            if (!user) {
                return {
                    success: false,
                    message: "User not found."
                };
            }

            //------------------------------------
            // Remove Refresh Token
            //------------------------------------

            user.refreshToken = "";

            await user.save();

            //------------------------------------
            // Success
            //------------------------------------

            return {
                success: true,
                message: "Logout successfully."
            };

        } catch (err) {

            return {
                success: false,
                message: err.message
            };

        }
    }

    async googleLogin(req, res, next) {

        return passport.authenticate(
            "google",
            {
                scope: [
                    "profile",
                    "email",
                ],
                session: false,
            }
        )(req, res, next);

    }

    async googleCallback(req) {
        try {

            //------------------------------------
            // Get Google User
            //------------------------------------

            const googleUser = req.user;
            if (!googleUser) {
                return {
                    success: false,
                    message: "Google authentication failed."
                };
            }

            //------------------------------------
            // Find User By Gmail
            //------------------------------------

            let user = await Model.UserModel.findOne({
                gmail: googleUser.gmail
            });

            //------------------------------------
            // Create User If Not Exists
            //------------------------------------

            if (!user) {
                user = await Model.UserModel.create({
                    userID: crypto.randomUUID(),
                    nameAccount: googleUser.gmail,
                    namePassword: "",
                    gmail: googleUser.gmail,
                    fullName: googleUser.fullName,
                    imageAccount: googleUser.imageAccount,
                    Authorization: "",
                    refreshToken: "",
                    role: 1

                });

            }

            //------------------------------------
            // Generate Access Token
            //------------------------------------

            const accessToken = jwt.sign(
                {
                    id: user._id,
                    userID: user.userID,
                    role: user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "30m"
                }
            );
            //------------------------------------
            // Generate Refresh Token
            //------------------------------------
            const refreshToken = jwt.sign(
                {
                    id: user._id
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRES
                }
            );
            //------------------------------------
            // Save Refresh Token
            //------------------------------------
            user.refreshToken = refreshToken;

            await user.save();

            //------------------------------------
            // Return
            //------------------------------------

            return {
                success: true,
                message: "Google login successfully.",
                accessToken,
                refreshToken,
                data: {
                    id: user._id,
                    userID: user.userID,
                    account: user.nameAccount,
                    fullName: user.fullName,
                    gmail: user.gmail,
                    avatar: user.imageAccount,
                    role: user.role
                }
            };
        } catch (err) {
            return {
                success: false,
                message: err.message
            };
        }
    }
}

module.exports = new AuthService();
