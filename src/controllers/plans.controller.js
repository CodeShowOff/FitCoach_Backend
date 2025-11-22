// src/controllers/plans.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import Plan from "../models/Plan.js";
import User from "../models/User.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const createPlanSchema = Joi.object({
  clientId: Joi.string().allow(null, "").optional(), // null => template plan
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).optional().allow("", null),
  goal: Joi.string().max(100).optional().allow("", null),
  price: Joi.number().min(0).optional(),
  durationWeeks: Joi.number().min(1).max(52).default(4),
  startDate: Joi.date().optional(),
  tasks: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().required().max(100),
        description: Joi.string().max(500).optional().allow("", null),
        date: Joi.date().optional(),
      })
    )
    .default([]),
  isTemplate: Joi.boolean().optional().default(false),
  isDefault: Joi.boolean().optional().default(false),
});

const updatePlanSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(1000).optional().allow("", null),
  goal: Joi.string().max(100).optional().allow("", null),
  price: Joi.number().min(0).optional(),
  durationWeeks: Joi.number().min(1).max(52).optional(),
  startDate: Joi.date().optional(),
  tasks: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().required().max(100),
        description: Joi.string().max(500).optional().allow("", null),
        date: Joi.date().optional(),
        completedByClient: Joi.boolean().optional(),
      })
    )
    .optional(),
  status: Joi.string().valid("active", "paused", "completed").optional(),
  isDefault: Joi.boolean().optional(),
  isTemplate: Joi.boolean().optional(),
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
    clientId,
    title,
    description,
    goal,
    price = 0,
    durationWeeks,
    startDate,
    tasks,
    isTemplate,
    isDefault,
  } = value;

  // If clientId is provided (non-empty), verify client exists and is assigned to this coach
  let client = null;
  if (clientId) {
    client = await User.findOne({ _id: clientId, role: "client", coachId: req.user._id });
    if (!client) {
      res.status(404);
      throw new Error("Client not found or not assigned to this coach");
    }
  }

  if (isDefault && client) {
    res.status(400);
    throw new Error("Default plans cannot be assigned directly to a client");
  }

  const templateFlag = !client ? Boolean(isTemplate ?? true) : false;
  const defaultFlag = templateFlag && Boolean(isDefault);

  const plan = await Plan.create({
    coachId: req.user._id,
    clientId: client ? client._id : null,
    isTemplate: templateFlag,
    isDefault: defaultFlag,
    title,
    description,
    goal,
    price,
    durationWeeks,
    startDate,
    tasks,
  });

  if (plan.isDefault) {
    await Plan.updateMany(
      {
        _id: { $ne: plan._id },
        coachId: req.user._id,
        isTemplate: true,
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
      .populate("clientId", "fullName email")
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
  // Return plans that are either assigned to this client OR template plans created by the client's assigned coach
  const client = await User.findById(req.user._id).select("coachId");
  const assignedCoachId = client?.coachId || null;

  const clientFilter = [
    { clientId: req.user._id }, // specific plans
  ];
  if (assignedCoachId) {
    // templates from the assigned coach
    clientFilter.push({ coachId: assignedCoachId, isTemplate: true });
  }

  const plans = await Plan.find({ $or: clientFilter })
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
  const plan = await Plan.findOne({ _id: req.params.id, coachId: req.user._id }).populate(
    "clientId",
    "fullName email"
  );
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

  // Allow access to plans assigned to client OR template plans from their coach
  const plan = await Plan.findOne({
    _id: req.params.id,
    $or: [
      { clientId: req.user._id },
      assignedCoachId ? { coachId: assignedCoachId, isTemplate: true } : null,
    ].filter(Boolean),
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
    "tasks",
    "status",
    "isTemplate",
    "isDefault",
  ];
  updatable.forEach((k) => {
    if (value[k] !== undefined) plan[k] = value[k];
  });

  if (value.isDefault !== undefined) {
    if (value.isDefault && plan.clientId) {
      res.status(400);
      throw new Error("Default plans must be template plans without a client");
    }

    plan.isTemplate = value.isDefault ? true : plan.isTemplate;

    if (value.isDefault) {
      await Plan.updateMany(
        {
          _id: { $ne: plan._id },
          coachId: req.user._id,
          isTemplate: true,
        },
        { $set: { isDefault: false } }
      );
    }
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

// ------------------------------
// ✅ @desc Mark a task as completed (client only)
// @route PATCH /api/v1/plans/:planId/tasks/:taskIndex
// @access Private (Client only)
// ------------------------------
export const markTaskCompleted = asyncHandler(async (req, res) => {
  const { planId, taskIndex } = req.params;

  // Find client and assigned coach
  const client = await User.findById(req.user._id).select("coachId");
  const assignedCoachId = client?.coachId || null;

  // Allow marking tasks on plans assigned to client or coach's template plans
  const plan = await Plan.findOne({
    _id: planId,
    $or: [
      { clientId: req.user._id },
      assignedCoachId ? { coachId: assignedCoachId, isTemplate: true } : null
    ].filter(Boolean)
  });
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found or access denied");
  }

  const index = parseInt(taskIndex);
  if (index < 0 || index >= plan.tasks.length) {
    res.status(400);
    throw new Error("Invalid task index");
  }

  plan.tasks[index].completedByClient = true;
  await plan.save();

  res.json({
    success: true,
    message: `Task ${index + 1} marked as completed`,
    data: plan.tasks[index],
  });
});
