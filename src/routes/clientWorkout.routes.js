// src/routes/clientWorkout.routes.js
import express from "express";
import {
  getAssignedWorkoutPlan,
  getAssignedWorkoutPlans,
  getWorkoutPlanById,
  getTodaysWorkout,
  getWeeklySchedule,
  getWorkoutLogById,
  startWorkout,
  completeWorkout,
  markWorkoutMissed,
  updateWorkoutLog,
  getWorkoutHistory,
  getWorkoutStats,
  getWorkoutHistoryForCoach,
  getWorkoutStatsForCoach,
} from "../controllers/clientWorkout.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { checkCoachSubscription } from "../middlewares/subscriptionCheck.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ------------------------------
// 📋 Plan & Schedule Routes
// ------------------------------

// @route   GET /api/v1/client/workouts/plan
// @desc    Get the client's assigned workout plan
// @access  Private (Client only)
router.get("/plan", authorizeRoles("client"), getAssignedWorkoutPlan);

// @route   GET /api/v1/client/workouts/plans
// @desc    Get all workout plans assigned to client
// @access  Private (Client only)
router.get("/plans", authorizeRoles("client"), getAssignedWorkoutPlans);

// @route   GET /api/v1/client/workouts/plans/:planId
// @desc    Get a specific workout plan by ID
// @access  Private (Client only)
router.get("/plans/:planId", authorizeRoles("client"), getWorkoutPlanById);

// @route   GET /api/v1/client/workouts/today
// @desc    Get today's workout
// @access  Private (Client only)
router.get("/today", authorizeRoles("client"), getTodaysWorkout);

// @route   GET /api/v1/client/workouts/schedule
// @desc    Get weekly workout schedule
// @access  Private (Client only)
router.get("/schedule", authorizeRoles("client"), getWeeklySchedule);

// ------------------------------
// 📊 History & Stats Routes
// ------------------------------

// @route   GET /api/v1/client/workouts/history
// @desc    Get workout history
// @access  Private (Client only)
router.get("/history", authorizeRoles("client"), getWorkoutHistory);

// @route   GET /api/v1/client/workouts/stats
// @desc    Get workout statistics
// @access  Private (Client only)
router.get("/stats", authorizeRoles("client"), getWorkoutStats);

// ------------------------------
// 👨‍🏫 Coach Client History Routes
// ------------------------------

// @route   GET /api/v1/client/workouts/coach/clients/:clientId/history
// @desc    Get workout history for a specific client (coach view)
// @access  Private (Coach only)
router.get(
  "/coach/clients/:clientId/history",
  authorizeRoles("coach"),
  checkCoachSubscription,
  getWorkoutHistoryForCoach
);

// @route   GET /api/v1/client/workouts/coach/clients/:clientId/stats
// @desc    Get workout stats for a specific client (coach view)
// @access  Private (Coach only)
router.get(
  "/coach/clients/:clientId/stats",
  authorizeRoles("coach"),
  checkCoachSubscription,
  getWorkoutStatsForCoach
);

// ------------------------------
// 🏋️ Workout Log Routes
// ------------------------------

// @route   GET /api/v1/client/workouts/:logId
// @desc    Get workout log by ID
// @access  Private (Client only)
router.get("/:logId", authorizeRoles("client"), getWorkoutLogById);

// @route   POST /api/v1/client/workouts/:logId/start
// @desc    Start a workout
// @access  Private (Client only)
router.post("/:logId/start", authorizeRoles("client"), startWorkout);

// @route   POST /api/v1/client/workouts/:logId/complete
// @desc    Complete a workout
// @access  Private (Client only)
router.post("/:logId/complete", authorizeRoles("client"), completeWorkout);

// @route   POST /api/v1/client/workouts/:logId/miss
// @desc    Mark workout as missed
// @access  Private (Client only)
router.post("/:logId/miss", authorizeRoles("client"), markWorkoutMissed);

// @route   PATCH /api/v1/client/workouts/:logId
// @desc    Update workout log
// @access  Private (Client only)
router.patch("/:logId", authorizeRoles("client"), updateWorkoutLog);

export default router;
