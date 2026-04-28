// src/controllers/admin.controller.js
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import Order from "../models/Order.js";
import Token from "../models/Token.js";
import ContactUs from "../models/ContactUs.js";
import BugReport from "../models/BugReport.js";
import Feedback from "../models/Feedback.js";
import AccountDeletionRequest from "../models/AccountDeletionRequest.js";
import PlanRequest from "../models/PlanRequest.js";
import ProgressPhoto from "../models/ProgressPhoto.js";
import Notification from "../models/Notification.js";
import Voucher from "../models/Voucher.js";
import ContactRequest from "../models/ContactRequest.js";
import PlatformSubscription from "../models/PlatformSubscription.js";
import { purgeStaleUnverifiedUsers } from "../jobs/reminders.job.js";
import { cleanupOldMessages, getCleanupStats } from "../jobs/chatCleanup.job.js";
import { onSubscriptionApproved, onSubscriptionEnded } from "../services/chat.service.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// ------------------------------
// 🧭 @desc Get platform overview (summary counts)
// @route GET /api/v1/admin/overview
// @access Private (Admin only)
// ------------------------------
export const getPlatformOverview = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalCoaches,
    totalClients,
    totalProducts,
    totalPlans,
    totalSubscriptions,
    pendingSubscriptions,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "coach" }),
    User.countDocuments({ role: "client" }),
    Product.countDocuments(),
    Plan.countDocuments(),
    Subscription.countDocuments(),
    Subscription.countDocuments({ status: "pending" }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalCoaches,
      totalClients,
      totalProducts,
      totalPlans,
      totalSubscriptions,
      pendingSubscriptions,
    },
  });
});

// ------------------------------
// 👥 @desc Get all users (filter by role, paginated)
// @route GET /api/v1/admin/users
// @access Private (Admin only)
// ------------------------------
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const role = req.query.role || null;

  // Filter: exclude admins by default unless specifically requested
  let filter = role ? { role } : { role: { $ne: "admin" } };

  // Optional search (by name or email)
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
    ];
  }


  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 👤 @desc Get single user by ID (Admin only)
// @route GET /api/v1/admin/users/:id
// @access Private (Admin only)
// ------------------------------
export const getUserById = asyncHandler(async (req, res) => {
  // Validate ObjectId format to prevent injection attacks
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid user ID format");
  }

  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("coachId", "fullName email phone whatsappNumber")
    .lean();

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role === "client") {
    // Fetch latest progress from user's history arrays
    const latestWeight = user.weightHistory?.length > 0 
      ? user.weightHistory[user.weightHistory.length - 1] 
      : null;
    const latestHeight = user.heightHistory?.length > 0 
      ? user.heightHistory[user.heightHistory.length - 1] 
      : null;
    const latestBmi = user.bmiHistory?.length > 0 
      ? user.bmiHistory[user.bmiHistory.length - 1] 
      : null;

    // Determine the most recent date across all metrics
    const dates = [
      latestWeight?.date,
      latestHeight?.date,
      latestBmi?.date,
    ].filter(Boolean);
    const mostRecentDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : null;

    user.weight = latestWeight?.value ?? null;
    user.height = latestHeight?.value ?? null;
    user.bmi = latestBmi?.value ?? null;
    user.latestProgress = (latestWeight || latestHeight || latestBmi)
      ? {
          weight: latestWeight?.value ?? null,
          height: latestHeight?.value ?? null,
          bmi: latestBmi?.value ?? null,
          date: mostRecentDate,
        }
      : null;
  }

  res.json({
    success: true,
    data: user,
  });
});

// ------------------------------
// 💳 @desc Get all subscriptions (paginated)
// @route GET /api/v1/admin/subscriptions
// @access Private (Admin only)
// ------------------------------
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const status = req.query.status || null;

  const filter = status ? { status } : {};

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate("clientId", "fullName email")
      .populate("coachId", "fullName email")
      .populate("planId", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Subscription.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: subscriptions,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});


