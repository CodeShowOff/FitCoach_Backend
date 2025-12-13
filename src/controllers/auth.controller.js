// src/controllers/auth.controller.js
import User from "../models/User.js";
import Token from "../models/Token.js";
import asyncHandler from "express-async-handler";
import Joi from "joi";
import crypto from "crypto";
import {
  getRefreshTokenConfig,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../config/jwt.js";
import {
  sendRegistrationOtpEmail,
  sendResetPasswordOtpEmail,
  sendWelcomeEmail,
} from "../services/email.service.js";
import { createNotification } from "./notifications.controller.js";
import { initializeClientChat } from "../services/chat.service.js";

// ------------------------------
// ⏱️ Shared duration helpers
// ------------------------------
const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;


const parseDurationToMs = (value, fallbackMs = DEFAULT_REFRESH_TOKEN_TTL_MS) => {
  if (!value) return fallbackMs;

  if (typeof value === "number" && value > 0) {
    return value;
  }

  const trimmed = String(value).trim();
  const numeric = Number(trimmed);

  if (!Number.isNaN(numeric) && numeric > 0) {
    // Treat bare numbers like JWT does: seconds -> ms
    return numeric * 1000;
  }

  const match = trimmed.match(/^([0-9]+)\s*([smhdw])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  if (amount <= 0) return fallbackMs;

  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] || 0) || fallbackMs;
};

const REFRESH_TOKEN_TTL_MS = parseDurationToMs(
  getRefreshTokenConfig().expiresIn,
  DEFAULT_REFRESH_TOKEN_TTL_MS
);

const refreshExpiryDate = () => new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

// ------------------------------
// 🔢 OTP helpers
// ------------------------------

const generateNumericOtp = (digits = 6) => {
  const max = 10 ** digits;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(digits, "0");
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

// Timing-safe comparison to prevent timing attacks
const timingSafeCompare = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// ------------------------------
// 🧩 Validation Schemas (Joi)
// ------------------------------
const registerSchema = Joi.object({
  fullName: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("coach", "client").default("client").required(),
  coachId: Joi.when("role", {
    is: "client",
    then: Joi.string().required().label("Coach Referral Code"),
    otherwise: Joi.string().optional(),
  }),
  phone: Joi.string().required(),
  whatsappNumber: Joi.string().required(),
});


const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).required(),
});

const resendRegisterOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

// ------------------------------
// 🔐 Helper: Generate Tokens
// ------------------------------
const generateTokens = (user) => {
  const accessToken = signAccessToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id });

  return { accessToken, refreshToken };
};

// ------------------------------
// 📝 @desc Start registration (send OTP)
// @route POST /api/v1/auth/register
// ------------------------------
export const registerUser = asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const {
    fullName,
    email,
    password,
    role,
    coachId, // this will be the referralCode for clients
    phone,
    whatsappNumber,
  } = value;

  // 1️⃣ Check if a user already exists
  const existingUser = await User.findOne({ email }).select(
    "_id emailVerified emailVerificationOtpExpire"
  );

  if (existingUser && existingUser.emailVerified) {
    res.status(400);
    throw new Error("User already exists with this email");
  }

  // 2️⃣ If client, find coach by referral code
  let assignedCoach = null;
  if (role === "client") {
    const coach = await User.findOne({
      referralCode: coachId,
      role: "coach",
    });
    if (!coach) {
      res.status(400);
      throw new Error("Invalid coach referral code");
    }
    assignedCoach = coach._id;
  }

  // 3️⃣ Generate OTP and hash
  const otp = generateNumericOtp(6);
  const otpHash = hashOtp(otp);
  const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const otpExpire = new Date(Date.now() + OTP_TTL_MS);

  let user;

  if (!existingUser) {
    // Create a new user in inactive/unverified state
    const userData = {
      fullName,
      email,
      password,
      role,
      coachId: assignedCoach,
      coachCode: coachId,
      phone,
      whatsappNumber,
      isActive: false,
      emailVerified: false,
      emailVerificationOtpHash: otpHash,
      emailVerificationOtpExpire: otpExpire,
    };

    // Initialize 28-day trial for coaches
    if (role === "coach") {
      const trialEndsAt = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000); // 28 days from now
      userData.platformSubscriptionStatus = "trial";
      userData.trialEndsAt = trialEndsAt;
    }

    user = await User.create(userData);

    // Create PlatformSubscription record for coaches
    if (role === "coach") {
      const PlatformSubscription = (await import("../models/PlatformSubscription.js")).default;
      await PlatformSubscription.create({
        userId: user._id,
        status: "trial",
        trialEndsAt: userData.trialEndsAt,
      });
    }
  } else {
    // Update existing unverified user with new data & OTP
    existingUser.emailVerificationOtpHash = otpHash;
    existingUser.emailVerificationOtpExpire = otpExpire;
    user = await existingUser.save();
  }

  // 4️⃣ Send OTP email
  try {
    await sendRegistrationOtpEmail({
      to: email,
      fullName,
      otp,
    });
  } catch (e) {
    res.status(500);
    throw new Error("Failed to send verification email. Please try again or contact support.");
  }

  res.status(200).json({
    success: true,
    message: "Verification code sent to your email. Please verify to complete registration.",
    data: {
      email,
    },
  });
});

