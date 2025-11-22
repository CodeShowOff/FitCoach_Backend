// src/models/PlatformSubscription.js
import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  transactionId: {
    type: String,
  },
  paymentProof: {
    type: String, // Cloudinary URL for payment screenshot
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  approvedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
  validFrom: {
    type: Date,
  },
  validUntil: {
    type: Date,
  },
  notes: {
    type: String,
  },
});

const platformSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["trial", "active", "expired", "suspended"],
      default: "trial",
    },
    trialEndsAt: {
      type: Date,
      required: true,
    },
    subscriptionExpiresAt: {
      type: Date,
    },
    lastPaymentDate: {
      type: Date,
    },
    paymentHistory: [paymentHistorySchema],
    totalPaid: {
      type: Number,
      default: 0,
    },
    notifications: {
      threeDayWarning: { type: Boolean, default: false },
      oneDayWarning: { type: Boolean, default: false },
      expiryNotification: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
// Note: userId already has unique index from schema definition, no need to add again
platformSubscriptionSchema.index({ status: 1 });
platformSubscriptionSchema.index({ trialEndsAt: 1 });
platformSubscriptionSchema.index({ subscriptionExpiresAt: 1 });

// Method to check if subscription is valid
platformSubscriptionSchema.methods.isValid = function () {
  const now = new Date();
  
  if (this.status === "trial") {
    return now < this.trialEndsAt;
  }
  
  if (this.status === "active") {
    return now < this.subscriptionExpiresAt;
  }
  
  return false;
};

// Method to get days remaining
platformSubscriptionSchema.methods.getDaysRemaining = function () {
  const now = new Date();
  let expiryDate;
  
  if (this.status === "trial") {
    expiryDate = this.trialEndsAt;
  } else if (this.status === "active") {
    expiryDate = this.subscriptionExpiresAt;
  } else {
    return 0;
  }
  
  const diffTime = expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Static method to check and update expired subscriptions
platformSubscriptionSchema.statics.updateExpiredSubscriptions = async function () {
  const now = new Date();
  
  // Update expired trials
  await this.updateMany(
    {
      status: "trial",
      trialEndsAt: { $lt: now },
    },
    {
      $set: { status: "expired" },
    }
  );
  
  // Update expired active subscriptions
  await this.updateMany(
    {
      status: "active",
      subscriptionExpiresAt: { $lt: now },
    },
    {
      $set: { status: "expired" },
    }
  );
};

const PlatformSubscription = mongoose.model("PlatformSubscription", platformSubscriptionSchema);

export default PlatformSubscription;
