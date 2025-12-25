// src/routes/coachWorkoutPlan.routes.js
import express from "express";
import {
  createCoachWorkoutPlan,
  getCoachWorkoutPlans,
  getCoachWorkoutPlanById,
  updateCoachWorkoutPlan,
  deleteCoachWorkoutPlan,
  createFromTemplate,
  assignToSubscriptionPlan,
  unassignFromSubscriptionPlan,
} from "../controllers/coachWorkoutPlan.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { checkCoachSubscription } from "../middlewares/subscriptionCheck.middleware.js";

const router = express.Router();

// All routes require coach authentication and active subscription
router.use(protect, authorizeRoles("coach"), checkCoachSubscription);

// ------------------------------
// 📋 CRUD Routes
// ------------------------------

// @route   GET /api/v1/coach/workout-plans
// @desc    Get all workout plans for the coach
// @access  Private (Coach only)
router.get("/", getCoachWorkoutPlans);

// @route   POST /api/v1/coach/workout-plans
// @desc    Create a new workout plan
// @access  Private (Coach only)
router.post("/", createCoachWorkoutPlan);

// @route   POST /api/v1/coach/workout-plans/from-template/:templateId
// @desc    Create a workout plan from a global template
// @access  Private (Coach only)
router.post("/from-template/:templateId", createFromTemplate);

// @route   GET /api/v1/coach/workout-plans/:id
// @desc    Get workout plan by ID
// @access  Private (Coach only)
router.get("/:id", getCoachWorkoutPlanById);

// @route   PATCH /api/v1/coach/workout-plans/:id
// @desc    Update a workout plan
// @access  Private (Coach only)
router.patch("/:id", updateCoachWorkoutPlan);

// @route   DELETE /api/v1/coach/workout-plans/:id
// @desc    Delete a workout plan (soft delete)
// @access  Private (Coach only)
router.delete("/:id", deleteCoachWorkoutPlan);

// ------------------------------
// 🔗 Assignment Routes
// ------------------------------

// @route   POST /api/v1/coach/workout-plans/:id/assign/:subscriptionPlanId
// @desc    Assign workout plan to a subscription plan
// @access  Private (Coach only)
router.post("/:id/assign/:subscriptionPlanId", assignToSubscriptionPlan);

// @route   DELETE /api/v1/coach/workout-plans/:id/assign/:subscriptionPlanId
// @desc    Unassign workout plan from a subscription plan
// @access  Private (Coach only)
router.delete("/:id/assign/:subscriptionPlanId", unassignFromSubscriptionPlan);

export default router;
