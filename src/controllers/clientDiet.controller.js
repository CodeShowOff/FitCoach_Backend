// src/controllers/clientDiet.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import ClientDietLog from "../models/ClientDietLog.js";
import CoachDietPlan from "../models/CoachDietPlan.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const mealTypeEnum = [
  "breakfast",
  "mid_morning_snack",
  "lunch",
  "afternoon_snack",
  "evening_snack",
  "dinner",
  "pre_workout",
  "post_workout",
  "bedtime_snack",
];

const loggedFoodSchema = Joi.object({
  foodItemId: Joi.string().optional().allow(null),
  foodName: Joi.string().max(150).required(),
  quantity: Joi.number().min(0.1).required(),
  unit: Joi.string().max(50).default("g"),
  calories: Joi.number().min(0).optional(),
  protein: Joi.number().min(0).optional(),
  carbs: Joi.number().min(0).optional(),
  fat: Joi.number().min(0).optional(),
  isCustom: Joi.boolean().default(false),
});

const loggedMealSchema = Joi.object({
  mealType: Joi.string()
    .valid(...mealTypeEnum)
    .required(),
  name: Joi.string().max(100).optional().allow("", null),
  time: Joi.string().max(20).optional().allow("", null),
  foods: Joi.array().items(loggedFoodSchema).required(),
  photoUrl: Joi.string().uri().optional().allow("", null),
  notes: Joi.string().max(500).optional().allow("", null),
});

const createLogSchema = Joi.object({
  dietPlanId: Joi.string().required(),
  date: Joi.date().required(),
  // Prefer `meals` (matches model + frontend), but accept legacy `mealsLogged` too
  meals: Joi.array().items(loggedMealSchema).optional(),
  mealsLogged: Joi.array().items(loggedMealSchema).optional(),
  waterIntakeLiters: Joi.number().min(0).max(20).optional(),
  supplementsTaken: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().max(100).required(),
        taken: Joi.boolean().default(false),
        notes: Joi.string().max(200).optional().allow("", null),
      })
    )
    .optional(),
  notes: Joi.string().max(1000).optional().allow("", null),
});

const updateLogSchema = Joi.object({
  meals: Joi.array().items(loggedMealSchema).optional(),
  mealsLogged: Joi.array().items(loggedMealSchema).optional(),
  waterIntakeLiters: Joi.number().min(0).max(20).optional(),
  supplementsTaken: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().max(100).required(),
        taken: Joi.boolean().default(false),
        notes: Joi.string().max(200).optional().allow("", null),
      })
    )
    .optional(),
  notes: Joi.string().max(1000).optional().allow("", null),
});

const addMealSchema = Joi.object({
  mealType: Joi.string()
    .valid(...mealTypeEnum)
    .required(),
  name: Joi.string().max(100).optional().allow("", null),
  time: Joi.string().max(20).optional().allow("", null),
  foods: Joi.array().items(loggedFoodSchema).required(),
  photoUrl: Joi.string().uri().optional().allow("", null),
  notes: Joi.string().max(500).optional().allow("", null),
});

