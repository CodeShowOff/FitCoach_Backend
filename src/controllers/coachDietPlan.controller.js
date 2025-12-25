// src/controllers/coachDietPlan.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import CoachDietPlan from "../models/CoachDietPlan.js";
import DietTemplate from "../models/DietTemplate.js";
import FoodItem from "../models/FoodItem.js";
import Plan from "../models/Plan.js";

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
  "custom",
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

const foodSchema = Joi.object({
  foodItemId: Joi.string().optional(),
  foodName: Joi.string().max(150).optional(),
  quantity: Joi.number().min(0.1).required(),
  unit: Joi.string().max(50).default("g"),
  calories: Joi.number().min(0).optional(),
  protein: Joi.number().min(0).optional(),
  carbs: Joi.number().min(0).optional(),
  fat: Joi.number().min(0).optional(),
  notes: Joi.string().max(200).optional().allow("", null),
});

const mealSchema = Joi.object({
  mealType: Joi.string()
    .valid(...mealTypeEnum)
    .required(),
  name: Joi.string().max(100).optional().allow("", null),
  time: Joi.string().max(20).optional().allow("", null),
  foods: Joi.array().items(foodSchema).optional(),
  alternatives: Joi.array()
    .items(
      Joi.object({
        foodItemId: Joi.string().optional(),
        foodName: Joi.string().max(150).optional(),
      })
    )
    .optional(),
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

const supplementSchema = Joi.object({
  name: Joi.string().max(100).required(),
  dosage: Joi.string().max(100).optional().allow("", null),
  timing: Joi.string().max(100).optional().allow("", null),
  notes: Joi.string().max(300).optional().allow("", null),
});

const createPlanSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(2000).optional().allow("", null),
  goal: Joi.string()
    .valid(...goalEnum)
    .default("custom"),
  subscriptionPlanIds: Joi.array().items(Joi.string()).optional(),
  dailyTargets: dailyTargetsSchema.optional(),
  mealsPerDay: Joi.number().min(1).max(8).default(4),
  daysPerWeek: Joi.number().min(1).max(7).default(7),
  meals: Joi.array().items(mealSchema).optional(),
  weeklySchedule: Joi.array().items(dietDaySchema).optional(),
  dietaryType: Joi.string()
    .valid(...dietaryTypeEnum)
    .default("any"),
  dietaryRestrictions: Joi.array().items(Joi.string().max(100)).optional(),
  allergyNotes: Joi.string().max(500).optional().allow("", null),
  foodsToAvoid: Joi.array().items(Joi.string().max(100)).optional(),
  customInstructions: Joi.string().max(2000).optional().allow("", null),
  supplements: Joi.array().items(supplementSchema).optional(),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().default(true),
  isDraft: Joi.boolean().default(false),
});

const updatePlanSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  description: Joi.string().max(2000).optional().allow("", null),
  goal: Joi.string()
    .valid(...goalEnum)
    .optional(),
  subscriptionPlanIds: Joi.array().items(Joi.string()).optional(),
  dailyTargets: dailyTargetsSchema.optional(),
  mealsPerDay: Joi.number().min(1).max(8).optional(),
  daysPerWeek: Joi.number().min(1).max(7).optional(),
  meals: Joi.array().items(mealSchema).optional(),
  weeklySchedule: Joi.array().items(dietDaySchema).optional(),
  dietaryType: Joi.string()
    .valid(...dietaryTypeEnum)
    .optional(),
  dietaryRestrictions: Joi.array().items(Joi.string().max(100)).optional(),
  allergyNotes: Joi.string().max(500).optional().allow("", null),
  foodsToAvoid: Joi.array().items(Joi.string().max(100)).optional(),
  customInstructions: Joi.string().max(2000).optional().allow("", null),
  supplements: Joi.array().items(supplementSchema).optional(),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().optional(),
  isDraft: Joi.boolean().optional(),
});

