// src/routes/bugReport.routes.js
import express from "express";
import {
  submitBugReport,
  getBugReports,
  updateBugStatus,
  deleteBugReport,
} from "../controllers/bugReport.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 🐛 Public Routes
// ------------------------------

// @route   POST /api/v1/bug-reports/submit
// @desc    Submit a bug report
// @access  Public
router.post("/submit", submitBugReport);

// ------------------------------
// 🧑‍💼 Admin-Only Routes
// ------------------------------

// @route   GET /api/v1/bug-reports
// @desc    Get all bug reports (filter by status, severity, priority, search)
// @access  Private (Admin only)
router.get("/", protect, authorizeRoles("admin"), getBugReports);

// @route   PATCH /api/v1/bug-reports/:id/status
// @desc    Update bug report status and priority
// @access  Private (Admin only)
router.patch("/:id/status", protect, authorizeRoles("admin"), updateBugStatus);

// @route   DELETE /api/v1/bug-reports/:id
// @desc    Delete a bug report
// @access  Private (Admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteBugReport);

export default router;
