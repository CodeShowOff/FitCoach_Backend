// src/controllers/users.controller.js
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../models/User.js";
import AccountDeletionRequest from "../models/AccountDeletionRequest.js";
import Joi from "joi";
import { getPlanSummariesForClients } from "../services/planSummary.service.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// ------------------------------
// ⚙️ Validation Schemas
// ------------------------------
const addressSchema = Joi.object({
  phoneNumber: Joi.string().max(30).allow(null, ""),
  line1: Joi.string().max(200).allow(null, ""),
  line2: Joi.string().max(200).allow(null, ""),
  neighborhood: Joi.string().max(100).allow(null, ""),
  city: Joi.string().max(100).allow(null, ""),
  state: Joi.string().max(100).allow(null, ""),
  postalCode: Joi.string().max(20).allow(null, ""),
  country: Joi.string().max(100).allow(null, ""),
}).unknown(false);

const socialMediaSchema = Joi.object({
  instagram: Joi.string().uri().max(200).allow(null, "").optional(),
  facebook: Joi.string().uri().max(200).allow(null, "").optional(),
  twitter: Joi.string().uri().max(200).allow(null, "").optional(),
  linkedin: Joi.string().uri().max(200).allow(null, "").optional(),
  youtube: Joi.string().uri().max(200).allow(null, "").optional(),
  website: Joi.string().uri().max(200).allow(null, "").optional(),
}).unknown(false).optional();

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(3).max(100),
  specialization: Joi.string().max(100),
  experienceYears: Joi.number().min(0).max(50),
  description: Joi.string().max(1000).allow(null, ""),
  address: addressSchema,
  socialMedia: socialMediaSchema,
});

// ------------------------------
// 👤 @desc Get current user profile
// @route GET /api/v1/users/me
// @access Private (Coach/Client)
// ------------------------------
export const getProfile = asyncHandler(async (req, res) => {
  // Avoid mixing inclusion & exclusion in select (was previously mixing '-password' with inclusions).
  // Password is already excluded by schema (select: false). Explicitly list needed fields.
  const user = await User.findById(req.user._id)
    .select(
      "fullName email role phone whatsappNumber address specialization experienceYears description socialMedia awards transformations coachCode referralCode createdAt updatedAt coachId avatarUrl paymentQrUrl weightHistory heightHistory bmiHistory"
    )
    .populate({
      path: "coachId",
      // Include coach referralCode so we can expose it as coachCode for clients
      select: "fullName email phone whatsappNumber referralCode coachCode",
    });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const userObject = user.toObject({ getters: true });

  // Normalize coachCode so frontend can always read a friendly code
  userObject.coachCode =
    userObject.coachCode || userObject.referralCode || userObject.coachId?.referralCode || null;

  if (user.role === "client") {
    const { summaries } = await getPlanSummariesForClients(
      user.coachId?._id || user.coachId,
      [user._id]
    );

    userObject.planSummary = summaries[user._id.toString()] || {
      current: null,
      pending: [],
      defaultPlan: null,
    };

    // Always read latest health metrics from history arrays for clients
    const latestWeight = user.weightHistory?.length > 0 
      ? user.weightHistory[user.weightHistory.length - 1].value 
      : null;
    const latestHeight = user.heightHistory?.length > 0 
      ? user.heightHistory[user.heightHistory.length - 1].value 
      : null;
    const latestBmi = user.bmiHistory?.length > 0 
      ? user.bmiHistory[user.bmiHistory.length - 1].value 
      : null;

    userObject.weight = latestWeight;
    userObject.height = latestHeight;
    userObject.bmi = latestBmi;
  } else if (user.role === "coach") {
    const { defaultPlan, fallbackPlan } = await getPlanSummariesForClients(
      user._id,
      []
    );

    userObject.planSummary = {
      current: null,
      pending: [],
      defaultPlan: defaultPlan || fallbackPlan || null,
    };
  }

  res.json({
    success: true,
    data: userObject,
  });
});

// ------------------------------
// ✏️ @desc Update current user profile
// @route PUT /api/v1/users/me
// @access Private (Coach/Client)
// ------------------------------
export const updateProfile = asyncHandler(async (req, res) => {
  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  Object.assign(user, value);
  const updatedUser = await user.save();

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

// ------------------------------
// 📋 @desc Get all clients for a coach (with pagination)
// @route GET /api/v1/users/clients
// @access Private (Coach only)
// ------------------------------
export const getClientsForCoach = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;


  // Ensure only coaches can access this
  if (req.user.role !== "coach") {
    res.status(403);
    throw new Error("Access denied, only coaches can view clients");
  }

  // Query all clients under this coach
  const [clients, totalClients] = await Promise.all([
    User.find({ coachId: req.user._id, role: "client" })
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments({ coachId: req.user._id, role: "client" }),
  ]);

  res.json({
    success: true,
    data: clients,
    pagination: {
      totalClients,
      currentPage: page,
      totalPages: Math.ceil(totalClients / limit),
      limit,
    },
  });
});

