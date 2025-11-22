// src/routes/feedback.routes.js
import express from "express";
import {
  submitFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  getFeedbackStats,
} from "../controllers/feedback.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 💬 Public Routes
// ------------------------------

// @route   POST /api/v1/feedback/submit
// @desc    Submit feedback
// @access  Public
router.post("/submit", submitFeedback);

// ------------------------------
// 🧑‍💼 Admin-Only Routes
// ------------------------------

// @route   GET /api/v1/feedback/stats
// @desc    Get feedback statistics
// @access  Private (Admin only)
router.get("/stats", protect, authorizeRoles("admin"), getFeedbackStats);

// @route   GET /api/v1/feedback
// @desc    Get all feedback (filter by status, type, rating, priority, search)
// @access  Private (Admin only)
router.get("/", protect, authorizeRoles("admin"), getAllFeedback);

// @route   PATCH /api/v1/feedback/:id/status
// @desc    Update feedback status, priority, and response
// @access  Private (Admin only)
router.patch("/:id/status", protect, authorizeRoles("admin"), updateFeedbackStatus);

// @route   DELETE /api/v1/feedback/:id
// @desc    Delete feedback
// @access  Private (Admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteFeedback);

export default router;
