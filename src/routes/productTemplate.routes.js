// src/routes/productTemplate.routes.js
import express from "express";
import {
  createProductTemplate,
  getProductTemplates,
  getProductTemplateById,
  updateProductTemplate,
  deleteProductTemplate,
  getProductTemplateMetadata,
} from "../controllers/productTemplate.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 📊 Metadata route (must be before :id routes)
// ------------------------------

// @route   GET /api/v1/product-templates/metadata
// @desc    Get product template categories
// @access  Private (Admin, Coach)
router.get(
  "/metadata",
  protect,
  authorizeRoles("admin", "coach"),
  getProductTemplateMetadata
);

// ------------------------------
// 🛠️ Admin Routes
// ------------------------------

// @route   POST /api/v1/product-templates
// @desc    Create a new product template
// @access  Private (Admin only)
router.post("/", protect, authorizeRoles("admin"), createProductTemplate);

// @route   PATCH /api/v1/product-templates/:id
// @desc    Update a product template
// @access  Private (Admin only)
router.patch("/:id", protect, authorizeRoles("admin"), updateProductTemplate);

// @route   DELETE /api/v1/product-templates/:id
// @desc    Delete a product template (soft delete)
// @access  Private (Admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteProductTemplate);

// ------------------------------
// 📋 Read Routes (Admin, Coach)
// ------------------------------

// @route   GET /api/v1/product-templates
// @desc    Get all product templates (paginated, filterable)
// @access  Private (Admin, Coach)
router.get("/", protect, authorizeRoles("admin", "coach"), getProductTemplates);

// @route   GET /api/v1/product-templates/:id
// @desc    Get product template by ID
// @access  Private (Admin, Coach)
router.get("/:id", protect, authorizeRoles("admin", "coach"), getProductTemplateById);

export default router;
