const express = require("express");

const AuthController = require("../controller/AuthController");
const verifyToken = require("../../../middlewares/verifyToken");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

// Login
router.post("/login", AuthController.login);

// Register
router.post("/register", AuthController.register);

// Google authentication
router.post("/google", AuthController.googleCallback);

// Refresh access token
router.post("/refresh-token", AuthController.refreshToken);

// // Forgot password
// router.post("/forgot-password", AuthController.forgotPassword);

// // Reset password
// router.post("/reset-password", AuthController.resetPassword);

/*
|--------------------------------------------------------------------------
| Protected routes
|--------------------------------------------------------------------------
*/

// Current user profile
router.get(
  "/profile",
  verifyToken,
  AuthController.profile
);

// Update current user profile
// router.put(
//   "/profile",
//   verifyToken,
//   AuthController.updateProfile
// );

// Change password
router.put(
  "/change-password",
  verifyToken,
  AuthController.changePassword
);

// Logout
router.post(
  "/logout",
  verifyToken,
  AuthController.logout
);

module.exports = router;