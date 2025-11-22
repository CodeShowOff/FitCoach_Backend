// src/models/PlanRequest.js
import mongoose from "mongoose";

const planRequestSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true, index: true },
    status: { type: String, enum: ["pending", "approved", "declined"], default: "pending", index: true },
    notes: { type: String, trim: true, maxlength: 500 },
    paymentMode: { type: String, enum: ["manual_qr", "cash", "other"], default: "manual_qr" },
    paymentProofUrl: { type: String, default: null },
    approvedAt: { type: Date },
    declinedAt: { type: Date },
  },
  { timestamps: true }
);

planRequestSchema.index({ coachId: 1, status: 1, createdAt: -1 });
planRequestSchema.index({ clientId: 1, status: 1 });

const PlanRequest = mongoose.model("PlanRequest", planRequestSchema);
export default PlanRequest;