// src/routes/coachReview.routes.js

import express from "express";
import {
  submitCoachReview,
  updateCoachReview,
  deleteCoachReview,
  getCoachReviews,
  getReviewsForManagement,
  toggleReviewApproval,
  checkClientReview,
} from "../controllers/coachReview.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// @route   POST /api/v1/coach-reviews
// @desc    Submit a review for a coach
// @access  Private (Client)
router.post("/", protect, authorizeRoles("client"), submitCoachReview);

// @route   PUT /api/v1/coach-reviews/:reviewId
// @desc    Update a review
// @access  Private (Client - own review only)
router.put("/:reviewId", protect, authorizeRoles("client"), updateCoachReview);

// @route   DELETE /api/v1/coach-reviews/:reviewId
// @desc    Delete a review
// @access  Private (Client - own review only)
router.delete("/:reviewId", protect, authorizeRoles("client"), deleteCoachReview);

// @route   GET /api/v1/coach-reviews/check/:coachId
// @desc    Check if client has reviewed a coach
// @access  Private (Client)
router.get("/check/:coachId", protect, authorizeRoles("client"), checkClientReview);

// @route   GET /api/v1/coach-reviews/manage
// @desc    Get all reviews for management (coach's own reviews)
// @access  Private (Coach)
router.get("/manage", protect, authorizeRoles("coach"), getReviewsForManagement);

// @route   PUT /api/v1/coach-reviews/:reviewId/approval
// @desc    Approve or unapprove a review
// @access  Private (Coach - own reviews only)
router.put("/:reviewId/approval", protect, authorizeRoles("coach"), toggleReviewApproval);

// @route   GET /api/v1/coach-reviews/coach/:coachId
// @desc    Get all reviews for a specific coach (public sees approved only)
// @access  Public (but authenticated users get more options)
router.get("/coach/:coachId", getCoachReviews);

export default router;
