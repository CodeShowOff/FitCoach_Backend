// src/routes/orders.routes.js
import express from "express";
import {
  placeOrder,
  getMyOrders,
  getCoachOrders,
  updateOrderStatus,
  uploadOrderPaymentProof,
  generateInvoice,
} from "../controllers/orders.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 👤 Client Routes
// ------------------------------

// @route   POST /api/v1/orders
// @desc    Place a new order (manual QR payment)
// @access  Private (Client only)
router.post("/", protect, authorizeRoles("client"), placeOrder);

// Upload payment proof before placing QR-based order
router.post(
  "/upload-proof",
  protect,
  authorizeRoles("client"),
  (await import("../middlewares/upload.middleware.js")).default.single("image"),
  uploadOrderPaymentProof
);

// @route   GET /api/v1/orders/my
// @desc    Get all orders placed by the logged-in client
// @access  Private (Client only)
router.get("/my", protect, authorizeRoles("client"), getMyOrders);

// ------------------------------
// 🧑‍🏫 Coach Routes
// ------------------------------

// @route   GET /api/v1/orders/coach
// @desc    Get all orders related to this coach
// @access  Private (Coach only)
router.get("/coach", protect, authorizeRoles("coach"), getCoachOrders);

// @route   PATCH /api/v1/orders/:id/status
// @desc    Update an order's status (approve, fulfill, reject)
// @access  Private (Coach/Admin)
router.patch(
  "/:id/status",
  protect,
  authorizeRoles("coach", "admin", "client"),
  updateOrderStatus
);

// @route   GET /api/v1/orders/:id/invoice
// @desc    Generate and download PDF invoice for an order
// @access  Private (Client/Coach/Admin)
router.get(
  "/:id/invoice",
  protect,
  authorizeRoles("client", "coach", "admin"),
  generateInvoice
);

export default router;