// ------------------------------
// 🛍️ @desc Get all products
// @route GET /api/v1/admin/products
// @access Private (Admin)
// ------------------------------
export const getAllProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;
  const coachId = req.query.coachId || null;

  const query = coachId ? { coachId } : {};

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("coachId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 🗑️ @desc Delete a product (Admin only)
// @route DELETE /api/v1/admin/products/:id
// @access Private (Admin only)
// ------------------------------
export const deleteProductByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid product ID format");
  }

  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await product.deleteOne();

  res.json({
    success: true,
    message: "Product deleted successfully",
  });
});

// ------------------------------
// 📦 @desc Get all orders
// @route GET /api/v1/admin/orders
// @access Private (Admin)
// ------------------------------
export const getAllOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({})
      .populate("clientId", "fullName email")
      .populate("coachId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// ✅ @desc Update subscription status (approve/reject)
// @route PATCH /api/v1/admin/subscriptions/:id/status
// @access Private (Admin only)
// ------------------------------
export const updateSubscriptionStatusByAdmin = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  if (subscription.status === "cancelled") {
    res.status(400);
    throw new Error("Cancelled subscriptions cannot be updated");
  }

  const wasApproved = subscription.status === "approved";

  subscription.status = status;

  if (status === "approved") {
    subscription.startDate = new Date();
    const weeks = subscription.durationWeeks || 4;
    const end = new Date(subscription.startDate);
    end.setDate(end.getDate() + weeks * 7);
    subscription.endDate = end;

    const expiredSubs = await Subscription.find({
      _id: { $ne: subscription._id },
      clientId: subscription.clientId,
      status: "approved",
      endDate: { $gte: subscription.startDate },
    });

    await Subscription.updateMany(
      {
        _id: { $ne: subscription._id },
        clientId: subscription.clientId,
        status: "approved",
        endDate: { $gte: subscription.startDate },
      },
      { $set: { status: "expired" } }
    );

    for (const expiredSub of expiredSubs) {
      onSubscriptionEnded({
        clientId: expiredSub.clientId,
        planId: expiredSub.planId,
      }).catch((err) => console.error("Failed to remove from plan group:", err));
    }

    const subscriptionPlan = await Plan.findById(subscription.planId);
    if (subscriptionPlan?.title) {
      subscription.planTitle = subscriptionPlan.title;
    }

    const approvedPlanTitle = subscriptionPlan?.title || subscription.planTitle;

    onSubscriptionApproved({
      clientId: subscription.clientId,
      coachId: subscription.coachId,
      planId: subscription.planId,
      planTitle: approvedPlanTitle,
    }).catch((err) => console.error("Failed to add to plan group:", err));

    if (subscriptionPlan) {
      if (subscriptionPlan.workoutPlanIds && subscriptionPlan.workoutPlanIds.length > 0) {
        subscription.assignedWorkoutPlanIds = subscriptionPlan.workoutPlanIds;
      }
      if (subscriptionPlan.dietPlanIds && subscriptionPlan.dietPlanIds.length > 0) {
        subscription.assignedDietPlanIds = subscriptionPlan.dietPlanIds;
      }
    }
  }

  if (status === "rejected" && wasApproved) {
    onSubscriptionEnded({
      clientId: subscription.clientId,
      planId: subscription.planId,
    }).catch((err) => console.error("Failed to remove from plan group:", err));
  }

  await subscription.save();

  res.json({
    success: true,
    message: `Subscription ${status} successfully by admin`,
    data: subscription,
  });
});

// ------------------------------
// 🚫 @desc Deactivate or activate user
// @route PATCH /api/v1/admin/users/:id/status
// @access Private (Admin only)
// ------------------------------
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Prevent deactivating admins (including self) to avoid lockout
  if (user.role === "admin") {
    res.status(400);
    throw new Error("Admins cannot be activated or deactivated by this action");
  }

  user.isActive = !user.isActive;
  await user.save();

  // If user has been deactivated, revoke all refresh tokens so they are logged out everywhere
  if (user.isActive === false) {
    await Token.deleteMany({ userId: user._id });
  }

  res.json({
    success: true,
    message: `User ${user.fullName} is now ${user.isActive ? "active" : "deactivated"}.`,
    data: { _id: user._id, isActive: user.isActive },
  });
});