// ------------------------------
// 🔁 @desc Resend registration OTP
// @route POST /api/v1/auth/register/resend-otp
// ------------------------------
export const resendRegisterOtp = asyncHandler(async (req, res) => {
  const { error, value } = resendRegisterOtpSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { email } = value;

  const user = await User.findOne({ email }).select(
    "fullName emailVerified emailVerificationOtpExpire emailVerificationOtpHash"
  );

  if (!user) {
    // Do not reveal if user exists
    return res.status(200).json({
      success: true,
      message: "If a registration exists for this email, a new code has been sent.",
    });
  }

  if (user.emailVerified) {
    return res.status(400).json({
      success: false,
      message: "This email is already verified. Please log in.",
    });
  }

  const otp = generateNumericOtp(6);
  const otpHash = hashOtp(otp);
  const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

  user.emailVerificationOtpHash = otpHash;
  user.emailVerificationOtpExpire = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  try {
    await sendRegistrationOtpEmail({
      to: user.email,
      fullName: user.fullName,
      otp,
    });
  } catch (e) {
    res.status(500);
    throw new Error("Failed to send verification email. Please try again or contact support.");
  }

  res.status(200).json({
    success: true,
    message: "If a registration exists for this email, a new code has been sent.",
  });
});

// ------------------------------
// ✅ @desc Verify registration OTP & activate account
// @route POST /api/v1/auth/register/verify-otp
// ------------------------------
const verifyRegisterOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

export const verifyRegisterOtp = asyncHandler(async (req, res) => {
  const { error, value } = verifyRegisterOtpSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { email, otp } = value;

  const user = await User.findOne({ email }).select(
    "+password email emailVerificationOtpHash emailVerificationOtpExpire isActive emailVerified fullName role coachId coachCode phone whatsappNumber"
  );

  if (!user) {
    res.status(400);
    throw new Error("Registration session not found. Please register again.");
  }

  if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpire) {
    res.status(400);
    throw new Error("No active verification code found. Please request a new one.");
  }

  if (user.emailVerificationOtpExpire < new Date()) {
    res.status(400);
    throw new Error("Verification code has expired. Please request a new one.");
  }

  const incomingHash = hashOtp(otp);
  if (!timingSafeCompare(incomingHash, user.emailVerificationOtpHash)) {
    res.status(400);
    throw new Error("Invalid verification code");
  }

  // Mark email as verified & activate account
  user.emailVerified = true;
  user.isActive = true;
  user.emailVerificationOtpHash = undefined;
  user.emailVerificationOtpExpire = undefined;
  await user.save();

  const tokens = generateTokens(user);

  await Token.create({
    userId: user._id,
    token: tokens.refreshToken,
    expiresAt: refreshExpiryDate(),
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: REFRESH_TOKEN_TTL_MS,
  });

  // Send welcome email asynchronously (no await needed for user experience)
  sendWelcomeEmail({
    to: user.email,
    fullName: user.fullName,
  }).catch(() => {});

  // Create welcome notification for the user
  createNotification({
    recipientId: user._id,
    title: "Welcome to the Platform!",
    message: `Hi ${user.fullName}! Welcome aboard. We're excited to have you here. Start exploring your dashboard to get started.`,
    type: "system",
  }).catch(() => {});

  // Initialize chat for clients (add to coach's global broadcast + create direct chat)
  if (user.role === "client" && user.coachId) {
    initializeClientChat(user._id, user.coachId).catch((err) => {
      console.error("Failed to initialize client chat:", err);
    });
  }

  res.status(200).json({
    success: true,
    message: "Email verified and account activated successfully",
    data: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      coachId: user.coachId,
      referralCode: user.referralCode,
      coachCode: user.coachCode,
      avatarUrl: user.avatarUrl,
      tokens: { accessToken: tokens.accessToken },
    },
  });
});


