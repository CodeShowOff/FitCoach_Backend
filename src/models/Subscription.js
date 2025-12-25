 
// src/models/Subscription.js
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
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
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentProofUrl: {
      type: String,
      default: null,
    },
    paymentMode: {
      type: String,
      enum: ["manual_qr", "cash", "other"],
      default: "manual_qr",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired", "cancelled"],
      default: "pending",
      index: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    durationWeeks: {
      type: Number,
      default: 4,
      min: 1,
      max: 52,
    },
    planTitle: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Auto-assigned workout and diet plans when subscription is approved
    assignedWorkoutPlanIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CoachWorkoutPlan",
      },
    ],
    assignedDietPlanIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CoachDietPlan",
      },
    ],
  },
  { timestamps: true }
);

// Auto-set startDate when approved
subscriptionSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "approved") {
      if (!this.startDate) {
        this.startDate = new Date();
      }
      const weeks = this.durationWeeks || 4;
      const end = new Date(this.startDate);
      end.setDate(end.getDate() + weeks * 7);
      this.endDate = end;
    } else if (this.status === "cancelled") {
      const now = new Date();
      if (!this.endDate || this.endDate > now) {
        this.endDate = now;
      }
    }
  }
  next();
});

// Indexes for faster admin filtering
subscriptionSchema.index({ createdAt: -1 });
subscriptionSchema.index({ status: 1, coachId: 1, clientId: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