// ------------------------------
// 🧹 @desc Purge stale unverified users
// @route POST /api/v1/admin/users/purge-unverified
// @access Private (Admin only)
// ------------------------------
export const purgeUnverifiedUsersByAdmin = asyncHandler(async (req, res) => {
  const ttlMinutes = req.body?.ttlMinutes;

  const deletedCount = await purgeStaleUnverifiedUsers({ ttlMinutes });

  res.json({
    success: true,
    message: `Purged ${deletedCount} stale unverified users`,
    data: { deletedCount },
  });
});


// ------------------------------
// 📋 @desc Get all plans (Admin)
// @route GET /api/v1/admin/plans
// @access Private (Admin only)
// ------------------------------
export const getAllPlans = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;
  const coachId = req.query.coachId || null;

  const query = coachId ? { coachId } : {};

  const [plans, total] = await Promise.all([
    Plan.find(query)
      .populate("coachId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Plan.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: plans,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 🗑️ @desc Delete a plan (Admin only)
// @route DELETE /api/v1/admin/plans/:id
// @access Private (Admin only)
// ------------------------------
export const deletePlanByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid plan ID format");
  }

  const plan = await Plan.findById(id);
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  await plan.deleteOne();

  res.json({
    success: true,
    message: "Plan deleted successfully",
  });
});

