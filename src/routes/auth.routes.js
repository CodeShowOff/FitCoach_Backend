// src/routes/auth.routes.js
import express from "express";
import {
	registerUser,
	verifyRegisterOtp,
	resendRegisterOtp,
	loginUser,
	logoutUser,
	refreshAccessToken,
	logoutAllSessions,
	requestPasswordReset,
	resetPasswordWithOtp,
} from "../controllers/auth.controller.js";
// import { rateLimit } from "express-rate-limit";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 🚦 Rate Limiters for Security
// ------------------------------
// Prevent brute-force attacks on login & register
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // max 10 requests per IP per window
//   message: {
//     success: false,
//     message: "Too many attempts, please try again later.",
//   },
// });

// ------------------------------
// 🧭 Routes
// ------------------------------

// @route   POST /api/v1/auth/register
// @desc    Register new user (coach or client)
router.post("/register", authLimiter, registerUser);

// @route   POST /api/v1/auth/register/verify-otp
// @desc    Verify registration OTP & activate account
router.post("/register/verify-otp", authLimiter, verifyRegisterOtp);

// @route   POST /api/v1/auth/register/resend-otp
// @desc    Resend registration OTP
router.post("/register/resend-otp", authLimiter, resendRegisterOtp);

// @route   POST /api/v1/auth/login
// @desc    Login user
router.post("/login", authLimiter, loginUser);

// @route   POST /api/v1/auth/forgot-password
// @desc    Request password reset (OTP)
router.post("/forgot-password", authLimiter, requestPasswordReset);

// @route   POST /api/v1/auth/reset-password
// @desc    Reset password using OTP
router.post("/reset-password", authLimiter, resetPasswordWithOtp);


router.post("/refresh", refreshAccessToken);

// @route   POST /api/v1/auth/logout
// @desc    Logout user (clears refresh token cookie)
// @access  Public (refresh token in httpOnly cookie provides security)
router.post("/logout", logoutUser);

// @route   POST /api/v1/auth/logout-all
// @desc    Logout user from all sessions/devices
router.post("/logout-all", protect, logoutAllSessions);


export default router;