// Helper to validate and enrich food items
async function validateAndEnrichFoods(meals) {
  const foodIds = new Set();

  for (const meal of meals || []) {
    for (const food of meal.foods || []) {
      if (food.foodItemId) foodIds.add(food.foodItemId);
    }
    for (const alt of meal.alternatives || []) {
      if (alt.foodItemId) foodIds.add(alt.foodItemId);
    }
  }

  if (foodIds.size === 0) return meals;

  const foods = await FoodItem.find({
    _id: { $in: Array.from(foodIds) },
    isActive: true,
  }).select("_id name nutrition servingSize servingUnit");

  const foodMap = new Map();
  foods.forEach((f) => {
    foodMap.set(f._id.toString(), f);
  });

  // Enrich and calculate nutrition
  for (const meal of meals || []) {
    for (const food of meal.foods || []) {
      if (food.foodItemId) {
        const foodData = foodMap.get(food.foodItemId);
        if (foodData) {
          food.foodName = foodData.name;

          // Calculate nutrition based on quantity
          const ratio = food.quantity / (foodData.servingSize || 100);
          if (foodData.nutrition) {
            food.calories = Math.round((foodData.nutrition.calories || 0) * ratio);
            food.protein = Math.round((foodData.nutrition.protein || 0) * ratio * 10) / 10;
            food.carbs = Math.round((foodData.nutrition.carbohydrates || 0) * ratio * 10) / 10;
            food.fat = Math.round((foodData.nutrition.fat || 0) * ratio * 10) / 10;
          }
        }
      }
    }

    for (const alt of meal.alternatives || []) {
      if (alt.foodItemId) {
        const foodData = foodMap.get(alt.foodItemId);
        if (foodData) {
          alt.foodName = foodData.name;
        }
      }
    }
  }

  return meals;
}

// Helper to validate subscription plans
async function validateSubscriptionPlans(planIds, coachId) {
  if (!planIds || planIds.length === 0) return;

  const plans = await Plan.find({
    _id: { $in: planIds },
    coachId,
  }).select("_id");

  const foundIds = new Set(plans.map((p) => p._id.toString()));
  const invalidIds = planIds.filter((id) => !foundIds.has(id));

  if (invalidIds.length > 0) {
    throw new Error(`Invalid or unauthorized subscription plan IDs: ${invalidIds.join(", ")}`);
  }
}

// ------------------------------
// ➕ @desc Create a new diet plan
// @route POST /api/v1/coach/diet-plans
// @access Private (Coach only)
// ------------------------------
export const createCoachDietPlan = asyncHandler(async (req, res) => {
  const { error, value } = createPlanSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Validate subscription plans
  if (value.subscriptionPlanIds && value.subscriptionPlanIds.length > 0) {
    await validateSubscriptionPlans(value.subscriptionPlanIds, req.user._id);
  }

  // Enrich foods with nutrition data
  if (value.meals && value.meals.length > 0) {
    value.meals = await validateAndEnrichFoods(value.meals);
  }

  // Enrich foods in weekly schedule
  if (value.weeklySchedule && value.weeklySchedule.length > 0) {
    for (const day of value.weeklySchedule) {
      if (day.meals && day.meals.length > 0) {
        day.meals = await validateAndEnrichFoods(day.meals);
      }
    }
  }

  const plan = await CoachDietPlan.create({
    ...value,
    coachId: req.user._id,
  });

  // Update linked subscription plans
  if (value.subscriptionPlanIds && value.subscriptionPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: value.subscriptionPlanIds } },
      {
        $addToSet: { dietPlanIds: plan._id },
        $set: { "features.hasDietPlan": true },
      }
    );
  }

  res.status(201).json({
    success: true,
    message: "Diet plan created successfully",
    data: plan,
  });
});