// ------------------------------
// 🔑 @desc Login user
// @route POST /api/v1/auth/login
// ------------------------------
export const loginUser = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { email, password } = value;

  let user;
  try {
    user = await User.findOne({ email }).select("+password");
  } catch (dbError) {
    console.error("Database error during login:", dbError);
    res.status(503);
    throw new Error("Unable to connect to the database. Please try again later.");
  }

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.emailVerified) {
    // Generate OTP and send email
    const otp = generateNumericOtp(6);
    const otpHash = hashOtp(otp);
    const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
    const otpExpire = new Date(Date.now() + OTP_TTL_MS);

    user.emailVerificationOtpHash = otpHash;
    user.emailVerificationOtpExpire = otpExpire;
    await user.save();

    try {
      await sendRegistrationOtpEmail({
        to: user.email,
        fullName: user.fullName,
        otp,
      });
    } catch (e) {
      res.status(500);
      throw new Error("Failed to send verification email. Please try again or contact support.");
    }

    return res.status(403).json({
      success: false,
      message: "Email not verified",
      requiresVerification: true,
      email: user.email,
    });
  }

  if (user.isActive === false) {
    res.status(403);
    throw new Error(
      "Your account has been deactivated by the admin. Please contact admin at mail.pulseledger@gmail.com to reactivate."
    );
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const tokens = generateTokens(user);

  // Store refresh token for this session (do not revoke other devices)
  try {
    // Clean up expired tokens for this user
    await Token.deleteMany({ 
      userId: user._id, 
      expiresAt: { $lt: new Date() } 
    });

    await Token.create({
      userId: user._id,
      token: tokens.refreshToken,
      expiresAt: refreshExpiryDate(),
    });
  } catch (dbError) {
    console.error("Database error creating token:", dbError);
    res.status(503);
    throw new Error("Unable to complete login. Please try again.");
  }

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: REFRESH_TOKEN_TTL_MS,
  });

  res.json({
    success: true,
    message: "Login successful",
    data: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode,
      coachId: user.coachId,
      avatarUrl: user.avatarUrl,
      // Do not expose refresh token to JS; send only access token here
      tokens: { accessToken: tokens.accessToken },
    },
  });
});

// ------------------------------
// 🔁 @desc Request password reset (send OTP)
// @route POST /api/v1/auth/forgot-password
// ------------------------------
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { error, value } = forgotPasswordSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { email } = value;

  const user = await User.findOne({ email });
  if (!user) {
    // Do not reveal whether user exists
    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, a reset code has been sent.",
    });
  }

  const otp = generateNumericOtp(6);
  const otpHash = hashOtp(otp);
  const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

  user.resetPasswordToken = otpHash;
  user.resetPasswordExpire = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  try {
    await sendResetPasswordOtpEmail({
      to: user.email,
      fullName: user.fullName,
      otp,
    });
  } catch (e) {
    res.status(500);
    throw new Error("Failed to send reset password email. Please try again or contact support.");
  }

  res.status(200).json({
    success: true,
    message: "If an account exists for this email, a reset code has been sent.",
  });
});