// ------------------------------
// 📧 @desc Get all contact us submissions (Admin)
// @route GET /api/v1/admin/contact-submissions
// @access Private (Admin only)
// ------------------------------
export const getContactUsSubmissions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const status = req.query.status || null;

  // Build filter
  const filter = {};
  if (status && ["unread", "read", "responded"].includes(status)) {
    filter.status = status;
  }

  // Optional search by name or email
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
    ];
  }

  const [submissions, total] = await Promise.all([
    ContactUs.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactUs.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: submissions,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 🐛 @desc Get all bug reports (Admin)
// @route GET /api/v1/admin/bug-reports
// @access Private (Admin only)
// ------------------------------
export const getBugReports = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const status = req.query.status || null;
  const severity = req.query.severity || null;
  const priority = req.query.priority || null;

  // Build filter
  const filter = {};
  if (status && ["open", "in-progress", "resolved", "closed", "wont-fix"].includes(status)) {
    filter.status = status;
  }
  if (severity && ["low", "medium", "high", "critical"].includes(severity)) {
    filter.severity = severity;
  }
  if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
    filter.priority = priority;
  }

  // Optional search by title, email, or description
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { title: searchRegex },
      { email: searchRegex },
      { description: searchRegex },
    ];
  }

  const [reports, total] = await Promise.all([
    BugReport.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BugReport.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: reports,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 💬 @desc Get all feedback (Admin)
// @route GET /api/v1/admin/feedback-submissions
// @access Private (Admin only)
// ------------------------------
export const getFeedbackSubmissions = asyncHandler(async (req, res) => {
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

  // Optional search by subject, email, message, or name
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
// 🗑️ @desc Get all account deletion requests
// @route GET /api/v1/admin/deletion-requests
// @access Private (Admin only)
// ------------------------------
export const getAllDeletionRequests = asyncHandler(async (req, res) => {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const status = req.query.status;
  const filter = {};
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }

  const [requests, total] = await Promise.all([
    AccountDeletionRequest.find(filter)
      .populate("userId", "fullName email role")
      .populate("processedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AccountDeletionRequest.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: requests,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 🗑️ @desc Process account deletion request
// @route PATCH /api/v1/admin/deletion-requests/:id
// @access Private (Admin only)
// ------------------------------
export const processDeletionRequest = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Status must be either 'approved' or 'rejected'");
  }

  const request = await AccountDeletionRequest.findById(req.params.id).populate("userId");
  if (!request) {
    res.status(404);
    throw new Error("Deletion request not found");
  }

  if (request.status !== "pending") {
    res.status(400);
    throw new Error("This request has already been processed");
  }

  request.status = status;
  request.adminNotes = adminNotes || null;
  request.processedBy = req.user._id;
  request.processedAt = new Date();
  await request.save();

  // If approved, actually delete the user account and associated data
  if (status === "approved" && request.userId) {
    const userId = request.userId._id;
    const userRole = request.userId.role;

    // Delete all user-related data comprehensively
    await Promise.all([
      // Auth & Sessions
      Token.deleteMany({ userId }),

      // Platform subscriptions (coach subscription to use platform)
      PlatformSubscription.deleteMany({ userId }),
      
      // Client-specific data
      Subscription.deleteMany({ clientId: userId }),
      Order.deleteMany({ clientId: userId }),
      PlanRequest.deleteMany({ clientId: userId }),
      ProgressPhoto.deleteMany({ clientId: userId }),
      
      // Coach-specific data (if user is a coach)
      ...(userRole === "coach" ? [
        Product.deleteMany({ coachId: userId }),
        Plan.deleteMany({ coachId: userId }),
        Subscription.deleteMany({ coachId: userId }),
        Order.deleteMany({ coachId: userId }),
        PlanRequest.deleteMany({ coachId: userId }),
        ProgressPhoto.deleteMany({ coachId: userId }),
        Voucher.deleteMany({ coachId: userId }),
        ContactRequest.deleteMany({ coachId: userId }),
      ] : []),
      
      // Notifications (sent to or from this user)
      Notification.deleteMany({ recipientId: userId }),
      Notification.deleteMany({ senderId: userId }),
      
      // Deletion request itself
      AccountDeletionRequest.deleteMany({ userId }),
    ]);

    // Update references in User model (remove this user as coach for clients)
    await User.updateMany(
      { coachId: userId },
      { $unset: { coachId: "" } }
    );

    // Delete the user
    await User.findByIdAndDelete(userId);
  }

  res.json({
    success: true,
    message: status === "approved" 
      ? "Account deletion request approved and user account has been deleted"
      : "Account deletion request rejected",
    data: request,
  });
});

// ------------------------------
// @desc Upload payment QR code for platform subscription
// @route POST /api/v1/admin/upload-payment-qr
// @access Private (Admin only)
// ------------------------------
export const uploadPaymentQr = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const adminId = req.user._id;

  // Delete old QR code from Cloudinary if exists
  const admin = await User.findById(adminId).select("paymentQrPublicId");
  if (admin.paymentQrPublicId) {
    try {
      await cloudinary.uploader.destroy(admin.paymentQrPublicId);
    } catch (error) {
      console.error("Failed to delete old QR code:", error);
    }
  }

  // Upload new QR code to Cloudinary
  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";
  
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/admin/payment-qr`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 1000, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  // Update admin user with new QR code
  const updatedAdmin = await User.findByIdAndUpdate(
    adminId,
    {
      paymentQrUrl: uploadResult.secure_url || uploadResult.url,
      paymentQrPublicId: uploadResult.public_id,
    },
    { new: true, select: "paymentQrUrl paymentQrPublicId" }
  );

  res.status(201).json({
    success: true,
    message: "Payment QR code uploaded successfully",
    data: {
      paymentQrUrl: updatedAdmin.paymentQrUrl,
    },
  });
});

// ------------------------------
// @desc Get payment QR code
// @route GET /api/v1/admin/payment-qr
// @access Private (Admin only)
// ------------------------------
export const getPaymentQr = asyncHandler(async (req, res) => {
  const adminId = req.user._id;

  const admin = await User.findById(adminId).select("paymentQrUrl");

  res.json({
    success: true,
    data: {
      paymentQrUrl: admin.paymentQrUrl || null,
    },
  });
});

// ------------------------------
// @desc Get chat cleanup statistics
// @route GET /api/v1/admin/chat-cleanup/stats
// @access Private (Admin only)
// ------------------------------
export const getChatCleanupStats = asyncHandler(async (req, res) => {
  const stats = await getCleanupStats();

  res.json({
    success: true,
    data: stats,
  });
});

// ------------------------------
// @desc Manually trigger chat message cleanup
// @route POST /api/v1/admin/chat-cleanup
// @access Private (Admin only)
// ------------------------------
export const triggerChatCleanup = asyncHandler(async (req, res) => {
  const result = await cleanupOldMessages();

  res.json({
    success: true,
    message: `Chat cleanup completed: ${result.deleted} messages deleted, ${result.imagesDeleted} images removed`,
    data: result,
  });
});
