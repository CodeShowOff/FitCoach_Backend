// src/controllers/dietTemplate.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import DietTemplate from "../models/DietTemplate.js";
import FoodItem from "../models/FoodItem.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const goalEnum = [
  "weight_loss",
  "muscle_gain",
  "maintenance",
  "clean_eating",
  "keto",
  "vegetarian",
  "vegan",
  "high_protein",
  "low_carb",
  "balanced",
  "bulking",
  "cutting",
  "general_health",
];

const dietaryTypeEnum = [
  "any",
  "vegetarian",
  "vegan",
  "pescatarian",
  "keto",
  "paleo",
  "halal",
  "kosher",
];

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

const difficultyEnum = ["easy", "moderate", "challenging"];

const foodInMealSchema = Joi.object({
  foodItemId: Joi.string().required(),
  quantity: Joi.number().min(0.1).required(),
  unit: Joi.string().max(50).default("g"),
  notes: Joi.string().max(200).optional().allow("", null),
});

const mealSchema = Joi.object({
  mealType: Joi.string()
    .valid(...mealTypeEnum)
    .required(),
  name: Joi.string().max(100).optional().allow("", null),
  time: Joi.string().max(20).optional().allow("", null),
  foods: Joi.array().items(foodInMealSchema).optional(),
  alternatives: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().max(500).optional().allow("", null),
});

const dietDaySchema = Joi.object({
  dayOfWeek: Joi.number().min(0).max(6).optional(),
  dayNumber: Joi.number().min(1).max(7).optional(),
  dayName: Joi.string().max(100).optional().allow("", null),
  meals: Joi.array().items(mealSchema).optional(),
  notes: Joi.string().max(500).optional().allow("", null),
});

const dailyTargetsSchema = Joi.object({
  calories: Joi.number().min(500).max(10000).optional(),
  protein: Joi.number().min(0).max(500).optional(),
  carbohydrates: Joi.number().min(0).max(1000).optional(),
  fat: Joi.number().min(0).max(500).optional(),
  fiber: Joi.number().min(0).max(100).optional(),
  water: Joi.number().min(0).max(10).optional(),
});

const createTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(2000).optional().allow("", null),
  goal: Joi.string()
    .valid(...goalEnum)
    .required(),
  dailyTargets: dailyTargetsSchema.optional(),
  mealsPerDay: Joi.number().min(1).max(8).default(4),
  sampleMeals: Joi.array().items(mealSchema).optional(),
  weeklySchedule: Joi.array().items(dietDaySchema).optional(),
  daysPerWeek: Joi.number().min(1).max(7).default(7),
  dietaryType: Joi.string()
    .valid(...dietaryTypeEnum)
    .default("any"),
  foodsToAvoid: Joi.array().items(Joi.string().max(100)).optional(),
  guidelines: Joi.array().items(Joi.string().max(500)).optional(),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  difficulty: Joi.string()
    .valid(...difficultyEnum)
    .default("moderate"),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  description: Joi.string().max(2000).optional().allow("", null),
  goal: Joi.string()
    .valid(...goalEnum)
    .optional(),
  dailyTargets: dailyTargetsSchema.optional(),
  mealsPerDay: Joi.number().min(1).max(8).optional(),
  sampleMeals: Joi.array().items(mealSchema).optional(),
  weeklySchedule: Joi.array().items(dietDaySchema).optional(),
  daysPerWeek: Joi.number().min(1).max(7).optional(),
  dietaryType: Joi.string()
    .valid(...dietaryTypeEnum)
    .optional(),
  foodsToAvoid: Joi.array().items(Joi.string().max(100)).optional(),
  recommendedFoods: Joi.array().items(Joi.string()).optional(),
  guidelines: Joi.array().items(Joi.string().max(500)).optional(),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  difficulty: Joi.string()
    .valid(...difficultyEnum)
    .optional(),
  isActive: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
});

// Helper to validate food items exist
async function validateFoodItems(sampleMeals) {
  const foodIds = new Set();

  for (const meal of sampleMeals || []) {
    for (const food of meal.foods || []) {
      foodIds.add(food.foodItemId);
    }
    for (const altId of meal.alternatives || []) {
      foodIds.add(altId);
    }
  }

  if (foodIds.size === 0) return;

  const existingFoods = await FoodItem.find({
    _id: { $in: Array.from(foodIds) },
    isActive: true,
  }).select("_id");

  const existingIds = new Set(existingFoods.map((f) => f._id.toString()));
  const missingIds = Array.from(foodIds).filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    throw new Error(`Invalid food item IDs: ${missingIds.join(", ")}`);
  }
}

