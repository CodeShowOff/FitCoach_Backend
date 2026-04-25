// src/controllers/platformSubscription.controller.js
import asyncHandler from "express-async-handler";
import PlatformSubscription from "../models/PlatformSubscription.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const PLATFORM_FEE = 199; // ₹199 per month
const SUBSCRIPTION_DURATION_DAYS = 30; // 30 days per payment
const REFERRAL_REWARD_DAYS = 10; // Days to extend inviter's subscription on successful referral

// ------------------------------
// @desc Get subscription status
// @route GET /api/v1/platform-subscription/status
// @access Private (Coach)
// ------------------------------
export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let subscription = await PlatformSubscription.findOne({ userId });

  // If no subscription, create one from user data or initialize trial
  if (!subscription) {
    const user = await User.findById(userId).select("platformSubscriptionStatus trialEndsAt subscriptionExpiresAt createdAt");
    
    const trialEndsAt = user.trialEndsAt || new Date(user.createdAt.getTime() + 28 * 24 * 60 * 60 * 1000);
    
    subscription = await PlatformSubscription.create({
      userId,
      status: user.platformSubscriptionStatus || "trial",
      trialEndsAt,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    });
  }

  const daysRemaining = subscription.getDaysRemaining();
  const isValid = subscription.isValid();

  // Get admin payment QR code
  const admin = await User.findOne({ role: "admin" }).select("paymentQrUrl");
  const paymentQrUrl = admin?.paymentQrUrl || null;

  res.json({
    success: true,
    data: {
      status: subscription.status,
      isValid,
      daysRemaining,
      trialEndsAt: subscription.trialEndsAt,
      subscriptionExpiresAt: subscription.subscriptionExpiresAt,
      lastPaymentDate: subscription.lastPaymentDate,
      totalPaid: subscription.totalPaid,
      platformFee: PLATFORM_FEE,
      notifications: subscription.notifications,
      paymentQrUrl, // Add admin QR code to response
    },
  });
});

