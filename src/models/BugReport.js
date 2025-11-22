import mongoose from "mongoose";

const bugReportSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, "Bug title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Bug description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    stepsToReproduce: {
      type: String,
      required: [true, "Steps to reproduce are required"],
      trim: true,
      maxlength: [2000, "Steps cannot exceed 2000 characters"],
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    category: {
      type: String,
      enum: ["ui", "functionality", "performance", "security", "data", "other"],
      default: "other",
    },
    browserInfo: {
      type: String,
      trim: true,
      maxlength: [200, "Browser info cannot exceed 200 characters"],
    },
    deviceInfo: {
      type: String,
      trim: true,
      maxlength: [200, "Device info cannot exceed 200 characters"],
    },
    pageUrl: {
      type: String,
      trim: true,
      maxlength: [500, "URL cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed", "wont-fix"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
bugReportSchema.index({ status: 1, createdAt: -1 });
bugReportSchema.index({ severity: 1, status: 1 });
bugReportSchema.index({ email: 1, createdAt: -1 });
bugReportSchema.index({ priority: 1, createdAt: -1 });

const BugReport = mongoose.model("BugReport", bugReportSchema);

export default BugReport;
