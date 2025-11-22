import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    userRole: {
      type: String,
      enum: ["client", "coach", "visitor", "other"],
      default: "visitor",
    },
    feedbackType: {
      type: String,
      enum: ["general", "feature-request", "improvement", "complaint", "praise", "other"],
      default: "general",
      index: true,
    },
    category: {
      type: String,
      enum: ["platform", "coaches", "subscriptions", "products", "progress-tracking", "ui-ux", "performance", "other"],
      default: "other",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, "Rating is required"],
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["new", "reviewed", "acknowledged", "implemented", "archived"],
      default: "new",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin response cannot exceed 1000 characters"],
      default: null,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    implementedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ feedbackType: 1, status: 1 });
feedbackSchema.index({ rating: 1, createdAt: -1 });
feedbackSchema.index({ email: 1, createdAt: -1 });
feedbackSchema.index({ priority: 1, status: 1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
