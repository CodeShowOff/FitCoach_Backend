import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    clientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    appliesToAllClients: {
      type: Boolean,
      default: false,
    },
    validFrom: {
      type: Date,
    },
    validTo: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    redeemedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

voucherSchema.index({ coachId: 1, code: 1 }, { unique: true });

const Voucher = mongoose.model("Voucher", voucherSchema);

export default Voucher;
