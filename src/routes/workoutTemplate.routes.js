// src/routes/workoutTemplate.routes.js
import express from "express";
import {
  createWorkoutTemplate,
  getWorkoutTemplates,
  getWorkoutTemplateById,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutTemplateMetadata,
} from "../controllers/workoutTemplate.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 📊 Metadata route (must be before :id routes)
// ------------------------------

// @route   GET /api/v1/workout-templates/metadata
// @desc    Get workout template categories and difficulties
// @access  Private (Admin, Coach)
router.get(
  "/metadata",
  protect,
  authorizeRoles("admin", "coach"),
  getWorkoutTemplateMetadata
);

// ------------------------------
// 🛠️ Admin Routes
// ------------------------------

// @route   POST /api/v1/workout-templates
// @desc    Create a new workout template
// @access  Private (Admin only)
router.post("/", protect, authorizeRoles("admin"), createWorkoutTemplate);

// @route   PATCH /api/v1/workout-templates/:id
// @desc    Update a workout template
// @access  Private (Admin only)
router.patch("/:id", protect, authorizeRoles("admin"), updateWorkoutTemplate);

// @route   DELETE /api/v1/workout-templates/:id
// @desc    Delete a workout template (soft delete)
// @access  Private (Admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteWorkoutTemplate);

// ------------------------------
// 📋 Read Routes (Admin, Coach)
// ------------------------------

// @route   GET /api/v1/workout-templates
// @desc    Get all workout templates (paginated, filterable)
// @access  Private (Admin, Coach)
router.get("/", protect, authorizeRoles("admin", "coach"), getWorkoutTemplates);

// @route   GET /api/v1/workout-templates/:id
// @desc    Get workout template by ID with full details
// @access  Private (Admin, Coach)
router.get("/:id", protect, authorizeRoles("admin", "coach"), getWorkoutTemplateById);

export default router;
