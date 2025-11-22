// src/routes/platformSubscription.routes.js
import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import {
  getSubscriptionStatus,
  submitPayment,
  getPaymentHistory,
  getAllSubscriptions,
  getPendingPayments,
  approveOrRejectPayment,
  extendSubscription,
} from "../controllers/platformSubscription.controller.js";

const router = express.Router();

// Coach routes
router.get("/status", protect, authorizeRoles("coach"), getSubscriptionStatus);
router.post("/payment", protect, authorizeRoles("coach"), upload.single("paymentProof"), submitPayment);
router.get("/history", protect, authorizeRoles("coach"), getPaymentHistory);

// Admin routes
router.get("/admin/all", protect, authorizeRoles("admin"), getAllSubscriptions);
router.get("/admin/pending-payments", protect, authorizeRoles("admin"), getPendingPayments);
router.put("/admin/payment/:subscriptionId/:paymentId", protect, authorizeRoles("admin"), approveOrRejectPayment);
router.put("/admin/extend/:userId", protect, authorizeRoles("admin"), extendSubscription);

export default router;
