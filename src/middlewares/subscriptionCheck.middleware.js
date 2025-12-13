// src/middlewares/subscriptionCheck.middleware.js
import asyncHandler from "express-async-handler";
import PlatformSubscription from "../models/PlatformSubscription.js";
import User from "../models/User.js";

/**
 * Middleware to check if coach's subscription is valid
 * Blocks access if subscription is expired
 * Allows access during trial and active subscription
 */
export const checkCoachSubscription = asyncHandler(async (req, res, next) => {
  // Only check for coaches
  if (req.user?.role !== "coach") {
    return next();
  }

  const userId = req.user._id;

  // Check subscription status
  let subscription = await PlatformSubscription.findOne({ userId });

  // If no subscription record exists, check User model for backward compatibility
  if (!subscription) {
    const user = await User.findById(userId).select("platformSubscriptionStatus trialEndsAt subscriptionExpiresAt");
    
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Create subscription record if user has subscription data
    if (user.platformSubscriptionStatus) {
      subscription = await PlatformSubscription.create({
        userId,
        status: user.platformSubscriptionStatus,
        trialEndsAt: user.trialEndsAt || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        subscriptionExpiresAt: user.subscriptionExpiresAt,
      });
    } else {
      // No subscription data, allow access for now (shouldn't happen for coaches)
      return next();
    }
  }

  // Check if subscription is valid
  const isValid = subscription.isValid();

  if (!isValid) {
    // Update status to expired if not already
    if (subscription.status !== "expired") {
      subscription.status = "expired";
      await subscription.save();

      // Also update user model
      await User.findByIdAndUpdate(userId, {
        platformSubscriptionStatus: "expired",
      });
    }

    // Block access - return 403 with specific error code
    res.status(403);
    const error = new Error("Your subscription has expired. Please renew to continue.");
    error.code = "SUBSCRIPTION_EXPIRED";
    throw error;
  }

  // Subscription is valid, allow access
  req.subscription = subscription; // Attach to request for use in controllers
  next();
});

/**
 * Middleware that allows access only to subscription payment routes for expired coaches
 */
export const allowSubscriptionRoutes = asyncHandler(async (req, res, next) => {
  // Only apply to coaches
  if (req.user?.role !== "coach") {
    return next();
  }

  const userId = req.user._id;
  const subscription = await PlatformSubscription.findOne({ userId });

  if (!subscription) {
    return next();
  }

  // If expired, only allow access to subscription routes
  if (!subscription.isValid()) {
    // Allow these specific routes
    const allowedPaths = [
      "/api/v1/platform-subscription/status",
      "/api/v1/platform-subscription/payment",
      "/api/v1/platform-subscription/history",
      "/api/v1/auth/logout",
      "/api/v1/auth/logout-all",
      "/api/v1/users/me",
    ];

    const path = req.path;
    const isAllowed = allowedPaths.some((allowed) => path.startsWith(allowed));

    if (!isAllowed) {
      res.status(403);
      const error = new Error("Your subscription has expired. Please renew to continue.");
      error.code = "SUBSCRIPTION_EXPIRED";
      throw error;
    }
  }

  next();
});
