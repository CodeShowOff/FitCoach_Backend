// src/controllers/plans.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import Plan from "../models/Plan.js";
import User from "../models/User.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const createPlanSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).optional().allow("", null),
  goal: Joi.string().max(100).optional().allow("", null),
  price: Joi.number().min(0).optional(),
  durationWeeks: Joi.number().min(1).max(52).default(4),
  startDate: Joi.date().optional(),
  isDefault: Joi.boolean().optional().default(false),
});

const updatePlanSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(1000).optional().allow("", null),
  goal: Joi.string().max(100).optional().allow("", null),
  price: Joi.number().min(0).optional(),
  durationWeeks: Joi.number().min(1).max(52).optional(),
  startDate: Joi.date().optional(),
  status: Joi.string().valid("active", "paused", "completed").optional(),
  isDefault: Joi.boolean().optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid("active", "paused", "completed").required(),
});

// ------------------------------
// 🧾 @desc Create a new plan
// @route POST /api/v1/plans
// @access Private (Coach only)
// ------------------------------
export const createPlan = asyncHandler(async (req, res) => {
  const { error, value } = createPlanSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const {
    title,
    description,
    goal,
    price = 0,
    durationWeeks,
    startDate,
    isDefault,
  } = value;

  const plan = await Plan.create({
    coachId: req.user._id,
    isDefault: Boolean(isDefault),
    title,
    description,
    goal,
    price,
    durationWeeks,
    startDate,
  });

  if (plan.isDefault) {
    await Plan.updateMany(
      {
        _id: { $ne: plan._id },
        coachId: req.user._id,
      },
      { $set: { isDefault: false } }
    );
  }

  res.status(201).json({
    success: true,
    message: "Plan created successfully",
    data: plan,
  });
});

// ------------------------------
// 📋 @desc Get all plans for coach (paginated)
// @route GET /api/v1/plans
// @access Private (Coach only)
// ------------------------------
export const getPlansForCoach = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const filter = { coachId: req.user._id };

  const [plans, total] = await Promise.all([
    Plan.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Plan.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: plans,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 📅 @desc Get plans for a specific client (client view)
// @route GET /api/v1/plans/my
// @access Private (Client only)
// ------------------------------
export const getPlansForClient = asyncHandler(async (req, res) => {
  // Return all subscription plans created by the client's assigned coach
  const client = await User.findById(req.user._id).select("coachId");
  const assignedCoachId = client?.coachId || null;

  if (!assignedCoachId) {
    return res.json({
      success: true,
      data: [],
    });
  }

  const plans = await Plan.find({ 
    coachId: assignedCoachId
  })
    .populate("coachId", "fullName email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: plans,
  });
});

// ------------------------------
// 📄 @desc Get a single plan by id (coach view)
// @route GET /api/v1/plans/:id
// @access Private (Coach only)
// ------------------------------
export const getPlanForCoachById = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, coachId: req.user._id });
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found or access denied");
  }
  res.json({ success: true, data: plan });
});

// ------------------------------
// 📄 @desc Get a single plan by id (client view)
// @route GET /api/v1/plans/view/:id
// @access Private (Client only)
// ------------------------------
export const getPlanForClientById = asyncHandler(async (req, res) => {
  const client = await User.findById(req.user._id).select("coachId");
  const assignedCoachId = client?.coachId || null;

  if (!assignedCoachId) {
    res.status(404);
    throw new Error("You must have an assigned coach to view plans");
  }

  // Allow access to plans from their coach
  const plan = await Plan.findOne({
    _id: req.params.id,
    coachId: assignedCoachId
  }).populate("coachId", "fullName email paymentQrUrl");

  if (!plan) {
    res.status(404);
    throw new Error("Plan not found or access denied");
  }
  res.json({ success: true, data: plan });
});

// ------------------------------
// 🔁 @desc Update plan status (coach only)
// @route PATCH /api/v1/plans/:id/status
// @access Private (Coach only)
// ------------------------------
export const updatePlanStatus = asyncHandler(async (req, res) => {
  const { error, value } = updateStatusSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const plan = await Plan.findOne({ _id: req.params.id, coachId: req.user._id });
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found or access denied");
  }

  plan.status = value.status;
  await plan.save();

  res.json({
    success: true,
    message: `Plan status updated to ${value.status}`,
    data: plan,
  });
});

// ------------------------------
// ✏️ @desc Update plan details (coach only)
// @route PATCH /api/v1/plans/:id
// @access Private (Coach only)
// ------------------------------
export const updatePlan = asyncHandler(async (req, res) => {
  const { error, value } = updatePlanSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const plan = await Plan.findOne({ _id: req.params.id, coachId: req.user._id });
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found or access denied");
  }

  // Only allow coach to update allowed fields
  const updatable = [
    "title",
    "description",
    "goal",
    "price",
    "durationWeeks",
    "startDate",
    "status",
    "isDefault",
  ];
  updatable.forEach((k) => {
    if (value[k] !== undefined) plan[k] = value[k];
  });

  if (value.isDefault !== undefined && value.isDefault) {
    await Plan.updateMany(
      {
        _id: { $ne: plan._id },
        coachId: req.user._id,
      },
      { $set: { isDefault: false } }
    );
  }

  await plan.save();

  res.json({
    success: true,
    message: "Plan updated",
    data: plan,
  });
});

// ------------------------------
// 🗑️ @desc Delete a plan (coach only)
// @route DELETE /api/v1/plans/:id
// @access Private (Coach only)
// ------------------------------
export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, coachId: req.user._id });
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found or access denied");
  }

  await plan.deleteOne();

  res.json({
    success: true,
    message: "Plan deleted",
  });
});
