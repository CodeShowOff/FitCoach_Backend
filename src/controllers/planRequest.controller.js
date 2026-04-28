// src/controllers/planRequest.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import PlanRequest from "../models/PlanRequest.js";
import Plan from "../models/Plan.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import { createNotification } from "./notifications.controller.js";
import { onSubscriptionApproved, onSubscriptionEnded } from "../services/chat.service.js";

const createRequestSchema = Joi.object({
  planId: Joi.string().required(),
  notes: Joi.string().max(500).optional().allow("", null),
  paymentMode: Joi.string().valid("cash", "manual_qr", "other").optional(),
  paymentProofUrl: Joi.string().uri().optional().allow("", null),
});

// Client creates a plan request
export const createPlanRequest = asyncHandler(async (req, res) => {
  const { error, value } = createRequestSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }
  const { planId, notes, paymentMode, paymentProofUrl } = value;

  const plan = await Plan.findById(planId).populate("coachId");
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  // Verify client is assigned to this coach
  const client = await User.findById(req.user._id).select("coachId");
  if (!client?.coachId || client.coachId.toString() !== plan.coachId._id.toString()) {
    res.status(403);
    throw new Error("You can only request plans from your coach");
  }

  if (plan.isDefault) {
    res.status(400);
    throw new Error("Default plan does not require request");
  }

  // Prevent duplicate active/pending request for same plan
  const existing = await PlanRequest.findOne({
    clientId: req.user._id,
    planId,
    status: "pending",
  });
  if (existing) {
    res.status(400);
    throw new Error("You already have a pending request for this plan");
  }

  const requestDoc = await PlanRequest.create({
    clientId: req.user._id,
    coachId: plan.coachId._id,
    planId,
    notes: notes || null,
    paymentMode: paymentMode || "manual_qr",
    paymentProofUrl: paymentProofUrl || null,
  });

  // Notify coach about pending plan approval
  createNotification({
    recipientId: plan.coachId._id,
    senderId: req.user._id,
    title: "Plan Request",
    message: `${req.user.fullName || "A client"} requested plan "${plan.title}"`,
    type: "plan",
    meta: { planId, requestId: requestDoc._id },
  });

  res.status(201).json({ success: true, message: "Plan request submitted", data: requestDoc });
});

// Client view own requests
export const getMyPlanRequests = asyncHandler(async (req, res) => {
  const requests = await PlanRequest.find({ clientId: req.user._id })
    .populate("planId", "title price durationWeeks")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: requests });
});

// Coach view pending requests
export const getCoachPendingPlanRequests = asyncHandler(async (req, res) => {
  const requests = await PlanRequest.find({ coachId: req.user._id, status: "pending" })
    .populate("clientId", "fullName email")
    .populate("planId", "title price durationWeeks")
    .sort({ createdAt: 1 });
  res.json({ success: true, data: requests });
});

// Approve request -> create subscription (if not exists)
export const approvePlanRequest = asyncHandler(async (req, res) => {
  const request = await PlanRequest.findOne({ _id: req.params.id, coachId: req.user._id });
  if (!request) {
    res.status(404);
    throw new Error("Request not found");
  }
  if (request.status !== "pending") {
    res.status(400);
    throw new Error("Only pending requests can be approved");
  }
  const plan = await Plan.findById(request.planId);
  if (!plan) {
    res.status(404);
    throw new Error("Plan removed");
  }

  // Create subscription if none active/pending
  const existingSub = await Subscription.findOne({
    clientId: request.clientId,
    planId: request.planId,
    status: { $in: ["pending", "approved"] },
  });
  let subscription = existingSub;
  const approvedStartDate = new Date();
  const durationWeeks =
    typeof existingSub?.durationWeeks === "number"
      ? existingSub.durationWeeks
      : plan.durationWeeks || 4;
  const approvedEndDate = new Date(approvedStartDate);
  approvedEndDate.setDate(approvedEndDate.getDate() + durationWeeks * 7);
  if (!subscription) {
    subscription = await Subscription.create({
      clientId: request.clientId,
      coachId: request.coachId,
      planId: request.planId,
      amount: typeof plan.price === "number" ? plan.price : 0,
      durationWeeks: plan.durationWeeks || durationWeeks,
      planTitle: plan.title,
      paymentMode: request.paymentMode || "manual_qr",
      paymentProofUrl: request.paymentProofUrl || null,
      status: "approved", // directly approved via coach action
      startDate: approvedStartDate,
      endDate: approvedEndDate,
    });
  } else {
    subscription.status = "approved";
    subscription.startDate = approvedStartDate;
    subscription.endDate = approvedEndDate;
    subscription.planTitle = plan.title;
    if (!subscription.durationWeeks && plan.durationWeeks) {
      subscription.durationWeeks = plan.durationWeeks;
    }
    await subscription.save();
  }

  // Ensure only one active subscription overlaps: expire others
  const effectiveStart = subscription.startDate || new Date();
  const expiredSubs = await Subscription.find({
    _id: { $ne: subscription._id },
    clientId: request.clientId,
    status: "approved",
    endDate: { $gte: effectiveStart },
  });

  await Subscription.updateMany(
    {
      _id: { $ne: subscription._id },
      clientId: request.clientId,
      status: "approved",
      endDate: { $gte: effectiveStart },
    },
    { $set: { status: "expired" } }
  );

  // Remove client from expired plan groups
  for (const expiredSub of expiredSubs) {
    onSubscriptionEnded({
      clientId: expiredSub.clientId,
      planId: expiredSub.planId,
    }).catch((err) => console.error("Failed to remove from plan group:", err));
  }

  request.status = "approved";
  request.approvedAt = new Date();
  await request.save();

  // Add client to newly approved plan group
  onSubscriptionApproved({
    clientId: subscription.clientId,
    coachId: subscription.coachId,
    planId: subscription.planId,
    planTitle: subscription.planTitle,
  }).catch((err) => console.error("Failed to add to plan group:", err));

  // Notify client on approval
  createNotification({
    recipientId: request.clientId,
    senderId: req.user._id,
    title: "Plan Approved",
    message: `Your plan request has been approved`,
    type: "plan",
    meta: { requestId: request._id, subscriptionId: subscription._id },
  });

  res.json({ success: true, message: "Request approved", data: { request, subscription } });
});

// Decline request
export const declinePlanRequest = asyncHandler(async (req, res) => {
  const request = await PlanRequest.findOne({ _id: req.params.id, coachId: req.user._id });
  if (!request) {
    res.status(404);
    throw new Error("Request not found");
  }
  if (request.status !== "pending") {
    res.status(400);
    throw new Error("Only pending requests can be declined");
  }
  request.status = "declined";
  request.declinedAt = new Date();
  await request.save();
  // Notify client on decline
  createNotification({
    recipientId: request.clientId,
    senderId: req.user._id,
    title: "Plan Declined",
    message: `Your plan request has been declined`,
    type: "plan",
    meta: { requestId: request._id },
  });
  res.json({ success: true, message: "Request declined", data: request });
});

// Coach view requests for a specific client (pending only + history)
export const getClientPlanRequestsForCoach = asyncHandler(async (req, res) => {
  const clientId = req.params.clientId;
  const requests = await PlanRequest.find({ coachId: req.user._id, clientId })
    .populate("planId", "title price durationWeeks")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: requests });
});
