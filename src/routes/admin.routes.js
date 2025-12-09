// src/routes/admin.routes.js
import express from "express";
import {
  getPlatformOverview,
  getAllUsers,
  getUserById,
  getAllProducts,
  deleteProductByAdmin,
  getAllOrders,
  getAllPlans,
  deletePlanByAdmin,
  getAllSubscriptions,
  updateSubscriptionStatusByAdmin,
  toggleUserStatus,
  purgeUnverifiedUsersByAdmin,
  getContactUsSubmissions,
  getBugReports,
  getFeedbackSubmissions,
  getAllDeletionRequests,
  processDeletionRequest,
  uploadPaymentQr,
  getPaymentQr,
  getChatCleanupStats,
  triggerChatCleanup,
} from "../controllers/admin.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

// ------------------------------
// 🧑‍💼 Admin-Only Routes
// ------------------------------

// @route   GET /api/v1/admin/overview
// @desc    Get platform overview stats
// @access  Private (Admin only)
router.get("/overview", protect, authorizeRoles("admin"), getPlatformOverview);

// @route   GET /api/v1/admin/users
// @desc    Get all users (filter by role)
// @access  Private (Admin only)
router.get("/users", protect, authorizeRoles("admin"), getAllUsers);

// @route   GET /api/v1/admin/users/:id
// @desc    Get single user by ID
// @access  Private (Admin only)
router.get("/users/:id", protect, authorizeRoles("admin"), getUserById);

// @route   PATCH /api/v1/admin/users/:id/status
// @desc    Toggle user active/deactivated status
// @access  Private (Admin only)
router.patch(
  "/users/:id/status",
  protect,
  authorizeRoles("admin"),
  toggleUserStatus
);

// @route   GET /api/v1/admin/products
// @desc    Get all products (paginated)
// @access  Private (Admin only)
router.get("/products", protect, authorizeRoles("admin"), getAllProducts);

// @route   DELETE /api/v1/admin/products/:id
// @desc    Delete a product by ID
// @access  Private (Admin only)
router.delete("/products/:id", protect, authorizeRoles("admin"), deleteProductByAdmin);

// @route   GET /api/v1/admin/orders
// @desc    Get all orders (paginated)
// @access  Private (Admin only)
router.get("/orders", protect, authorizeRoles("admin"), getAllOrders);

// @route   GET /api/v1/admin/plans
// @desc    Get all plans (paginated)
// @access  Private (Admin only)
router.get("/plans", protect, authorizeRoles("admin"), getAllPlans);

// @route   DELETE /api/v1/admin/plans/:id
// @desc    Delete a plan by ID
// @access  Private (Admin only)
router.delete("/plans/:id", protect, authorizeRoles("admin"), deletePlanByAdmin);

// @route   GET /api/v1/admin/subscriptions
// @desc    Get all subscriptions (filter by status, paginated)
// @access  Private (Admin only)
router.get(
  "/subscriptions",
  protect,
  authorizeRoles("admin"),
  getAllSubscriptions
);

// @route   PATCH /api/v1/admin/subscriptions/:id/status
// @desc    Approve or reject a subscription manually
// @access  Private (Admin only)
router.patch(
  "/subscriptions/:id/status",
  protect,
  authorizeRoles("admin"),
  updateSubscriptionStatusByAdmin
);

// @route   POST /api/v1/admin/users/purge-unverified
// @desc    Purge stale unverified users (whose OTP has expired)
// @access  Private (Admin only)
router.post(
  "/users/purge-unverified",
  protect,
  authorizeRoles("admin"),
  purgeUnverifiedUsersByAdmin
);

// @route   GET /api/v1/admin/contact-submissions
// @desc    Get all contact us submissions (filter by status, search)
// @access  Private (Admin only)
router.get(
  "/contact-submissions",
  protect,
  authorizeRoles("admin"),
  getContactUsSubmissions
);

// @route   GET /api/v1/admin/bug-reports
// @desc    Get all bug reports (filter by status, severity, priority, search)
// @access  Private (Admin only)
router.get(
  "/bug-reports",
  protect,
  authorizeRoles("admin"),
  getBugReports
);

// @route   GET /api/v1/admin/feedback-submissions
// @desc    Get all feedback submissions (filter by status, type, rating, priority, search)
// @access  Private (Admin only)
router.get(
  "/feedback-submissions",
  protect,
  authorizeRoles("admin"),
  getFeedbackSubmissions
);

// @route   GET /api/v1/admin/deletion-requests
// @desc    Get all account deletion requests
// @access  Private (Admin only)
router.get(
  "/deletion-requests",
  protect,
  authorizeRoles("admin"),
  getAllDeletionRequests
);

// @route   PATCH /api/v1/admin/deletion-requests/:id
// @desc    Process account deletion request (approve/reject)
// @access  Private (Admin only)
router.patch(
  "/deletion-requests/:id",
  protect,
  authorizeRoles("admin"),
  processDeletionRequest
);

// @route   POST /api/v1/admin/upload-payment-qr
// @desc    Upload payment QR code for platform subscription
// @access  Private (Admin only)
router.post(
  "/upload-payment-qr",
  protect,
  authorizeRoles("admin"),
  upload.single("paymentQr"),
  uploadPaymentQr
);

// @route   GET /api/v1/admin/payment-qr
// @desc    Get payment QR code
// @access  Private (Admin only)
router.get(
  "/payment-qr",
  protect,
  authorizeRoles("admin"),
  getPaymentQr
);

// @route   GET /api/v1/admin/chat-cleanup/stats
// @desc    Get chat cleanup statistics (messages to be deleted)
// @access  Private (Admin only)
router.get(
  "/chat-cleanup/stats",
  protect,
  authorizeRoles("admin"),
  getChatCleanupStats
);

// @route   POST /api/v1/admin/chat-cleanup
// @desc    Manually trigger chat message cleanup (delete messages older than 7 days)
// @access  Private (Admin only)
router.post(
  "/chat-cleanup",
  protect,
  authorizeRoles("admin"),
  triggerChatCleanup
);

export default router;