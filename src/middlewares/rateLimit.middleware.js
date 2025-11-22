// src/middlewares/rateLimit.middleware.js
import { rateLimit } from "express-rate-limit";

const requestWasSuccessful = (_req, res) => {
  const status = res.statusCode;
  return typeof status === "number" && status >= 200 && status < 400;
};

const limiterOptions = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  requestWasSuccessful,
  passOnStoreError: true,
};

export const authLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Increased from 50 to 100
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

export const generalLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: 500, // Increased from 100 to 500
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});
