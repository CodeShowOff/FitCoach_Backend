// src/routes/foodItem.routes.js
import express from "express";
import {
  createFoodItem,
  getFoodItems,
  getFoodItemById,
  updateFoodItem,
  deleteFoodItem,
  getFoodItemMetadata,
  bulkCreateFoodItems,
  importIndianFoods,
} from "../controllers/foodItem.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 📊 Metadata route (must be before :id routes)
// ------------------------------

// @route   GET /api/v1/food-items/metadata
// @desc    Get food categories, allergens, dietary filters
// @access  Private (Admin, Coach, Client)
router.get(
  "/metadata",
  protect,
  authorizeRoles("admin", "coach", "client"),
  getFoodItemMetadata
);

// ------------------------------
// 🛠️ Admin Routes
// ------------------------------

// @route   POST /api/v1/food-items
// @desc    Create a new food item
// @access  Private (Admin for global, Coach for custom)
router.post("/", protect, authorizeRoles("admin", "coach"), createFoodItem);

// @route   POST /api/v1/food-items/bulk
// @desc    Bulk create food items
// @access  Private (Admin only)
router.post("/bulk", protect, authorizeRoles("admin"), bulkCreateFoodItems);

// @route   POST /api/v1/food-items/import-indian
// @desc    Import Indian foods from JSON format
// @access  Private (Admin only)
router.post("/import-indian", protect, authorizeRoles("admin"), importIndianFoods);

// @route   PATCH /api/v1/food-items/:id
// @desc    Update a food item
// @access  Private (Admin for all, Coach for own custom)
router.patch("/:id", protect, authorizeRoles("admin", "coach"), updateFoodItem);

// @route   DELETE /api/v1/food-items/:id
// @desc    Delete a food item (soft delete)
// @access  Private (Admin for all, Coach for own custom)
router.delete("/:id", protect, authorizeRoles("admin", "coach"), deleteFoodItem);

// ------------------------------
// 📋 Public Read Routes (Authenticated)
// ------------------------------

// @route   GET /api/v1/food-items
// @desc    Get all food items (paginated, filterable)
// @access  Private (Admin, Coach, Client)
router.get("/", protect, authorizeRoles("admin", "coach", "client"), getFoodItems);

// @route   GET /api/v1/food-items/:id
// @desc    Get food item by ID
// @access  Private (Admin, Coach, Client)
router.get("/:id", protect, authorizeRoles("admin", "coach", "client"), getFoodItemById);

export default router;
