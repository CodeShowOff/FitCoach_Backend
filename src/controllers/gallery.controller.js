// src/controllers/gallery.controller.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// ------------------------------
// @desc Upload award/achievement image for coach
// @route POST /api/v1/users/upload-award
// @access Private (coach only)
// ------------------------------
export const uploadAward = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role !== "coach") {
    res.status(403);
    throw new Error("Only coaches can upload awards");
  }

  // Limit to 10 awards
  if (user.awards && user.awards.length >= 10) {
    res.status(400);
    throw new Error("Maximum 10 awards allowed");
  }

  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/${req.user.id}/awards`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 1200, crop: "limit" },
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

  user.awards.push({
    url: uploadResult.secure_url || uploadResult.url,
    publicId: uploadResult.public_id,
    uploadedAt: new Date()
  });

  await user.save();

  res.json({
    success: true,
    message: "Award image uploaded successfully",
    data: {
      award: user.awards[user.awards.length - 1]
    },
  });
});

// ------------------------------
// @desc Delete award/achievement image
// @route DELETE /api/v1/users/awards/:publicId
// @access Private (coach only)
// ------------------------------
export const deleteAward = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const awardIndex = user.awards.findIndex(a => a.publicId === publicId);
  if (awardIndex === -1) {
    res.status(404);
    throw new Error("Award not found");
  }

  // Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (e) {
    console.warn("Failed to delete award from Cloudinary:", e.message || e);
  }

  user.awards.splice(awardIndex, 1);
  await user.save();

  res.json({
    success: true,
    message: "Award deleted successfully"
  });
});

// ------------------------------
// @desc Upload transformation result image for coach
// @route POST /api/v1/users/upload-transformation
// @access Private (coach only)
// ------------------------------
export const uploadTransformation = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role !== "coach") {
    res.status(403);
    throw new Error("Only coaches can upload transformations");
  }

  // Limit to 20 transformations
  if (user.transformations && user.transformations.length >= 20) {
    res.status(400);
    throw new Error("Maximum 20 transformations allowed");
  }

  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/${req.user.id}/transformations`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 1200, crop: "limit" },
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

  user.transformations.push({
    url: uploadResult.secure_url || uploadResult.url,
    publicId: uploadResult.public_id,
    uploadedAt: new Date()
  });

  await user.save();

  res.json({
    success: true,
    message: "Transformation image uploaded successfully",
    data: {
      transformation: user.transformations[user.transformations.length - 1]
    },
  });
});

// ------------------------------
// @desc Delete transformation result image
// @route DELETE /api/v1/users/transformations/:publicId
// @access Private (coach only)
// ------------------------------
export const deleteTransformation = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const transformationIndex = user.transformations.findIndex(t => t.publicId === publicId);
  if (transformationIndex === -1) {
    res.status(404);
    throw new Error("Transformation not found");
  }

  // Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (e) {
    console.warn("Failed to delete transformation from Cloudinary:", e.message || e);
  }

  user.transformations.splice(transformationIndex, 1);
  await user.save();

  res.json({
    success: true,
    message: "Transformation deleted successfully"
  });
});