// ------------------------------
// 🔍 @desc Get specific client by ID (coach only)
// @route GET /api/v1/users/clients/:id
// @access Private (Coach only)
// ------------------------------
export const getClientById = asyncHandler(async (req, res) => {
  if (req.user.role !== "coach") {
    res.status(403);
    throw new Error("Access denied");
  }

  // Validate ObjectId format to prevent injection attacks
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid client ID format");
  }

  const client = await User.findOne({
    _id: req.params.id,
    coachId: req.user._id,
    role: "client",
  })
    .select("-password")
    .lean();

  if (!client) {
    res.status(404);
    throw new Error("Client not found under this coach");
  }

  // Fetch latest progress from client's history arrays
  const latestWeight = client.weightHistory?.length > 0 
    ? client.weightHistory[client.weightHistory.length - 1] 
    : null;
  const latestHeight = client.heightHistory?.length > 0 
    ? client.heightHistory[client.heightHistory.length - 1] 
    : null;
  const latestBmi = client.bmiHistory?.length > 0 
    ? client.bmiHistory[client.bmiHistory.length - 1] 
    : null;

  // Determine the most recent date across all metrics
  const dates = [
    latestWeight?.date,
    latestHeight?.date,
    latestBmi?.date,
  ].filter(Boolean);
  const mostRecentDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : null;

  const { summaries } = await getPlanSummariesForClients(req.user._id, [client._id]);
  const planSummary = summaries[client._id.toString()] || {
    current: null,
    pending: [],
    defaultPlan: null,
  };

  res.json({
    success: true,
    data: {
      ...client,
      // Always surface most recent values from history arrays
      weight: latestWeight?.value ?? null,
      bmi: latestBmi?.value ?? null,
      height: latestHeight?.value ?? null,
      latestProgress: (latestWeight || latestHeight || latestBmi)
        ? {
          weight: latestWeight?.value ?? null,
          height: latestHeight?.value ?? null,
          bmi: latestBmi?.value ?? null,
          date: mostRecentDate,
        }
        : null,
      planSummary,
    },
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    success: true,
    data: user,
  });
});

export const getAssignedCoach = asyncHandler(async (req, res) => {
  if (req.user.role !== "client") {
    res.status(403);
    throw new Error("Only clients can view assigned coach details");
  }

  const currentUser = await User.findById(req.user._id)
    .select("coachId")
    .populate({
      path: "coachId",
      select:
        "fullName email role phone whatsappNumber specialization experienceYears bio createdAt paymentQrUrl avatarUrl coachCode referralCode isActive address",
    })
    .lean();

  const coach = currentUser?.coachId ?? null;

  res.json({
    success: true,
    data: coach,
  });
});

// ------------------------------
// @desc Upload avatar for current user
// @route POST /api/v1/users/upload-avatar
// @access Private (client/coach/admin)
// ------------------------------
export const uploadAvatar = asyncHandler(async (req, res) => {
  // multer put file in req.file
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // optional folder prefix from env
  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";

  // If user already has avatarPublicId, destroy (cleanup) — ignore errors
  if (user.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(user.avatarPublicId, { invalidate: true });
    } catch (e) {
      // log and continue
      console.warn("Failed to delete old avatar on Cloudinary:", e.message || e);
    }
  }

  // Upload from buffer using upload_stream
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/${req.user.id}/avatar`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 600, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
          { flags: "force_strip" }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  // Save returned URL and public_id to user
  user.avatarUrl = uploadResult.secure_url || uploadResult.url;
  user.avatarPublicId = uploadResult.public_id;
  await user.save();

  res.json({
    success: true,
    message: "Avatar uploaded successfully",
    data: {
      avatarUrl: user.avatarUrl,
      avatarPublicId: user.avatarPublicId,
    },
  });
});

// ------------------------------
// @desc Upload payment QR image for coach/admin
// @route POST /api/v1/users/upload-payment-qr
// @access Private (coach/admin)
// ------------------------------
export const uploadPaymentQr = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  if (!['coach','admin'].includes(req.user.role)) {
    res.status(403);
    throw new Error("Only coaches or admins can upload a payment QR code");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";

  if (user.paymentQrPublicId) {
    try {
      await cloudinary.uploader.destroy(user.paymentQrPublicId, { invalidate: true });
    } catch (e) {
      console.warn("Failed to delete old payment QR on Cloudinary:", e.message || e);
    }
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/${req.user.id}/payment_qr`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 800, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
          { flags: "force_strip" }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  user.paymentQrUrl = uploadResult.secure_url || uploadResult.url;
  user.paymentQrPublicId = uploadResult.public_id;
  await user.save();

  res.json({
    success: true,
    message: "Payment QR uploaded successfully",
    data: {
      paymentQrUrl: user.paymentQrUrl,
      paymentQrPublicId: user.paymentQrPublicId,
    },
  });
});

// ------------------------------
// 🗑️ @desc Request account deletion
// @route POST /api/v1/users/request-deletion
// @access Private (Client/Coach)
// ------------------------------
export const requestAccountDeletion = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    reason: Joi.string().max(1000).allow(null, "").optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Check if there's already a pending request
  const existingRequest = await AccountDeletionRequest.findOne({
    userId: req.user._id,
    status: "pending",
  });

  if (existingRequest) {
    res.status(400);
    throw new Error("You already have a pending account deletion request");
  }

  const deletionRequest = await AccountDeletionRequest.create({
    userId: req.user._id,
    reason: value.reason || null,
  });

  res.status(201).json({
    success: true,
    message: "Account deletion request submitted successfully. An admin will review your request.",
    data: deletionRequest,
  });
});

// ------------------------------
// 🗑️ @desc Get current user's deletion request status
// @route GET /api/v1/users/my-deletion-request
// @access Private (Client/Coach)
// ------------------------------
export const getMyDeletionRequest = asyncHandler(async (req, res) => {
  const request = await AccountDeletionRequest.findOne({
    userId: req.user._id,
    status: "pending",
  });

  res.json({
    success: true,
    data: request,
  });
});