function parseTimeStringToDate(timeInput, baseDate) {
  if (timeInput === undefined || timeInput === null) return undefined;
  if (timeInput instanceof Date) return timeInput;

  const raw = String(timeInput).trim();
  if (!raw) return undefined;

  // If client sends an ISO datetime string, allow it.
  // (Avoid trusting Date.parse for time-only strings like "10:09 AM".)
  if (/\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  // Accept: "10:09 AM", "10:09AM", "10 AM", "22:15"
  const match = raw.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?\s*$/);
  if (!match) return undefined;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return undefined;
  if (minutes < 0 || minutes > 59) return undefined;

  if (ampm) {
    if (hours < 1 || hours > 12) return undefined;
    if (ampm === "AM") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else {
    if (hours < 0 || hours > 23) return undefined;
  }

  const d = baseDate ? new Date(baseDate) : new Date();
  if (Number.isNaN(d.getTime())) return undefined;
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function normalizeLoggedMeal(meal, baseDate) {
  if (!meal || typeof meal !== "object") return meal;

  const normalized = { ...meal };
  const parsedTime = parseTimeStringToDate(meal.time, baseDate);
  if (parsedTime) normalized.time = parsedTime;
  else delete normalized.time;

  return normalized;
}

function normalizeLoggedMeals(meals, baseDate) {
  if (!Array.isArray(meals)) return meals;
  return meals.map((m) => normalizeLoggedMeal(m, baseDate));
}

// Helper to calculate daily totals
function calculateDailyTotals(mealsLogged) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  for (const meal of mealsLogged || []) {
    for (const food of meal.foods || []) {
      totals.calories += food.calories || 0;
      totals.protein += food.protein || 0;
      totals.carbs += food.carbs || 0;
      totals.fat += food.fat || 0;
    }
  }

  return totals;
}

// Helper to calculate adherence score
function calculateAdherenceScore(log, dietPlan) {
  if (!dietPlan || !dietPlan.dailyTargets) return 100;

  let score = 0;
  let factors = 0;

  const targets = dietPlan.dailyTargets;
  const actuals =
    log.dailyTotals ||
    calculateDailyTotals(log.meals || log.mealsLogged);

  // Calorie adherence (within 15% tolerance)
  if (targets.calories) {
    const tolerance = targets.calories * 0.15;
    const diff = Math.abs(actuals.calories - targets.calories);
    if (diff <= tolerance) {
      score += 100;
    } else {
      score += Math.max(0, 100 - ((diff - tolerance) / targets.calories) * 100);
    }
    factors++;
  }

  // Protein adherence (within 20% tolerance)
  if (targets.protein) {
    const tolerance = targets.protein * 0.2;
    const diff = Math.abs(actuals.protein - targets.protein);
    if (diff <= tolerance) {
      score += 100;
    } else {
      score += Math.max(0, 100 - ((diff - tolerance) / targets.protein) * 100);
    }
    factors++;
  }

  // Water intake
  if (targets.water && log.waterIntakeLiters) {
    const waterRatio = Math.min(1, log.waterIntakeLiters / targets.water);
    score += waterRatio * 100;
    factors++;
  }

  // Meals logged (at least 80% of planned meals)
  if (dietPlan.mealsPerDay) {
    const mealsRatio = Math.min(
      1,
      ((log.meals?.length || log.mealsLogged?.length || 0) / dietPlan.mealsPerDay)
    );
    score += mealsRatio * 100;
    factors++;
  }

  return factors > 0 ? Math.round(score / factors) : 100;
}

// Helper to get client's active diet plans
async function getClientActiveDietPlans(clientId) {
  // Find active (approved) subscription that hasn't expired
  const now = new Date();
  const subscription = await Subscription.findOne({
    clientId: clientId,
    status: "approved",
    endDate: { $gte: now },
  });

  if (!subscription) return [];

  // Get subscription plan
  const plan = await Plan.findById(subscription.planId).select("dietPlanIds coachId");
  if (!plan || !plan.dietPlanIds || plan.dietPlanIds.length === 0) return [];

  // Get diet plans
  const dietPlans = await CoachDietPlan.find({
    _id: { $in: plan.dietPlanIds },
    isActive: true,
    isDraft: false,
  });

  return dietPlans;
}

// ------------------------------
// 📋 @desc Get client's assigned diet plans
// @route GET /api/v1/client/diet-plans
// @access Private (Client only)
// ------------------------------
export const getClientDietPlans = asyncHandler(async (req, res) => {
  const dietPlans = await getClientActiveDietPlans(req.user._id);

  // Add today's meals to each plan
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const plansWithTodaysMeals = dietPlans.map(plan => {
    const planObj = plan.toObject();
    planObj.todaysMeals = plan.getMealsForDay(dayOfWeek);
    return planObj;
  });

  res.json({
    success: true,
    data: plansWithTodaysMeals,
  });
});

// ------------------------------
// 🔍 @desc Get specific diet plan details
// @route GET /api/v1/client/diet-plans/:id
// @access Private (Client only)
// ------------------------------
export const getClientDietPlanById = asyncHandler(async (req, res) => {
  const dietPlans = await getClientActiveDietPlans(req.user._id);
  const planIds = dietPlans.map((p) => p._id.toString());

  if (!planIds.includes(req.params.id)) {
    res.status(403);
    throw new Error("You don't have access to this diet plan");
  }

  const plan = await CoachDietPlan.findById(req.params.id);

  if (!plan) {
    res.status(404);
    throw new Error("Diet plan not found");
  }

  res.json({
    success: true,
    data: plan,
  });
});

// ------------------------------
// ➕ @desc Log a day's diet
// @route POST /api/v1/client/diet-logs
// @access Private (Client only)
// ------------------------------
export const createDietLog = asyncHandler(async (req, res) => {
  const { error, value } = createLogSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Verify access to diet plan
  const dietPlans = await getClientActiveDietPlans(req.user._id);
  const planIds = dietPlans.map((p) => p._id.toString());

  if (!planIds.includes(value.dietPlanId)) {
    res.status(403);
    throw new Error("You don't have access to this diet plan");
  }

  const dietPlan = dietPlans.find((p) => p._id.toString() === value.dietPlanId);

  // Check if log already exists for this date
  const logDate = new Date(value.date);
  logDate.setHours(0, 0, 0, 0);

  const existingLog = await ClientDietLog.findOne({
    clientId: req.user._id,
    dietPlanId: value.dietPlanId,
    date: logDate,
  });

  if (existingLog) {
    res.status(400);
    throw new Error("A diet log already exists for this date. Please update it instead.");
  }

  const meals = normalizeLoggedMeals(value.meals ?? value.mealsLogged ?? [], logDate);

  // Calculate totals
  const dailyTotals = calculateDailyTotals(meals);

  // Create log
  const log = await ClientDietLog.create({
    clientId: req.user._id,
    coachId: dietPlan.coachId,
    dietPlanId: value.dietPlanId,
    date: logDate,
    meals,
    waterIntakeLiters: value.waterIntakeLiters,
    supplementsTaken: value.supplementsTaken,
    dailyTotals,
    notes: value.notes,
  });

  // Calculate and update adherence score
  log.adherenceScore = calculateAdherenceScore(log, dietPlan);
  await log.save();

  res.status(201).json({
    success: true,
    message: "Diet log created successfully",
    data: log,
  });
});

// ------------------------------
// 📋 @desc Get client's diet logs
// @route GET /api/v1/client/diet-logs
// @access Private (Client only)
// ------------------------------
export const getClientDietLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { dietPlanId, startDate, endDate } = req.query;

  const query = { clientId: req.user._id };

  if (dietPlanId) query.dietPlanId = dietPlanId;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    ClientDietLog.find(query)
      .populate("dietPlanId", "name goal")
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 }),
    ClientDietLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// 🔍 @desc Get diet log by ID