// ------------------------------
// ➕ @desc Create a new diet template
// @route POST /api/v1/diet-templates
// @access Private (Admin only)
// ------------------------------
export const createDietTemplate = asyncHandler(async (req, res) => {
  const { error, value } = createTemplateSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Validate food items
  try {
    await validateFoodItems(value.sampleMeals, value.weeklySchedule);
  } catch (err) {
    res.status(400);
    throw err;
  }

  const template = await DietTemplate.create({
    ...value,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Diet template created successfully",
    data: template,
  });
});

// ------------------------------
// 📋 @desc Get all diet templates
// @route GET /api/v1/diet-templates
// @access Private (Admin, Coach)
// ------------------------------
export const getDietTemplates = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { search, goal, dietaryType, isFeatured, isActive } = req.query;

  const query = {};

  if (req.user?.role !== "admin") {
    query.isActive = true;
  } else if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  if (goal) query.goal = goal;
  if (dietaryType) query.dietaryType = dietaryType;
  if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query.$or = [
      { name: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
      { tags: { $regex: term, $options: "i" } },
    ];
  }

  const [templates, total] = await Promise.all([
    DietTemplate.find(query)
      .select("-sampleMeals -weeklySchedule")
      .skip(skip)
      .limit(limit)
      .sort({ isFeatured: -1, usageCount: -1, createdAt: -1 }),
    DietTemplate.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: templates,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// 🔍 @desc Get diet template by ID
// @route GET /api/v1/diet-templates/:id
// @access Private (Admin, Coach)
// ------------------------------
export const getDietTemplateById = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (req.user?.role !== "admin") {
    query.isActive = true;
  }

  const template = await DietTemplate.findOne(query)
    .populate("weeklySchedule.meals.foods.foodItemId", "name nutrition servingSize servingUnit category")
    .populate("weeklySchedule.meals.alternatives", "name nutrition servingSize servingUnit category")
    .populate("sampleMeals.foods.foodItemId", "name nutrition servingSize servingUnit")
    .populate("sampleMeals.alternatives", "name nutrition servingSize servingUnit")
    .populate("recommendedFoods", "name nutrition servingSize servingUnit");

  if (!template) {
    res.status(404);
    throw new Error("Diet template not found");
  }

  res.json({
    success: true,
    data: template,
  });
});

// ------------------------------
// ✏️ @desc Update diet template
// @route PATCH /api/v1/diet-templates/:id
// @access Private (Admin only)
// ------------------------------
export const updateDietTemplate = asyncHandler(async (req, res) => {
  const { error, value } = updateTemplateSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Validate food items if sampleMeals or weeklySchedule is being updated
  if (value.sampleMeals || value.weeklySchedule) {
    try {
      await validateFoodItems(value.sampleMeals, value.weeklySchedule);
    } catch (err) {
      res.status(400);
      throw err;
    }
  }

  const template = await DietTemplate.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true,
  });

  if (!template) {
    res.status(404);
    throw new Error("Diet template not found");
  }

  res.json({
    success: true,
    message: "Diet template updated successfully",
    data: template,
  });
});

// ------------------------------
// 🗑️ @desc Delete diet template (soft delete)
// @route DELETE /api/v1/diet-templates/:id
// @access Private (Admin only)
// ------------------------------
export const deleteDietTemplate = asyncHandler(async (req, res) => {
  const template = await DietTemplate.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!template) {
    res.status(404);
    throw new Error("Diet template not found");
  }

  res.json({
    success: true,
    message: "Diet template deleted successfully",
  });
});

// ------------------------------
// 📊 @desc Get diet template metadata
// @route GET /api/v1/diet-templates/metadata
// @access Private (Admin, Coach)
// ------------------------------
export const getDietTemplateMetadata = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      goals: goalEnum,
      dietaryTypes: dietaryTypeEnum,
      mealTypes: mealTypeEnum,
      difficulties: difficultyEnum,
    },
  });
});