// ------------------------------
// @desc Submit platform fee payment
// @route POST /api/v1/platform-subscription/payment
// @access Private (Coach)
// ------------------------------
export const submitPayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { transactionId, notes } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error("Payment proof screenshot is required");
  }

  // Upload payment proof to Cloudinary with user ID in path
  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";
  
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/${userId}/platform-subscriptions`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 1500, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  let subscription = await PlatformSubscription.findOne({ userId });

  if (!subscription) {
    const user = await User.findById(userId).select("platformSubscriptionStatus trialEndsAt subscriptionExpiresAt createdAt");
    const trialEndsAt = user.trialEndsAt || new Date(user.createdAt.getTime() + 28 * 24 * 60 * 60 * 1000);
    
    subscription = await PlatformSubscription.create({
      userId,
      status: user.platformSubscriptionStatus || "trial",
      trialEndsAt,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    });
  }

  // Add payment to history
  const payment = {
    amount: PLATFORM_FEE,
    transactionId: transactionId || `TXN-${Date.now()}`,
    paymentProof: uploadResult.secure_url,
    status: "pending",
    paidAt: new Date(),
    notes: notes || "",
  };

  subscription.paymentHistory.push(payment);
  await subscription.save();

  // Send email notification to admin
  try {
    const admin = await User.findOne({ role: "admin" }).select("email fullName");
    const coach = req.user;

    if (admin && admin.email) {
      const { sendEmail } = await import("../services/email.service.js");
      await sendEmail({
        to: admin.email,
        subject: "New Platform Subscription Payment Request",
        html: `
          <h2>New Platform Subscription Payment Received</h2>
          <p>Hi ${admin.fullName || "Admin"},</p>
          <p>A coach has submitted a payment for platform subscription approval.</p>
          <hr>
          <p><strong>Coach Details:</strong></p>
          <ul>
            <li><strong>Name:</strong> ${coach.fullName}</li>
            <li><strong>Email:</strong> ${coach.email}</li>
            <li><strong>User ID:</strong> ${coach._id}</li>
          </ul>
          <p><strong>Payment Details:</strong></p>
          <ul>
            <li><strong>Amount:</strong> ₹${PLATFORM_FEE}</li>
            <li><strong>Transaction ID:</strong> ${payment.transactionId}</li>
            <li><strong>Submitted At:</strong> ${new Date().toLocaleString("en-IN")}</li>
            ${payment.notes ? `<li><strong>Notes:</strong> ${payment.notes}</li>` : ""}
          </ul>
          <p><a href="${process.env.FRONTEND_URL}/admin/platform-subscriptions" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Review Payment</a></p>
          <p>Please log in to the admin panel to review and approve/reject this payment.</p>
        `,
      });
    }
  } catch (emailError) {
    console.error("Failed to send admin notification email:", emailError);
    // Don't fail the request if email fails
  }

  res.status(201).json({
    success: true,
    message: "Payment submitted successfully. Awaiting admin approval.",
    data: {
      paymentId: subscription.paymentHistory[subscription.paymentHistory.length - 1]._id,
      status: "pending",
    },
  });
});

// ------------------------------
// @desc Get payment history
// @route GET /api/v1/platform-subscription/history
// @access Private (Coach)
// ------------------------------
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const subscription = await PlatformSubscription.findOne({ userId }).populate({
    path: "paymentHistory.approvedBy",
    select: "fullName email",
  });

  if (!subscription) {
    return res.json({
      success: true,
      data: [],
    });
  }

  res.json({
    success: true,
    data: subscription.paymentHistory.sort((a, b) => b.paidAt - a.paidAt),
  });
});

// ------------------------------
// ADMIN ROUTES
// ------------------------------

// @desc Get all coach subscriptions
// @route GET /api/v1/platform-subscription/admin/all
// @access Private (Admin)
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;

  const subscriptions = await PlatformSubscription.find(query)
    .populate({
      path: "userId",
      select: "fullName email phone whatsappNumber referralCode createdAt",
    })
    .sort({ updatedAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  // If a user is deleted without cleaning up, populate() yields null userId.
  // Clean these up so admin never sees "[Deleted User]" rows.
  const orphanIds = subscriptions.filter((s) => !s.userId).map((s) => s._id);
  if (orphanIds.length > 0) {
    await PlatformSubscription.deleteMany({ _id: { $in: orphanIds } });
  }

  const visibleSubscriptions = subscriptions.filter((s) => s.userId);
  const total = await PlatformSubscription.countDocuments(query);

  res.json({
    success: true,
    data: visibleSubscriptions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @desc Get pending payments
// @route GET /api/v1/platform-subscription/admin/pending-payments
// @access Private (Admin)
export const getPendingPayments = asyncHandler(async (req, res) => {
  const subscriptions = await PlatformSubscription.find({
    "paymentHistory.status": "pending",
  }).populate({
    path: "userId",
    select: "fullName email phone referralCode",
  });

  const orphanIds = subscriptions.filter((s) => !s.userId).map((s) => s._id);
  if (orphanIds.length > 0) {
    await PlatformSubscription.deleteMany({ _id: { $in: orphanIds } });
  }

  const visibleSubscriptions = subscriptions.filter((s) => s.userId);

  // Return subscriptions with their payment history
  res.json({
    success: true,
    data: visibleSubscriptions,
    pagination: {
      total: visibleSubscriptions.length,
      page: 1,
      totalPages: 1,
      limit: visibleSubscriptions.length,
    },
  });
});

// @desc Approve/Reject payment
// @route PUT /api/v1/platform-subscription/admin/payment/:subscriptionId/:paymentId
// @access Private (Admin)
export const approveOrRejectPayment = asyncHandler(async (req, res) => {
  const { subscriptionId, paymentId } = req.params;
  const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'

  if (!["approve", "reject"].includes(action)) {
    res.status(400);
    throw new Error("Invalid action. Must be 'approve' or 'reject'");
  }

  const subscription = await PlatformSubscription.findById(subscriptionId);

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  const payment = subscription.paymentHistory.id(paymentId);

  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  if (payment.status !== "pending") {
    res.status(400);
    throw new Error("Payment has already been processed");
  }

  if (action === "approve") {
    payment.status = "approved";
    payment.approvedBy = req.user._id;
    payment.approvedAt = new Date();

    // Calculate validity period - ALWAYS start from NOW (approval date)
    // The user pays for 30 days from the day their payment is approved,
    // not from any previous expiry date
    const now = new Date();
    const validFrom = now;
    const validUntil = new Date(now.getTime() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    payment.validFrom = validFrom;
    payment.validUntil = validUntil;

    // Update subscription status
    subscription.status = "active";
    subscription.subscriptionExpiresAt = validUntil;
    subscription.lastPaymentDate = now;
    subscription.totalPaid += payment.amount;

    // Reset notifications
    subscription.notifications.threeDayWarning = false;
    subscription.notifications.oneDayWarning = false;
    subscription.notifications.expiryNotification = false;

    // Update user model
    await User.findByIdAndUpdate(subscription.userId, {
      platformSubscriptionStatus: "active",
      subscriptionExpiresAt: validUntil,
    });

    // 🎁 Handle coach referral reward - Check if this is the first approved payment
    // and if the coach was referred by another coach
    const approvedPaymentsCount = subscription.paymentHistory.filter(p => p.status === "approved").length;
    
    if (approvedPaymentsCount === 1) {
      // This is the first approved payment - check for referral reward
      const referredCoach = await User.findById(subscription.userId).select("referredByCoachId referralRewardGiven");
      
      if (referredCoach?.referredByCoachId && !referredCoach.referralRewardGiven) {
        // Find the inviter's subscription and extend it
        const inviterSubscription = await PlatformSubscription.findOne({ userId: referredCoach.referredByCoachId });
        
        if (inviterSubscription) {
          // Calculate new expiry date for inviter
          const inviterCurrentExpiry = inviterSubscription.status === "trial" 
            ? inviterSubscription.trialEndsAt 
            : inviterSubscription.subscriptionExpiresAt;
          
          const baseDate = inviterCurrentExpiry && inviterCurrentExpiry > now ? inviterCurrentExpiry : now;
          const newExpiryDate = new Date(baseDate.getTime() + REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000);
          
          // Update based on inviter's subscription status
          if (inviterSubscription.status === "trial") {
            inviterSubscription.trialEndsAt = newExpiryDate;
            await User.findByIdAndUpdate(referredCoach.referredByCoachId, {
              trialEndsAt: newExpiryDate,
            });
          } else {
            inviterSubscription.subscriptionExpiresAt = newExpiryDate;
            // If inviter was expired, reactivate them
            if (inviterSubscription.status === "expired") {
              inviterSubscription.status = "active";
            }
            await User.findByIdAndUpdate(referredCoach.referredByCoachId, {
              platformSubscriptionStatus: inviterSubscription.status,
              subscriptionExpiresAt: newExpiryDate,
            });
          }
          
          // Add a note to inviter's payment history
          const referredCoachName = (await User.findById(subscription.userId).select("fullName"))?.fullName || "A coach";
          inviterSubscription.paymentHistory.push({
            amount: 0,
            transactionId: `REFERRAL-REWARD-${Date.now()}`,
            status: "approved",
            approvedBy: req.user._id,
            approvedAt: now,
            validFrom: baseDate,
            validUntil: newExpiryDate,
            notes: `Referral reward: ${REFERRAL_REWARD_DAYS} days added for referring ${referredCoachName}`,
          });
          
          await inviterSubscription.save();
          
          // Mark referral reward as given
          await User.findByIdAndUpdate(subscription.userId, {
            referralRewardGiven: true,
          });
          
          // Send notification to inviter about the referral reward
          try {
            const { createNotification } = await import("./notifications.controller.js");
            await createNotification({
              userId: referredCoach.referredByCoachId,
              title: "Referral Reward Received! 🎉",
              message: `Congratulations! Your referral ${referredCoachName} has subscribed. You've received ${REFERRAL_REWARD_DAYS} extra days!`,
              type: "referral_reward",
            });
          } catch (notifError) {
            console.error("Failed to send referral reward notification:", notifError);
            // Don't fail the main operation
          }
        }
      }
    }

  } else if (action === "reject") {
    payment.status = "rejected";
    payment.approvedBy = req.user._id;
    payment.approvedAt = new Date();
    payment.rejectionReason = rejectionReason || "Payment not verified";
  }

  await subscription.save();

  res.json({
    success: true,
    message: `Payment ${action}d successfully`,
    data: {
      status: subscription.status,
      subscriptionExpiresAt: subscription.subscriptionExpiresAt,
    },
  });
});