// @route GET /api/v1/client/diet-logs/:id
// @access Private (Client only)
// ------------------------------
export const getDietLogById = asyncHandler(async (req, res) => {
  const log = await ClientDietLog.findOne({
    _id: req.params.id,
    clientId: req.user._id,
  }).populate("dietPlanId", "name goal dailyTargets mealsPerDay");

  if (!log) {
    res.status(404);
    throw new Error("Diet log not found");
  }

  res.json({
    success: true,
    data: log,
  });
});

// ------------------------------
// 🔍 @desc Get diet log by date
// @route GET /api/v1/client/diet-logs/date/:date
// @access Private (Client only)
// ------------------------------
export const getDietLogByDate = asyncHandler(async (req, res) => {
  const logDate = new Date(req.params.date);
  logDate.setHours(0, 0, 0, 0);

  const { dietPlanId } = req.query;

  const query = {
    clientId: req.user._id,
    date: logDate,
  };

  if (dietPlanId) query.dietPlanId = dietPlanId;

  const log = await ClientDietLog.findOne(query).populate(
    "dietPlanId",
    "name goal dailyTargets mealsPerDay meals"
  );

  if (!log) {
    // Return empty log structure for the day
    res.json({
      success: true,
      data: null,
      message: "No diet log found for this date",
    });
    return;
  }

  res.json({
    success: true,
    data: log,
  });
});

