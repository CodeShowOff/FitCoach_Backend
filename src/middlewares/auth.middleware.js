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

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500);
    throw new Error("Server misconfiguration, JWT secret missing");
  }

  try {
    const decoded = verifyAccessToken(token);
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
      throw new Error("Account is deactivated. Please contact the administrator.");
    }
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(401);
    throw new Error("Not authorized, token invalid or expired");
  }
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