// @desc Extend trial or subscription
// @route PUT /api/v1/platform-subscription/admin/extend/:userId
// @access Private (Admin)
export const extendSubscription = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { days, reason } = req.body;

  if (!days || days < 1) {
    res.status(400);
    throw new Error("Please provide valid number of days");
  }

  let subscription = await PlatformSubscription.findOne({ userId });

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  const now = new Date();
  let newExpiryDate;

  if (subscription.status === "trial") {
    const currentExpiry = subscription.trialEndsAt > now ? subscription.trialEndsAt : now;
    newExpiryDate = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    subscription.trialEndsAt = newExpiryDate;
  } else {
    const currentExpiry = subscription.subscriptionExpiresAt && subscription.subscriptionExpiresAt > now 
      ? subscription.subscriptionExpiresAt 
      : now;
    newExpiryDate = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    subscription.subscriptionExpiresAt = newExpiryDate;
    
    if (subscription.status === "expired") {
      subscription.status = "active";
    }
  }

  // Add note to payment history
  subscription.paymentHistory.push({
    amount: 0,
    transactionId: `ADMIN-EXTENSION-${Date.now()}`,
    status: "approved",
    approvedBy: req.user._id,
    approvedAt: now,
    validFrom: now,
    validUntil: newExpiryDate,
    notes: `Admin extended subscription by ${days} days. Reason: ${reason || "N/A"}`,
  });

  await subscription.save();

  // Update user model
  const updateData = {};
  if (subscription.status === "trial") {
    updateData.trialEndsAt = newExpiryDate;
  } else {
    updateData.platformSubscriptionStatus = subscription.status;
    updateData.subscriptionExpiresAt = newExpiryDate;
  }
  await User.findByIdAndUpdate(userId, updateData);

  res.json({
    success: true,
    message: `Subscription extended by ${days} days`,
    data: {
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      subscriptionExpiresAt: subscription.subscriptionExpiresAt,
    },
  });
});
