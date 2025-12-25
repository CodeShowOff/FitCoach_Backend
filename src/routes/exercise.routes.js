// src/routes/exercise.routes.js
import express from "express";
import {
  createExercise,
  getExercises,
  getExerciseById,
  updateExercise,
  deleteExercise,
  getExerciseMetadata,
  bulkCreateExercises,
  uploadExerciseAnimation,
  deleteExerciseAnimation,
} from "../controllers/exercise.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { animationUpload } from "../middlewares/upload.middleware.js";

const router = express.Router();

// ------------------------------
// 📊 Metadata route (must be before :id routes)
// ------------------------------

// @route   GET /api/v1/exercises/metadata
// @desc    Get exercise categories, muscle groups, equipment options
// @access  Private (Admin, Coach, Client)
router.get(
  "/metadata",
  protect,
  authorizeRoles("admin", "coach", "client"),
  getExerciseMetadata
);

// ------------------------------
// 🛠️ Admin Routes
// ------------------------------

// @route   POST /api/v1/exercises
// @desc    Create a new exercise
// @access  Private (Admin for global, Coach for custom)
router.post("/", protect, authorizeRoles("admin", "coach"), createExercise);

// @route   POST /api/v1/exercises/bulk
// @desc    Bulk create exercises
// @access  Private (Admin only)
router.post("/bulk", protect, authorizeRoles("admin"), bulkCreateExercises);

// @route   POST /api/v1/exercises/:id/animation
// @desc    Upload animation for an exercise
// @access  Private (Admin for all, Coach for own custom)
router.post(
  "/:id/animation",
  protect,
  authorizeRoles("admin", "coach"),
  animationUpload.single("animation"),
  uploadExerciseAnimation
);

// @route   DELETE /api/v1/exercises/:id/animation
// @desc    Delete animation from an exercise
// @access  Private (Admin for all, Coach for own custom)
router.delete(
  "/:id/animation",
  protect,
  authorizeRoles("admin", "coach"),
  deleteExerciseAnimation
);

// @route   PATCH /api/v1/exercises/:id
// @desc    Update an exercise
// @access  Private (Admin for all, Coach for own custom)
router.patch("/:id", protect, authorizeRoles("admin", "coach"), updateExercise);

// @route   DELETE /api/v1/exercises/:id
// @desc    Delete an exercise (soft delete)
// @access  Private (Admin for all, Coach for own custom)
router.delete("/:id", protect, authorizeRoles("admin", "coach"), deleteExercise);

// ------------------------------
// 📋 Public Read Routes (Authenticated)
// ------------------------------

// @route   GET /api/v1/exercises
// @desc    Get all exercises (paginated, filterable)
// @access  Private (Admin, Coach, Client)
router.get("/", protect, authorizeRoles("admin", "coach", "client"), getExercises);

// @route   GET /api/v1/exercises/:id
// @desc    Get exercise by ID
// @access  Private (Admin, Coach, Client)
router.get("/:id", protect, authorizeRoles("admin", "coach", "client"), getExerciseById);

export default router;
