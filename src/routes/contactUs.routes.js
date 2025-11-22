// src/routes/contactUs.routes.js
import express from "express";
import {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus,
  deleteContactSubmission,
} from "../controllers/contactUs.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ------------------------------
// 📧 Public Routes
// ------------------------------

// @route   POST /api/v1/contact-us/submit
// @desc    Submit a contact us form
// @access  Public
router.post("/submit", submitContactForm);

// ------------------------------
// 🧑‍💼 Admin-Only Routes
// ------------------------------

// @route   GET /api/v1/contact-us
// @desc    Get all contact submissions (filter by status, search)
// @access  Private (Admin only)
router.get("/", protect, authorizeRoles("admin"), getContactSubmissions);

// @route   PATCH /api/v1/contact-us/:id/status
// @desc    Update contact submission status
// @access  Private (Admin only)
router.patch("/:id/status", protect, authorizeRoles("admin"), updateContactStatus);

// @route   DELETE /api/v1/contact-us/:id
// @desc    Delete a contact submission
// @access  Private (Admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteContactSubmission);

export default router;
