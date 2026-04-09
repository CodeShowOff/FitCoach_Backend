 
// src/routes/products.routes.js
import express from "express";
import upload from "../middlewares/upload.middleware.js";
import { uploadProductImage } from "../controllers/products.controller.js";
import {
  createProduct,
  createProductFromTemplate,
  createProductsFromTemplatesBulk,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/products.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { sanitizePayload } from "../middlewares/sanitize.middleware.js";
import { checkCoachSubscription } from "../middlewares/subscriptionCheck.middleware.js";

const router = express.Router();

// ------------------------------
// 🧑‍🏫 Coach Routes (Private)
// ------------------------------

// @route   POST /api/v1/products
// @desc    Create a new product
// @access  Private (Coach only)
router.post("/", protect, authorizeRoles("coach"), checkCoachSubscription, createProduct);

// @route   POST /api/v1/products/from-template/:templateId
// @desc    Create a new product from an admin product template
// @access  Private (Coach only)
router.post(
  "/from-templates/bulk",
  protect,
  authorizeRoles("coach"),
  checkCoachSubscription,
  createProductsFromTemplatesBulk
);

// @route   POST /api/v1/products/from-template/:templateId
// @desc    Create a new product from an admin product template
// @access  Private (Coach only)
router.post(
  "/from-template/:templateId",
  protect,
  authorizeRoles("coach"),
  checkCoachSubscription,
  createProductFromTemplate
);

// @route   PUT /api/v1/products/:id
// @desc    Update an existing product
// @access  Private (Coach only)
router.put("/:id", protect, authorizeRoles("coach"), checkCoachSubscription, updateProduct);

// @route   DELETE /api/v1/products/:id
// @desc    Delete a product
// @access  Private (Coach only)
router.delete("/:id", protect, authorizeRoles("coach"), checkCoachSubscription, deleteProduct);

// @route   GET /api/v1/products
// @desc    Get all active products (with pagination and search)
// @access  Private (Admin, Coach, Client)
router.get("/", protect, authorizeRoles("admin", "coach", "client"), getProducts);


// @route   GET /api/v1/products/:id
// @desc    Get product details by ID
// @access  Private (Admin, Coach, Client)
router.get("/:id", protect, authorizeRoles("admin", "coach", "client"), getProductById);


// @route   POST /api/v1/products/upload-image
// @desc    Upload product image
// @access  Private (Coach only)
router.post(
  "/upload-image",
  protect,
  authorizeRoles("coach"),
  checkCoachSubscription,
  upload.single("image"),
  sanitizePayload,
  uploadProductImage
);


export default router;
