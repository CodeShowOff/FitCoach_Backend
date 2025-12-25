// src/routes/dietTemplate.routes.js
import express from "express";
import {
  createDietTemplate,
  getDietTemplates,
  getDietTemplateById,
  updateDietTemplate,
  deleteDietTemplate,
  getDietTemplateMetadata,
} from "../controllers/dietTemplate.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 📊 Metadata route (must be before :id routes)
// ------------------------------

// @route   GET /api/v1/diet-templates/metadata
// @desc    Get diet goals, dietary types, meal types
// @access  Private (Admin, Coach)
router.get(
  "/metadata",
  protect,
  authorizeRoles("admin", "coach"),
  getDietTemplateMetadata
);

// ------------------------------
// 🛠️ Admin Routes
// ------------------------------

// @route   POST /api/v1/diet-templates
// @desc    Create a new diet template
// @access  Private (Admin only)
router.post("/", protect, authorizeRoles("admin"), createDietTemplate);

// @route   PATCH /api/v1/diet-templates/:id
// @desc    Update a diet template
// @access  Private (Admin only)
router.patch("/:id", protect, authorizeRoles("admin"), updateDietTemplate);

// @route   DELETE /api/v1/diet-templates/:id
// @desc    Delete a diet template (soft delete)
// @access  Private (Admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteDietTemplate);

// ------------------------------
// 📋 Read Routes (Admin, Coach)
// ------------------------------

// @route   GET /api/v1/diet-templates
// @desc    Get all diet templates (paginated, filterable)
// @access  Private (Admin, Coach)
router.get("/", protect, authorizeRoles("admin", "coach"), getDietTemplates);

// @route   GET /api/v1/diet-templates/:id
// @desc    Get diet template by ID with full details
// @access  Private (Admin, Coach)
router.get("/:id", protect, authorizeRoles("admin", "coach"), getDietTemplateById);

export default router;
