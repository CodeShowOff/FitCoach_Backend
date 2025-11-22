 
// src/routes/progress.routes.js
import express from "express";
import {
  addProgressLog,
  getMyProgressLogs,
  getClientProgressLogs,
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

// ------------------------------
// 🧑‍🏫 Coach Routes
// ------------------------------

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
