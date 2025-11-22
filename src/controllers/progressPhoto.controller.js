// src/controllers/progressPhoto.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import ProgressPhoto from "../models/ProgressPhoto.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// ------------------------------
// 🧩 Validation Schema
// ------------------------------
const progressPhotoSchema = Joi.object({
  caption: Joi.string().max(200).optional().allow(""),
});

// ------------------------------
// 📸 @desc Upload progress photo (Client only)
// @route POST /api/v1/progress-photos
// @access Private (Client)
// ------------------------------
export const uploadProgressPhoto = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No photo file provided");
  }

  const { error, value } = progressPhotoSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { caption } = value;

  // Get client's coach
  const client = await User.findById(req.user._id).select("coachId");
  if (!client || !client.coachId) {
    res.status(400);
    throw new Error("You must be assigned to a coach to upload progress photos");
  }

  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";

  // Upload from buffer using upload_stream
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/${req.user.id}/progress_photos`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 1200, crop: "limit" },
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

  const progressPhoto = await ProgressPhoto.create({
    clientId: req.user._id,
    coachId: client.coachId,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    caption: caption || "",
  });

  res.status(201).json({
    success: true,
    message: "Progress photo uploaded successfully",
    data: progressPhoto,
  });
});

// ------------------------------
// 📊 @desc Get my progress photos (Client only)
// @route GET /api/v1/progress-photos/my
// @access Private (Client)
// ------------------------------
export const getMyProgressPhotos = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const [photos, total] = await Promise.all([
    ProgressPhoto.find({ clientId: req.user._id })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit),
    ProgressPhoto.countDocuments({ clientId: req.user._id }),
  ]);

  res.json({
    success: true,
    data: photos,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 🧑‍🏫 @desc Get progress photos for a specific client (Coach only)
// @route GET /api/v1/progress-photos/client/:clientId
// @access Private (Coach)
// ------------------------------
export const getClientProgressPhotos = asyncHandler(async (req, res) => {
  const clientId = req.params.clientId;
  const requesterRole = req.user.role;

  let client;
  let coachFilter = undefined;

  if (requesterRole === "coach") {
    client = await User.findOne({
      _id: clientId,
      coachId: req.user._id,
      role: "client",
    });

    if (!client) {
      res.status(404);
      throw new Error("Client not found or not assigned to this coach");
    }

    coachFilter = req.user._id;
  } else if (requesterRole === "admin") {
    client = await User.findOne({ _id: clientId, role: "client" });

    if (!client) {
      res.status(404);
      throw new Error("Client not found");
    }
  } else {
    res.status(403);
    throw new Error("Forbidden");
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const query = { clientId };
  if (coachFilter) {
    query.coachId = coachFilter;
  }

  const [photos, total] = await Promise.all([
    ProgressPhoto.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit),
    ProgressPhoto.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: photos,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 🗑️ @desc Delete progress photo (Client only - own photos)
// @route DELETE /api/v1/progress-photos/:photoId
// @access Private (Client)
// ------------------------------
export const deleteProgressPhoto = asyncHandler(async (req, res) => {
  const { photoId } = req.params;

  const photo = await ProgressPhoto.findOne({
    _id: photoId,
    clientId: req.user._id,
  });

  if (!photo) {
    res.status(404);
    throw new Error("Progress photo not found or you don't have permission to delete it");
  }

  // Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(photo.publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    // Continue with database deletion even if Cloudinary fails
  }

  await ProgressPhoto.deleteOne({ _id: photoId });

  res.json({
    success: true,
    message: "Progress photo deleted successfully",
  });
});
