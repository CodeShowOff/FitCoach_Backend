// src/controllers/coachReview.controller.js

import CoachReview from "../models/CoachReview.js";
import User from "../models/User.js";

/**
 * @desc    Submit a review for a coach (Client only)
 * @route   POST /api/v1/coach-reviews
 * @access  Private (Client)
 */
export const submitCoachReview = async (req, res) => {
  try {
    const { coachId, review } = req.body;

    // Validate request
    if (!coachId || !review) {
      return res.status(400).json({
        success: false,
        message: "Coach ID and review are required",
      });
    }

    // Verify coach exists and is actually a coach
    const coach = await User.findById(coachId);
    if (!coach || coach.role !== "coach") {
      return res.status(404).json({
        success: false,
        message: "Coach not found",
      });
    }

    // Check if client already reviewed this coach
    const existingReview = await CoachReview.findOne({
      client: req.user._id,
      coach: coachId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this coach. You can update your existing review.",
      });
    }

    // Create the review
    const coachReview = await CoachReview.create({
      coach: coachId,
      client: req.user._id,
      review,
      isApproved: false,
    });

    await coachReview.populate("client", "fullName avatarUrl");

    res.status(201).json({
      success: true,
      message: "Review submitted successfully. It will appear after coach approval.",
      data: coachReview,
    });
  } catch (error) {
    console.error("Submit coach review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit review",
    });
  }
};

/**
 * @desc    Update an existing review (Client only - their own review)
 * @route   PUT /api/v1/coach-reviews/:reviewId
 * @access  Private (Client)
 */
export const updateCoachReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { review } = req.body;

    const coachReview = await CoachReview.findById(reviewId);

    if (!coachReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Verify the review belongs to the current client
    if (coachReview.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own reviews",
      });
    }

    // Update review fields
    if (review) coachReview.review = review;
    
    // Reset approval status when review is updated
    coachReview.isApproved = false;
    coachReview.approvedAt = null;

    await coachReview.save();
    await coachReview.populate("client", "fullName avatarUrl");

    res.status(200).json({
      success: true,
      message: "Review updated successfully. It will need to be approved again by the coach.",
      data: coachReview,
    });
  } catch (error) {
    console.error("Update coach review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update review",
    });
  }
};

/**
 * @desc    Delete a review (Client only - their own review)
 * @route   DELETE /api/v1/coach-reviews/:reviewId
 * @access  Private (Client)
 */
export const deleteCoachReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const coachReview = await CoachReview.findById(reviewId);

    if (!coachReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Verify the review belongs to the current client
    if (coachReview.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    await coachReview.deleteOne();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete coach review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete review",
    });
  }
};

/**
 * @desc    Get all reviews for a coach (Coach can see all, Public can see approved only)
 * @route   GET /api/v1/coach-reviews/coach/:coachId
 * @access  Public
 */
export const getCoachReviews = async (req, res) => {
  try {
    const { coachId } = req.params;
    const { page = 1, limit = 4, approved } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter - public users only see approved reviews
    const filter = { coach: coachId };
    
    // If user is the coach, they can see all reviews based on 'approved' param
    const isCoach = req.user && req.user._id.toString() === coachId;
    
    if (!isCoach) {
      // Public/other users only see approved reviews
      filter.isApproved = true;
    } else if (approved !== undefined) {
      // Coach can filter by approval status
      filter.isApproved = approved === "true";
    }

    const reviews = await CoachReview.find(filter)
      .populate("client", "fullName avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CoachReview.countDocuments(filter);

    // Calculate stats (approved reviews only for public stats)
    const statsFilter = { coach: coachId, isApproved: true };
    const approvedReviews = await CoachReview.find(statsFilter);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        stats: {
          totalReviews: approvedReviews.length,
        },
      },
    });
  } catch (error) {
    console.error("Get coach reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
};

/**
 * @desc    Get reviews that need approval (Coach only - their own reviews)
 * @route   GET /api/v1/coach-reviews/manage
 * @access  Private (Coach)
 */
export const getReviewsForManagement = async (req, res) => {
  try {
    const { page = 1, limit = 10, approved } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { coach: req.user._id };
    
    if (approved !== undefined) {
      filter.isApproved = approved === "true";
    }

    const reviews = await CoachReview.find(filter)
      .populate("client", "fullName avatarUrl email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CoachReview.countDocuments(filter);
    const pendingCount = await CoachReview.countDocuments({ coach: req.user._id, isApproved: false });
    const approvedCount = await CoachReview.countDocuments({ coach: req.user._id, isApproved: true });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        stats: {
          pending: pendingCount,
          approved: approvedCount,
          total: pendingCount + approvedCount,
        },
      },
    });
  } catch (error) {
    console.error("Get reviews for management error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
};

/**
 * @desc    Approve or unapprove a review (Coach only - their own reviews)
 * @route   PUT /api/v1/coach-reviews/:reviewId/approval
 * @access  Private (Coach)
 */
export const toggleReviewApproval = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isApproved } = req.body;

    if (typeof isApproved !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isApproved must be a boolean value",
      });
    }

    const review = await CoachReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Verify the review is for the current coach
    if (review.coach.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only manage reviews for your profile",
      });
    }

    review.isApproved = isApproved;
    review.approvedAt = isApproved ? new Date() : null;

    await review.save();
    await review.populate("client", "fullName avatarUrl email");

    res.status(200).json({
      success: true,
      message: isApproved ? "Review approved successfully" : "Review unapproved successfully",
      data: review,
    });
  } catch (error) {
    console.error("Toggle review approval error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update review approval",
    });
  }
};

/**
 * @desc    Check if client has reviewed a coach
 * @route   GET /api/v1/coach-reviews/check/:coachId
 * @access  Private (Client)
 */
export const checkClientReview = async (req, res) => {
  try {
    const { coachId } = req.params;

    const review = await CoachReview.findOne({
      client: req.user._id,
      coach: coachId,
    });

    res.status(200).json({
      success: true,
      data: {
        hasReviewed: !!review,
        review: review || null,
      },
    });
  } catch (error) {
    console.error("Check client review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check review status",
    });
  }
};