// ------------------------------
// 🔒 @desc Reset password with OTP
// @route POST /api/v1/auth/reset-password
// ------------------------------
export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { email, otp, newPassword } = value;

  const user = await User.findOne({ email }).select("resetPasswordToken resetPasswordExpire password");
  if (!user || !user.resetPasswordToken || !user.resetPasswordExpire) {
    res.status(400);
    throw new Error("Invalid or expired reset code");
  }

  if (user.resetPasswordExpire < new Date()) {
    res.status(400);
    throw new Error("Reset code has expired. Please request a new one.");
  }

  const incomingHash = hashOtp(otp);
  if (!timingSafeCompare(incomingHash, user.resetPasswordToken)) {
    res.status(400);
    throw new Error("Invalid reset code");
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Security: Invalidate all existing sessions after password reset
  await Token.deleteMany({ userId: user._id });

  res.status(200).json({
    success: true,
    message: "Password has been reset successfully. Please login with your new password.",
  });
});

// ------------------------------
// 🚪 @desc Logout user
// @route POST /api/v1/auth/logout
// ------------------------------
export const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await Token.deleteOne({ token: refreshToken });
  }
  const secure = process.env.NODE_ENV === "production";
  const sameSite = secure ? "none" : "lax";
  // Clear cookie with the same attributes it was set with for reliability across browsers
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});


// ------------------------------
// 🚪 @desc Logout from all sessions/devices
// @route POST /api/v1/auth/logout-all
// @access Protected
// ------------------------------
export const logoutAllSessions = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (userId) {
    await Token.deleteMany({ userId });
  }

  const secure = process.env.NODE_ENV === "production";
  const sameSite = secure ? "none" : "lax";
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out from all sessions",
  });
});


// ------------------------------
// ♻️ @desc Refresh access token
// @route POST /api/v1/auth/refresh
// @access Public (uses secure cookie)
// ------------------------------
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401);
    throw new Error("Not authenticated. Please log in to continue.");
  }

  // Check token existence in DB
  const storedToken = await Token.findOne({ token: refreshToken });
  if (!storedToken) {
    res.status(403);
    throw new Error("Invalid or revoked refresh token");
  }

  // Verify signature first before any DB operations
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    await Token.deleteOne({ token: refreshToken }); // cleanup
    res.status(403);
    throw new Error("Invalid or expired refresh token");
  }

  // Fetch user to ensure account is valid and get current role
  const user = await User.findById(decoded.id);
  if (!user) {
    await Token.deleteOne({ token: refreshToken });
    res.status(401);
    throw new Error("User no longer exists");
  }

  // Check if user's email is verified
  if (!user.emailVerified) {
    await Token.deleteOne({ token: refreshToken });
    res.status(403);
    throw new Error("Email verification required");
  }

  // Check if user's account is active
  if (user.isActive === false) {
    await Token.deleteOne({ token: refreshToken });
    res.status(403);
    const error = new Error("Account is deactivated. Please contact the administrator.");
    error.code = "ACCOUNT_DEACTIVATED";
    throw error;
  }

  // Issue new access token with fresh role
  const newAccessToken = signAccessToken({ id: user._id, role: user.role });

  // (Optional) Rotate refresh token for extra safety
  const newRefreshToken = signRefreshToken({ id: user._id });

  // Update DB token with optimistic locking to prevent race conditions
  const updateResult = await Token.findOneAndUpdate(
    { _id: storedToken._id, token: refreshToken }, // ensure it hasn't changed
    { token: newRefreshToken, expiresAt: refreshExpiryDate() },
    { new: true }
  );

  if (!updateResult) {
    res.status(403);
    throw new Error("Token was already refreshed. Please try again.");
  }

  // Send new refresh token cookie
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: REFRESH_TOKEN_TTL_MS,
  });

  res.json({
    success: true,
    message: "Access token refreshed successfully",
    accessToken: newAccessToken,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode,
      coachId: user.coachId,
      avatarUrl: user.avatarUrl,
    },
  });
});