// ------------------------------
// 📋 @desc Get all diet plans for coach
// @route GET /api/v1/coach/diet-plans
// @access Private (Coach only)
// ------------------------------
export const getCoachDietPlans = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { search, goal, isActive, isDraft } = req.query;

  const query = { coachId: req.user._id };

  // Only show active plans by default (exclude soft-deleted plans)
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  } else {
    query.isActive = true; // Default to only active plans
  }
  if (isDraft !== undefined) query.isDraft = isDraft === "true";
  if (goal) query.goal = goal;

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query.$or = [
      { name: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
    ];
  }

  const [plans, total] = await Promise.all([
    CoachDietPlan.find(query)
      .select("-meals")
      .populate("subscriptionPlanIds", "title")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    CoachDietPlan.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: plans,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// 🔍 @desc Get diet plan by ID
// @route GET /api/v1/coach/diet-plans/:id
// @access Private (Coach only)
// ------------------------------
export const getCoachDietPlanById = asyncHandler(async (req, res) => {
  const plan = await CoachDietPlan.findOne({
    _id: req.params.id,
    coachId: req.user._id,
  })
    .populate("subscriptionPlanIds", "title price durationWeeks")
    .populate({
      path: "weeklySchedule.meals.foods.foodItemId",
      select: "name nutrition servingSize servingUnit category",
    })
    .populate({
      path: "weeklySchedule.meals.alternatives",
      select: "name nutrition servingSize servingUnit category",
    })
    .populate({
      path: "meals.foods.foodItemId",
      select: "name nutrition servingSize servingUnit category",
    })
    .populate({
      path: "meals.alternatives",
      select: "name nutrition servingSize servingUnit category",
    });

  if (!plan) {
    res.status(404);
    throw new Error("Diet plan not found or access denied");
  }

  res.json({
    success: true,
    data: plan,
  });
});

// ------------------------------
// ✏️ @desc Update diet plan
// @route PATCH /api/v1/coach/diet-plans/:id
// @access Private (Coach only)
// ------------------------------
export const updateCoachDietPlan = asyncHandler(async (req, res) => {
  const { error, value } = updatePlanSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const existingPlan = await CoachDietPlan.findOne({
    _id: req.params.id,
    coachId: req.user._id,
  });

  if (!existingPlan) {
    res.status(404);
    throw new Error("Diet plan not found or access denied");
  }

  // Validate subscription plans
  if (value.subscriptionPlanIds && value.subscriptionPlanIds.length > 0) {
    await validateSubscriptionPlans(value.subscriptionPlanIds, req.user._id);
  }

  // Enrich foods
  if (value.meals && value.meals.length > 0) {
    value.meals = await validateAndEnrichFoods(value.meals);
  }

  // Enrich foods in weekly schedule
  if (value.weeklySchedule && value.weeklySchedule.length > 0) {
    for (const day of value.weeklySchedule) {
      if (day.meals && day.meals.length > 0) {
        day.meals = await validateAndEnrichFoods(day.meals);
      }
    }
  }

  // Handle subscription plan updates
  const oldPlanIds = existingPlan.subscriptionPlanIds.map((id) => id.toString());
  const newPlanIds = value.subscriptionPlanIds || oldPlanIds;

  // Remove from old plans
  const removedPlanIds = oldPlanIds.filter((id) => !newPlanIds.includes(id));
  if (removedPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: removedPlanIds } },
      { $pull: { dietPlanIds: existingPlan._id } }
    );

    for (const planId of removedPlanIds) {
      const plan = await Plan.findById(planId);
      if (plan && plan.dietPlanIds.length === 0) {
        plan.features.hasDietPlan = false;
        await plan.save();
      }
    }
  }

  // Add to new plans
  const addedPlanIds = newPlanIds.filter((id) => !oldPlanIds.includes(id));
  if (addedPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: addedPlanIds } },
      {
        $addToSet: { dietPlanIds: existingPlan._id },
        $set: { "features.hasDietPlan": true },
      }
    );
  }

  const plan = await CoachDietPlan.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: "Diet plan updated successfully",
    data: plan,
  });
});

// ------------------------------
// 🗑️ @desc Delete diet plan (soft delete)
// @route DELETE /api/v1/coach/diet-plans/:id
// @access Private (Coach only)
// ------------------------------
export const deleteCoachDietPlan = asyncHandler(async (req, res) => {
  const plan = await CoachDietPlan.findOne({
    _id: req.params.id,
    coachId: req.user._id,
  });

  if (!plan) {
    res.status(404);
    throw new Error("Diet plan not found or access denied");
  }

  // Remove from linked subscription plans
  if (plan.subscriptionPlanIds && plan.subscriptionPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: plan.subscriptionPlanIds } },
      { $pull: { dietPlanIds: plan._id } }
    );

    for (const planId of plan.subscriptionPlanIds) {
      const subPlan = await Plan.findById(planId);
      if (subPlan && subPlan.dietPlanIds.length === 0) {
        subPlan.features.hasDietPlan = false;
        await subPlan.save();
      }
    }
  }

  plan.isActive = false;
  await plan.save();

  res.json({
    success: true,
    message: "Diet plan deleted successfully",
  });
});

