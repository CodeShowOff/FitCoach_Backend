// src/models/ProgressPhoto.js
import mongoose from "mongoose";

const progressPhotoSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client ID is required"],
      index: true,
    },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coach ID is required"],
      index: true,
    },
    url: {
      type: String,
      required: [true, "Photo URL is required"],
    },
    publicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Composite index for efficient queries
progressPhotoSchema.index({ clientId: 1, uploadedAt: -1 });
progressPhotoSchema.index({ coachId: 1, clientId: 1 });

const ProgressPhoto = mongoose.model("ProgressPhoto", progressPhotoSchema);
export default ProgressPhoto;
