// src/routes/subscription.routes.js
import express from "express";
import {
  createSubscription,
  getMySubscriptions,
  getCoachSubscriptions,
  updateSubscriptionStatus,
  getMyCurrentPlan,
  cancelMySubscription,
} from "../controllers/subscription.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 👤 Client Routes
// ------------------------------

// @route   POST /api/v1/subscriptions
// @desc    Create a new subscription (manual payment via QR)
// @access  Private (Client)
router.post("/", protect, authorizeRoles("client"), createSubscription);

// @route   GET /api/v1/subscriptions/my
// @desc    Get all subscriptions for the logged-in client
// @access  Private (Client)
router.get("/my", protect, authorizeRoles("client"), getMySubscriptions);

// @route   GET /api/v1/subscriptions/my/current
// @desc    Get current active plan (subscription/default)
// @access  Private (Client)
router.get(
  "/my/current",
  protect,
  authorizeRoles("client"),
  getMyCurrentPlan
);

// @route   PATCH /api/v1/subscriptions/:id/cancel
// @desc    Cancel a pending or active subscription
// @access  Private (Client)
router.patch(
  "/:id/cancel",
  protect,
  authorizeRoles("client"),
  cancelMySubscription
);

// ------------------------------
// 🧑‍🏫 Coach Routes
// ------------------------------

// @route   GET /api/v1/subscriptions/coach
// @desc    Get all subscriptions related to this coach
// @access  Private (Coach)
router.get("/coach", protect, authorizeRoles("coach"), getCoachSubscriptions);

// @route   PATCH /api/v1/subscriptions/:id/status
// @desc    Approve or reject a client subscription
// @access  Private (Coach/Admin)
router.patch(
  "/:id/status",
  protect,
  authorizeRoles("coach", "admin"),
  updateSubscriptionStatus
);

export default router;
