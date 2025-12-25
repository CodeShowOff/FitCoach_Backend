// src/models/Document.js
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    url: {
      type: String,
      required: [true, "Document URL is required"],
      trim: true,
    },
    publicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
      trim: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ["image", "raw"],
      required: [true, "Resource type is required"],
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, "Original filename is required"],
      trim: true,
      maxlength: 255,
    },

    // Optional display name provided by the user; if not provided we fall back to originalName
    name: {
      type: String,
      default: null,
      trim: true,
      maxlength: 255,
    },
    bytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    format: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, createdAt: -1 });

const Document = mongoose.model("Document", documentSchema);
export default Document;
