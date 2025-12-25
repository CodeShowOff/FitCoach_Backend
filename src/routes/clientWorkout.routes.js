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
} from "../controllers/clientWorkout.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require client authentication
router.use(protect, authorizeRoles("client"));

// ------------------------------
// 📋 Plan & Schedule Routes
// ------------------------------

// @route   GET /api/v1/client/workouts/plan
// @desc    Get the client's assigned workout plan
// @access  Private (Client only)
router.get("/plan", getAssignedWorkoutPlan);

// @route   GET /api/v1/client/workouts/plans
// @desc    Get all workout plans assigned to client
// @access  Private (Client only)
router.get("/plans", getAssignedWorkoutPlans);

// @route   GET /api/v1/client/workouts/plans/:planId
// @desc    Get a specific workout plan by ID
// @access  Private (Client only)
router.get("/plans/:planId", getWorkoutPlanById);

// @route   GET /api/v1/client/workouts/today
// @desc    Get today's workout
// @access  Private (Client only)
router.get("/today", getTodaysWorkout);

// @route   GET /api/v1/client/workouts/schedule
// @desc    Get weekly workout schedule
// @access  Private (Client only)
router.get("/schedule", getWeeklySchedule);

// ------------------------------
// 📊 History & Stats Routes
// ------------------------------

// @route   GET /api/v1/client/workouts/history
// @desc    Get workout history
// @access  Private (Client only)
router.get("/history", getWorkoutHistory);

// @route   GET /api/v1/client/workouts/stats
// @desc    Get workout statistics
// @access  Private (Client only)
router.get("/stats", getWorkoutStats);

// ------------------------------
// 🏋️ Workout Log Routes
// ------------------------------

// @route   GET /api/v1/client/workouts/:logId
// @desc    Get workout log by ID
// @access  Private (Client only)
router.get("/:logId", getWorkoutLogById);

// @route   POST /api/v1/client/workouts/:logId/start
// @desc    Start a workout
// @access  Private (Client only)
router.post("/:logId/start", startWorkout);

// @route   POST /api/v1/client/workouts/:logId/complete
// @desc    Complete a workout
// @access  Private (Client only)
router.post("/:logId/complete", completeWorkout);

// @route   POST /api/v1/client/workouts/:logId/miss
// @desc    Mark workout as missed
// @access  Private (Client only)
router.post("/:logId/miss", markWorkoutMissed);

// @route   PATCH /api/v1/client/workouts/:logId
// @desc    Update workout log
// @access  Private (Client only)
router.patch("/:logId", updateWorkoutLog);

export default router;