// ------------------------------
// ✏️ @desc Update diet log
// @route PATCH /api/v1/client/diet-logs/:id
// @access Private (Client only)
// ------------------------------
export const updateDietLog = asyncHandler(async (req, res) => {
  const { error, value } = updateLogSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const log = await ClientDietLog.findOne({
    _id: req.params.id,
    clientId: req.user._id,
  });

  if (!log) {
    res.status(404);
    throw new Error("Diet log not found");
  }

  // Update fields
  if (value.meals !== undefined) log.meals = normalizeLoggedMeals(value.meals, log.date);
  if (value.mealsLogged !== undefined)
    log.meals = normalizeLoggedMeals(value.mealsLogged, log.date);
  if (value.waterIntakeLiters !== undefined) log.waterIntakeLiters = value.waterIntakeLiters;
  if (value.supplementsTaken !== undefined) log.supplementsTaken = value.supplementsTaken;
  if (value.notes !== undefined) log.notes = value.notes;

  // Recalculate totals
  log.dailyTotals = calculateDailyTotals(log.meals);

  // Recalculate adherence
  const dietPlan = await CoachDietPlan.findById(log.dietPlanId);
  if (dietPlan) {
    log.adherenceScore = calculateAdherenceScore(log, dietPlan);
  }

  await log.save();

  res.json({
    success: true,
    message: "Diet log updated successfully",
    data: log,
  });
});

// ------------------------------
// ➕ @desc Add a meal to existing log
// @route POST /api/v1/client/diet-logs/:id/meals
// @access Private (Client only)
// ------------------------------
export const addMealToLog = asyncHandler(async (req, res) => {
  const { error, value } = addMealSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const log = await ClientDietLog.findOne({
    _id: req.params.id,
    clientId: req.user._id,
  });

  if (!log) {
    res.status(404);
    throw new Error("Diet log not found");
  }

  // Add meal
  if (!Array.isArray(log.meals)) log.meals = [];
  log.meals.push(normalizeLoggedMeal(value, log.date));

  // Recalculate totals
  log.dailyTotals = calculateDailyTotals(log.meals);

  // Recalculate adherence
  const dietPlan = await CoachDietPlan.findById(log.dietPlanId);
  if (dietPlan) {
    log.adherenceScore = calculateAdherenceScore(log, dietPlan);
  }

  await log.save();

  res.json({
    success: true,
    message: "Meal added successfully",
    data: log,
  });
});

// ------------------------------
// 🗑️ @desc Delete diet log
// @route DELETE /api/v1/client/diet-logs/:id
// @access Private (Client only)
// ------------------------------
export const deleteDietLog = asyncHandler(async (req, res) => {
  const log = await ClientDietLog.findOneAndDelete({
    _id: req.params.id,
    clientId: req.user._id,
  });

  if (!log) {
    res.status(404);
    throw new Error("Diet log not found");
  }

  res.json({
    success: true,
    message: "Diet log deleted successfully",
  });
});

// ------------------------------
// 📊 @desc Get diet statistics
// @route GET /api/v1/client/diet-logs/stats/summary
// @access Private (Client only)
// ------------------------------
export const getDietStats = asyncHandler(async (req, res) => {
  const { dietPlanId, days = 7 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  startDate.setHours(0, 0, 0, 0);

  const query = {
    clientId: req.user._id,
    date: { $gte: startDate },
  };

  if (dietPlanId) query.dietPlanId = dietPlanId;

  const logs = await ClientDietLog.find(query).sort({ date: 1 });

  // Calculate averages
  const stats = {
    totalDays: logs.length,
    averageCalories: 0,
    averageProtein: 0,
    averageCarbs: 0,
    averageFat: 0,
    averageWaterIntake: 0,
    averageAdherence: 0,
    dailyBreakdown: [],
  };

  if (logs.length > 0) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalWater = 0;
    let totalAdherence = 0;

    for (const log of logs) {
      totalCalories += log.dailyTotals?.calories || 0;
      totalProtein += log.dailyTotals?.protein || 0;
      totalCarbs += log.dailyTotals?.carbs || 0;
      totalFat += log.dailyTotals?.fat || 0;
      totalWater += log.waterIntakeLiters || 0;
      totalAdherence += log.adherenceScore || 0;

      stats.dailyBreakdown.push({
        date: log.date,
        calories: log.dailyTotals?.calories || 0,
        protein: log.dailyTotals?.protein || 0,
        carbs: log.dailyTotals?.carbs || 0,
        fat: log.dailyTotals?.fat || 0,
        water: log.waterIntakeLiters || 0,
        adherence: log.adherenceScore || 0,
        mealsLogged: log.meals?.length || 0,
      });
    }

    stats.averageCalories = Math.round(totalCalories / logs.length);
    stats.averageProtein = Math.round(totalProtein / logs.length * 10) / 10;
    stats.averageCarbs = Math.round(totalCarbs / logs.length * 10) / 10;
    stats.averageFat = Math.round(totalFat / logs.length * 10) / 10;
    stats.averageWaterIntake = Math.round(totalWater / logs.length * 10) / 10;
    stats.averageAdherence = Math.round(totalAdherence / logs.length);
  }

  res.json({
    success: true,
    data: stats,
  });
});

