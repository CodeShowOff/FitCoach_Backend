 
// src/models/ProgressLog.js
import mongoose from "mongoose";

const progressLogSchema = new mongoose.Schema(
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
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan ID is required"],
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    weight: {
      type: Number,
      min: 0,
      max: 500,
    },
    // Store height (cm) when user logs progress; useful for BMI recalculations or if profile height unset
    height: {
      type: Number,
      min: 0,
      max: 300,
    },
    bmi: {
      type: Number,
      min: 0,
      max: 100,
    },
    waterIntakeLiters: {
      type: Number,
      min: 0,
      max: 10,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    completedTasks: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

// Composite index for performance on coach-client-plan lookups
progressLogSchema.index({ coachId: 1, clientId: 1, planId: 1 });
progressLogSchema.index({ date: -1 });

const ProgressLog = mongoose.model("ProgressLog", progressLogSchema);
export default ProgressLog;
