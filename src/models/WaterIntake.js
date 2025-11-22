// src/models/WaterIntake.js
import mongoose from "mongoose";

const waterIntakeSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    amountLiters: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    goal: {
      type: Number,
      default: 3.5,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries by date range
waterIntakeSchema.index({ clientId: 1, date: 1 });
waterIntakeSchema.index({ coachId: 1, clientId: 1, date: 1 });

export default mongoose.model("WaterIntake", waterIntakeSchema);
