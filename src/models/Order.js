// src/models/Order.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true, 
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
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
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Order must have at least one item",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    voucherCode: {
      type: String,
      default: null,
      index: true,
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
      enum: ["pending", "approved", "fulfilled", "completed", "cancelled", "rejected"],
      default: "pending",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Pre-save hook: auto-calculate totalAmount if not provided
orderSchema.pre("save", function (next) {
  if (!this.totalAmount || this.totalAmount === 0) {
    this.totalAmount = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }
  if (!this.finalAmount || this.finalAmount === 0) {
    this.finalAmount = Math.max(0, this.totalAmount - (this.discountAmount || 0));
  }
  next();
});

// Indexes for fast querying
orderSchema.index({ coachId: 1, clientId: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
