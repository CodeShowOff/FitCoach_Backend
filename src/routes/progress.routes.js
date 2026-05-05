 
// src/routes/progress.routes.js
import express from "express";
import {
  addProgressLog,
  addClientProgressLog,
  getMyProgressSummary,
  getMyProgressLogs,
  getClientProgressLogs,
  getGoalWeight,
  updateGoalWeight,
} from "../controllers/progress.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 👤 Client Routes
// ------------------------------

// @route   POST /api/v1/progress
// @desc    Add a new daily/weekly progress log
// @access  Private (Client only)
router.post("/", protect, authorizeRoles("client"), addProgressLog);

// @route   GET /api/v1/progress/my
// @desc    Get logged-in client's progress logs (paginated)
// @access  Private (Client only)
router.get("/my", protect, authorizeRoles("client"), getMyProgressLogs);

// @route   GET /api/v1/progress/my/summary
// @desc    Get lightweight summary metrics for dashboard
// @access  Private (Client only)
router.get("/my/summary", protect, authorizeRoles("client"), getMyProgressSummary);

// @route   GET /api/v1/progress/goal-weight
// @desc    Get client's goal weight
// @access  Private (Client only)
router.get("/goal-weight", protect, authorizeRoles("client"), getGoalWeight);

// @route   PUT /api/v1/progress/goal-weight
// @desc    Update client's goal weight
// @access  Private (Client only)
router.put("/goal-weight", protect, authorizeRoles("client"), updateGoalWeight);

// ------------------------------
// 🧑‍🏫 Coach Routes
// ------------------------------

// @route   POST /api/v1/progress/client/:clientId
// @desc    Add a progress entry for a specific client
// @access  Private (Coach/Admin)
router.post(
  "/client/:clientId",
  protect,
  authorizeRoles("coach", "admin"),
  addClientProgressLog
);

// @route   GET /api/v1/progress/client/:clientId
// @desc    Get progress logs for a specific client (with pagination)
// @access  Private (Coach only)
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles("coach", "admin"),
  getClientProgressLogs
);

export default router;
