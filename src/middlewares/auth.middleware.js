// src/middlewares/auth.middleware.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { verifyAccessToken } from "../config/jwt.js";

/**
 * Protect middleware - verifies access token from Authorization header.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  // 1) Verify access token (only this step should be caught as 401)
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    console.error("JWT verification failed:", err?.message || err);
    res.status(401);
    throw new Error("Not authorized, token invalid or expired");
  }

  // 2) Load user and apply account-level checks (preserve 403s)
  req.user = await User.findById(decoded.id).select("-password");
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized, user not found");
  }

  if (!req.user.emailVerified) {
    res.status(403);
    throw new Error("Please verify your email to access this resource.");
  }

  if (req.user.isActive === false) {
    res.status(403);
    const error = new Error("Account is deactivated. Please contact the administrator.");
    error.code = "ACCOUNT_DEACTIVATED";
    throw error;
  }

  next();
});

/**
 * authorizeRoles(...allowed) - factory to restrict route access by role(s)
 * Usage: authorizeRoles("coach"), authorizeRoles("coach", "admin")
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized, user not authenticated");
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error("Access denied, insufficient permissions");
    }

    next();
  };
};
