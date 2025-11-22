// src/controllers/subscription.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import User from "../models/User.js";
import { getPlanSummariesForClients } from "../services/planSummary.service.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const createSubscriptionSchema = Joi.object({
  planId: Joi.string().required(),
  paymentProofUrl: Joi.string().uri().optional().allow(null, ""),
  notes: Joi.string().max(500).optional().allow("", null),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
});

const CLIENT_CANCEL_ALLOWED_STATUSES = ["pending", "approved"];

// ------------------------------
// 💳 @desc Create a new subscription (Client manually pays via QR)
// @route POST /api/v1/subscriptions
// @access Private (Client)
// ------------------------------
export const createSubscription = asyncHandler(async (req, res) => {
  const { error, value } = createSubscriptionSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { planId, paymentProofUrl, notes } = value;

  // Verify plan exists and belongs to a coach
  const plan = await Plan.findById(planId).populate("coachId");
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  // Ensure plan belongs to the client's coach (templates or direct)
  const client = await User.findById(req.user._id).select("coachId");
  if (!client?.coachId || plan.coachId._id.toString() !== client.coachId.toString()) {
    res.status(403);
    throw new Error("You can only subscribe to plans created by your coach");
  }

  const amount = typeof plan.price === "number" ? plan.price : 0;
  if (amount > 0 && !paymentProofUrl) {
    res.status(400);
    throw new Error("Payment proof is required for paid plans");
  }

  // Check if already subscribed
  const existing = await Subscription.findOne({
    clientId: req.user._id,
    planId,
    status: { $in: ["pending", "approved"] },
  });
  if (existing) {
    res.status(400);
    throw new Error("You already have an active or pending subscription for this plan");
  }

  // Create subscription
  const subscription = await Subscription.create({
    clientId: req.user._id,
    coachId: plan.coachId._id,
    planId,
    amount,
    paymentProofUrl: paymentProofUrl || null,
    paymentMode: "manual_qr",
    durationWeeks: plan.durationWeeks,
    planTitle: plan.title,
    notes,
  });

  res.status(201).json({
    success: true,
    message: "Subscription created successfully. Waiting for approval.",
    data: subscription,
  });
});

// ------------------------------
// 📜 @desc Get all subscriptions for logged-in client
// @route GET /api/v1/subscriptions/my
// @access Private (Client)
// ------------------------------
export const getMySubscriptions = asyncHandler(async (req, res) => {
  const now = new Date();

  await Subscription.updateMany(
    {
      clientId: req.user._id,
      status: "approved",
      endDate: { $lt: now },
    },
    { $set: { status: "expired" } }
  );

  const subscriptions = await Subscription.find({ clientId: req.user._id })
    .populate("planId", "title description durationWeeks price goal isDefault")
    .populate("coachId", "fullName email");

  res.json({
    success: true,
    data: subscriptions,
  });
});

// ------------------------------
// 🧑‍🏫 @desc Get subscriptions for a coach (their clients)
// @route GET /api/v1/subscriptions/coach
// @access Private (Coach)
// ------------------------------
export const getCoachSubscriptions = asyncHandler(async (req, res) => {
  const now = new Date();

  await Subscription.updateMany(
    {
      coachId: req.user._id,
      status: "approved",
      endDate: { $lt: now },
    },
    { $set: { status: "expired" } }
  );

  const subscriptions = await Subscription.find({ coachId: req.user._id })
    .populate("clientId", "fullName email")
    .populate("planId", "title")
    .sort({ createdAt: -1 });

  const statusCounters = {
    total: subscriptions.length,
    approved: 0,
    pending: 0,
    rejected: 0,
    expired: 0,
    cancelled: 0,
  };

  const planCounterMap = new Map();

  subscriptions.forEach((sub) => {
    if (statusCounters[sub.status] !== undefined) {
      statusCounters[sub.status] += 1;
    }

    const key = sub.planId?._id?.toString() || "unassigned";
    if (!planCounterMap.has(key)) {
      planCounterMap.set(key, {
        planKey: key,
        planId: sub.planId?._id || null,
        title: sub.planId?.title || sub.planTitle || "Plan removed",
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        expired: 0,
        cancelled: 0,
      });
    }

    const entry = planCounterMap.get(key);
    entry.total += 1;
    if (entry[sub.status] !== undefined) {
      entry[sub.status] += 1;
    }
  });

  const planCounts = Array.from(planCounterMap.values()).sort((a, b) => b.total - a.total);

  const clients = await User.find({ coachId: req.user._id, role: "client" })
    .select("_id")
    .lean();
  const clientIds = clients.map((client) => client._id);

  const { summaries } = await getPlanSummariesForClients(req.user._id, clientIds);

  const assignmentMap = new Map();

  clientIds.forEach((clientId) => {
    const summary = summaries[clientId.toString()];
    if (!summary) {
      return;
    }

    const current = summary.current;
    const fallbackPlan = summary.defaultPlan;

    const hasPlan = Boolean(current) || Boolean(fallbackPlan);
    const assignmentKey = current?.planId?.toString() || fallbackPlan?._id?.toString() || "no-plan";
    const title = current?.planTitle || fallbackPlan?.title || (hasPlan ? "Plan" : "No plan");
    const type = current?.type || (fallbackPlan ? "default" : "none");

    if (!assignmentMap.has(assignmentKey)) {
      assignmentMap.set(assignmentKey, {
        planKey: assignmentKey,
        title,
        type,
        count: 0,
      });
    }

    assignmentMap.get(assignmentKey).count += 1;
  });

  const assignments = Array.from(assignmentMap.values()).sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    data: subscriptions,
    summary: {
      totals: statusCounters,
      planCounts,
      assignments,
    },
  });
});

