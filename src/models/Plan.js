// src/models/Plan.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    completedByClient: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coach ID is required"],
      index: true,
    },
    // allow template plans where clientId can be null
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    isTemplate: {
      type: Boolean,
      default: false,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Plan title is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    goal: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationWeeks: {
      type: Number,
      default: 4,
      min: 1,
      max: 52,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    tasks: [taskSchema],
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate endDate if not provided
planSchema.pre("save", function (next) {
  if (!this.endDate && this.startDate && this.durationWeeks) {
    const end = new Date(this.startDate);
    end.setDate(end.getDate() + this.durationWeeks * 7);
    this.endDate = end;
  }
  next();
});

// Indexes for query performance
planSchema.index({ coachId: 1, clientId: 1 });
planSchema.index({ status: 1, isTemplate: 1 });
planSchema.index({ coachId: 1, isTemplate: 1, isDefault: 1 });
planSchema.index({ createdAt: -1 });

const Plan = mongoose.model("Plan", planSchema);
export default Plan;
