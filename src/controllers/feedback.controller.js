// src/controllers/feedback.controller.js
import asyncHandler from "express-async-handler";
import Feedback from "../models/Feedback.js";

// ------------------------------
// 💬 @desc Submit feedback (Public)
// @route POST /api/v1/feedback/submit
// @access Public
// ------------------------------
export const submitFeedback = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    userRole,
    feedbackType,
    category,
    rating,
    subject,
    message,
  } = req.body;

  // Validation
  if (!name || !email || !rating || !subject || !message) {
    res.status(400);
    throw new Error("Name, email, rating, subject, and message are required");
  }

  if (rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  // Create new feedback
  const feedback = await Feedback.create({
    name,
    email,
    userRole: userRole || "visitor",
    feedbackType: feedbackType || "general",
    category: category || "other",
    rating,
    subject,
    message,
  });

  res.status(201).json({
    success: true,
    message: "Thank you for your feedback! We appreciate your input.",
    data: {
      _id: feedback._id,
      subject: feedback.subject,
      rating: feedback.rating,
      feedbackType: feedback.feedbackType,
      createdAt: feedback.createdAt,
    },
  });
});

// ------------------------------
// 📋 @desc Get all feedback (Admin only)
// @route GET /api/v1/feedback
// @access Private (Admin only)
// ------------------------------
export const getAllFeedback = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const status = req.query.status || null;
  const feedbackType = req.query.feedbackType || null;
  const rating = req.query.rating || null;
  const priority = req.query.priority || null;

  // Build filter
  const filter = {};
  if (status && ["new", "reviewed", "acknowledged", "implemented", "archived"].includes(status)) {
    filter.status = status;
  }
  if (feedbackType && ["general", "feature-request", "improvement", "complaint", "praise", "other"].includes(feedbackType)) {
    filter.feedbackType = feedbackType;
  }
  if (rating && !isNaN(parseInt(rating))) {
    filter.rating = parseInt(rating);
  }
  if (priority && ["low", "medium", "high"].includes(priority)) {
    filter.priority = priority;
  }

  // Optional search by subject, email, or message
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { subject: searchRegex },
      { email: searchRegex },
      { message: searchRegex },
      { name: searchRegex },
    ];
  }

  const [feedbacks, total] = await Promise.all([
    Feedback.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: feedbacks,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// ✏️ @desc Update feedback status (Admin only)
// @route PATCH /api/v1/feedback/:id/status
// @access Private (Admin only)
// ------------------------------
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { status, priority, adminResponse, adminNotes, isPublic } = req.body;

  if (!status || !["new", "reviewed", "acknowledged", "implemented", "archived"].includes(status)) {
    res.status(400);
    throw new Error(
      "Valid status is required (new, reviewed, acknowledged, implemented, or archived)"
    );
  }

  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  feedback.status = status;

  if (priority && ["low", "medium", "high"].includes(priority)) {
    feedback.priority = priority;
  }

  if (adminResponse !== undefined) {
    feedback.adminResponse = adminResponse;
  }

  if (adminNotes !== undefined) {
    feedback.adminNotes = adminNotes;
  }

  if (isPublic !== undefined) {
    feedback.isPublic = isPublic;
  }

  // Set implementedAt when status changes to implemented
  if (status === "implemented" && !feedback.implementedAt) {
    feedback.implementedAt = new Date();
  }

  await feedback.save();

  res.json({
    success: true,
    message: "Feedback updated successfully",
    data: feedback,
  });
});

// ------------------------------
// 🗑️ @desc Delete feedback (Admin only)
// @route DELETE /api/v1/feedback/:id
// @access Private (Admin only)
// ------------------------------
export const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  await feedback.deleteOne();

  res.json({
    success: true,
    message: "Feedback deleted successfully",
  });
});

// ------------------------------
// 📊 @desc Get feedback statistics (Admin only)
// @route GET /api/v1/feedback/stats
// @access Private (Admin only)
// ------------------------------
export const getFeedbackStats = asyncHandler(async (req, res) => {
  const [
    totalFeedback,
    avgRating,
    statusCounts,
    typeCounts,
    ratingCounts,
  ] = await Promise.all([
    Feedback.countDocuments(),
    Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]),
    Feedback.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Feedback.aggregate([
      { $group: { _id: "$feedbackType", count: { $sum: 1 } } },
    ]),
    Feedback.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalFeedback,
      averageRating: avgRating.length > 0 ? avgRating[0].avgRating.toFixed(2) : 0,
      statusBreakdown: statusCounts,
      typeBreakdown: typeCounts,
      ratingDistribution: ratingCounts,
    },
  });
});