// ------------------------------
// 🧾 @desc Update subscription status (approve/reject)
// @route PATCH /api/v1/subscriptions/:id/status
// @access Private (Coach/Admin)
// ------------------------------
export const updateSubscriptionStatus = asyncHandler(async (req, res) => {
  const { error, value } = updateStatusSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  if (subscription.status === "cancelled") {
    res.status(400);
    throw new Error("Cancelled subscriptions cannot be updated");
  }

  // Ensure coach or admin owns this subscription
  if (
    req.user.role !== "admin" &&
    subscription.coachId.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("Access denied — cannot update this subscription");
  }

  subscription.status = value.status;

  if (value.status === "approved") {
    subscription.startDate = new Date();
    const weeks = subscription.durationWeeks || 4;
    const end = new Date(subscription.startDate);
    end.setDate(end.getDate() + weeks * 7);
    subscription.endDate = end;

    // Expire any other active subscriptions for this client
    await Subscription.updateMany(
      {
        _id: { $ne: subscription._id },
        clientId: subscription.clientId,
        status: "approved",
        endDate: { $gte: subscription.startDate },
      },
      { $set: { status: "expired" } }
    );
  }

  await subscription.save();

  res.json({
    success: true,
    message: `Subscription ${value.status} successfully`,
    data: subscription,
  });
});

// ------------------------------
// 🛑 @desc Cancel subscription manually (client)
// @route PATCH /api/v1/subscriptions/:id/cancel
// @access Private (Client)
// ------------------------------
export const cancelMySubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    _id: req.params.id,
    clientId: req.user._id,
  });

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  if (!CLIENT_CANCEL_ALLOWED_STATUSES.includes(subscription.status)) {
    res.status(400);
    throw new Error("Only pending or active subscriptions can be cancelled");
  }

  const wasApproved = subscription.status === "approved";

  subscription.status = "cancelled";
  if (wasApproved) {
    subscription.endDate = new Date();
  }

  await subscription.save();

  res.json({
    success: true,
    message: wasApproved ? "Active subscription cancelled" : "Subscription request withdrawn",
    data: subscription,
  });
});

// ------------------------------
// 📌 @desc Get the current active plan for client (subscription or default)
// @route GET /api/v1/subscriptions/my/current
// @access Private (Client)
// ------------------------------
export const getMyCurrentPlan = asyncHandler(async (req, res) => {
  const now = new Date();

  await Subscription.updateMany(
    {
      clientId: req.user._id,
      status: "approved",
      endDate: { $lt: now },
    },
    { $set: { status: "expired" } }
  );

  const activeSubscription = await Subscription.findOne({
    clientId: req.user._id,
    status: "approved",
    endDate: { $gte: now },
  })
    .sort({ endDate: -1 })
    .populate("planId", "title description durationWeeks price goal isDefault")
    .populate("coachId", "fullName email phone");

  if (activeSubscription) {
    return res.json({
      success: true,
      data: {
        type: "subscription",
        subscription: activeSubscription,
      },
    });
  }

  const client = await User.findById(req.user._id).select("coachId");
  if (!client?.coachId) {
    return res.json({ success: true, data: null });
  }

  const defaultPlan = await Plan.findOne({
    coachId: client.coachId,
    isTemplate: true,
    isDefault: true,
  })
    .sort({ createdAt: 1 })
    .lean();

  if (defaultPlan) {
    return res.json({
      success: true,
      data: {
        type: "default",
        plan: defaultPlan,
      },
    });
  }

  const fallbackPlan = await Plan.findOne({
    coachId: client.coachId,
    isTemplate: true,
  })
    .sort({ createdAt: 1 })
    .lean();

  res.json({
    success: true,
    data: fallbackPlan
      ? {
          type: "default",
          plan: fallbackPlan,
        }
      : null,
  });
});