// =============================================
// COACH VIEW ROUTES
// =============================================

// ------------------------------
// 📋 @desc Get client's diet logs (Coach view)
// @route GET /api/v1/coach/clients/:clientId/diet-logs
// @access Private (Coach only)
// ------------------------------
export const getClientDietLogsForCoach = asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { dietPlanId, startDate, endDate } = req.query;

  // Verify coach has access to this client
  const now = new Date();
  const subscription = await Subscription.findOne({
    clientId: clientId,
    status: "approved",
    endDate: { $gte: now },
  });

  if (!subscription) {
    res.status(404);
    throw new Error("Client subscription not found");
  }

  const plan = await Plan.findById(subscription.planId);
  if (!plan || plan.coachId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You don't have access to this client's data");
  }

  const query = {
    clientId,
    coachId: req.user._id,
  };

  if (dietPlanId) query.dietPlanId = dietPlanId;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    ClientDietLog.find(query)
      .populate("dietPlanId", "name goal")
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 }),
    ClientDietLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// 📊 @desc Get client's diet stats (Coach view)
// @route GET /api/v1/coach/clients/:clientId/diet-stats
// @access Private (Coach only)
// ------------------------------
export const getClientDietStatsForCoach = asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { dietPlanId, days = 7 } = req.query;

  // Verify coach has access
  const now = new Date();
  const subscription = await Subscription.findOne({
    clientId: clientId,
    status: "approved",
    endDate: { $gte: now },
  });

  if (!subscription) {
    res.status(404);
    throw new Error("Client subscription not found");
  }

  const plan = await Plan.findById(subscription.planId);
  if (!plan || plan.coachId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You don't have access to this client's data");
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  startDate.setHours(0, 0, 0, 0);

  const query = {
    clientId,
    coachId: req.user._id,
    date: { $gte: startDate },
  };

  if (dietPlanId) query.dietPlanId = dietPlanId;

  const logs = await ClientDietLog.find(query).sort({ date: 1 });

  // Calculate stats (same logic as getDietStats)
  const stats = {
    totalDays: logs.length,
    averageCalories: 0,
    averageProtein: 0,
    averageCarbs: 0,
    averageFat: 0,
    averageWaterIntake: 0,
    averageAdherence: 0,
    dailyBreakdown: [],
  };

  if (logs.length > 0) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalWater = 0;
    let totalAdherence = 0;

    for (const log of logs) {
      totalCalories += log.dailyTotals?.calories || 0;
      totalProtein += log.dailyTotals?.protein || 0;
      totalCarbs += log.dailyTotals?.carbs || 0;
      totalFat += log.dailyTotals?.fat || 0;
      totalWater += log.waterIntakeLiters || 0;
      totalAdherence += log.adherenceScore || 0;

      stats.dailyBreakdown.push({
        date: log.date,
        calories: log.dailyTotals?.calories || 0,
        protein: log.dailyTotals?.protein || 0,
        carbs: log.dailyTotals?.carbs || 0,
        fat: log.dailyTotals?.fat || 0,
        water: log.waterIntakeLiters || 0,
        adherence: log.adherenceScore || 0,
        mealsLogged: log.meals?.length || 0,
      });
    }

    stats.averageCalories = Math.round(totalCalories / logs.length);
    stats.averageProtein = Math.round(totalProtein / logs.length * 10) / 10;
    stats.averageCarbs = Math.round(totalCarbs / logs.length * 10) / 10;
    stats.averageFat = Math.round(totalFat / logs.length * 10) / 10;
    stats.averageWaterIntake = Math.round(totalWater / logs.length * 10) / 10;
    stats.averageAdherence = Math.round(totalAdherence / logs.length);
  }

  res.json({
    success: true,
    data: stats,
  });
});