// ------------------------------
// 📥 @desc Create diet plan from template
// @route POST /api/v1/coach/diet-plans/from-template/:templateId
// @access Private (Coach only)
// ------------------------------
export const createFromTemplate = asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const { name, subscriptionPlanIds } = req.body;

  const template = await DietTemplate.findOne({
    _id: templateId,
    isActive: true,
  });

  if (!template) {
    res.status(404);
    throw new Error("Diet template not found");
  }

  // Validate subscription plans
  if (subscriptionPlanIds && subscriptionPlanIds.length > 0) {
    await validateSubscriptionPlans(subscriptionPlanIds, req.user._id);
  }

  // Create plan from template - convert foodItemId ObjectIds to strings
  const planData = {
    coachId: req.user._id,
    name: name || `${template.name} (Copy)`,
    description: template.description,
    goal: template.goal,
    dailyTargets: template.dailyTargets,
    mealsPerDay: template.mealsPerDay,
    meals: template.sampleMeals,
    weeklySchedule: template.weeklySchedule,
    daysPerWeek: template.daysPerWeek,
    dietaryType: template.dietaryType,
    foodsToAvoid: template.foodsToAvoid,
    customInstructions: template.guidelines?.join("\n"),
    basedOnTemplate: template._id,
    subscriptionPlanIds: subscriptionPlanIds || [],
    thumbnailUrl: template.thumbnailUrl,
  };

  // Convert ObjectIds to strings in meals
  if (planData.meals && planData.meals.length > 0) {
    planData.meals = planData.meals.map(meal => ({
      ...meal.toObject ? meal.toObject() : meal,
      foods: meal.foods?.map(food => ({
        ...food.toObject ? food.toObject() : food,
        foodItemId: food.foodItemId?.toString ? food.foodItemId.toString() : food.foodItemId,
      })) || [],
      alternatives: meal.alternatives?.map(alt => alt.toString ? alt.toString() : alt) || [],
    }));
  }

  // Convert ObjectIds to strings in weeklySchedule
  if (planData.weeklySchedule && planData.weeklySchedule.length > 0) {
    planData.weeklySchedule = planData.weeklySchedule.map(day => ({
      ...day.toObject ? day.toObject() : day,
      meals: day.meals?.map(meal => ({
        ...meal.toObject ? meal.toObject() : meal,
        foods: meal.foods?.map(food => ({
          ...food.toObject ? food.toObject() : food,
          foodItemId: food.foodItemId?.toString ? food.foodItemId.toString() : food.foodItemId,
        })) || [],
        alternatives: meal.alternatives?.map(alt => alt.toString ? alt.toString() : alt) || [],
      })) || [],
    }));
  }

  // Enrich foods
  if (planData.meals && planData.meals.length > 0) {
    planData.meals = await validateAndEnrichFoods(planData.meals);
  }
  
  // Enrich foods in weekly schedule
  if (planData.weeklySchedule && planData.weeklySchedule.length > 0) {
    for (const day of planData.weeklySchedule) {
      if (day.meals && day.meals.length > 0) {
        day.meals = await validateAndEnrichFoods(day.meals);
      }
    }
  }

  const plan = await CoachDietPlan.create(planData);

  // Update template usage count
  await DietTemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });

  // Update linked subscription plans
  if (subscriptionPlanIds && subscriptionPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: subscriptionPlanIds } },
      {
        $addToSet: { dietPlanIds: plan._id },
        $set: { "features.hasDietPlan": true },
      }
    );
  }

  res.status(201).json({
    success: true,
    message: "Diet plan created from template successfully",
    data: plan,
  });
});

// ------------------------------
// 🔗 @desc Assign diet plan to subscription plan
// @route POST /api/v1/coach/diet-plans/:id/assign/:subscriptionPlanId
// @access Private (Coach only)
// ------------------------------
export const assignToSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id, subscriptionPlanId } = req.params;

  const dietPlan = await CoachDietPlan.findOne({
    _id: id,
    coachId: req.user._id,
  });

  if (!dietPlan) {
    res.status(404);
    throw new Error("Diet plan not found or access denied");
  }

  const subscriptionPlan = await Plan.findOne({
    _id: subscriptionPlanId,
    coachId: req.user._id,
  });

  if (!subscriptionPlan) {
    res.status(404);
    throw new Error("Subscription plan not found or access denied");
  }

  // Add diet plan to subscription plan
  if (!dietPlan.subscriptionPlanIds.includes(subscriptionPlanId)) {
    dietPlan.subscriptionPlanIds.push(subscriptionPlanId);
    await dietPlan.save();
  }

  if (!subscriptionPlan.dietPlanIds.includes(id)) {
    subscriptionPlan.dietPlanIds.push(id);
    subscriptionPlan.features.hasDietPlan = true;
    await subscriptionPlan.save();
  }

  res.json({
    success: true,
    message: "Diet plan assigned to subscription plan successfully",
  });
});

// ------------------------------
// 🔓 @desc Unassign diet plan from subscription plan
// @route DELETE /api/v1/coach/diet-plans/:id/assign/:subscriptionPlanId
// @access Private (Coach only)
// ------------------------------
export const unassignFromSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id, subscriptionPlanId } = req.params;

  const dietPlan = await CoachDietPlan.findOne({
    _id: id,
    coachId: req.user._id,
  });

  if (!dietPlan) {
    res.status(404);
    throw new Error("Diet plan not found or access denied");
  }

  dietPlan.subscriptionPlanIds = dietPlan.subscriptionPlanIds.filter(
    (pid) => pid.toString() !== subscriptionPlanId
  );
  await dietPlan.save();

  const subscriptionPlan = await Plan.findById(subscriptionPlanId);
  if (subscriptionPlan) {
    subscriptionPlan.dietPlanIds = subscriptionPlan.dietPlanIds.filter(
      (did) => did.toString() !== id
    );
    if (subscriptionPlan.dietPlanIds.length === 0) {
      subscriptionPlan.features.hasDietPlan = false;
    }
    await subscriptionPlan.save();
  }

  res.json({
    success: true,
    message: "Diet plan unassigned from subscription plan successfully",
  });
});
