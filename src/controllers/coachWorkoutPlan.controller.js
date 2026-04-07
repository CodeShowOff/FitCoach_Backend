// src/controllers/coachWorkoutPlan.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import CoachWorkoutPlan from "../models/CoachWorkoutPlan.js";
import WorkoutTemplate from "../models/WorkoutTemplate.js";
import Exercise from "../models/Exercise.js";
import Plan from "../models/Plan.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const categoryEnum = [
  "strength",
  "cardio",
  "weight_loss",
  "muscle_gain",
  "yoga",
  "hiit",
  "flexibility",
  "endurance",
  "general_fitness",
  "custom",
];

const difficultyEnum = ["beginner", "intermediate", "advanced"];

const exerciseSchema = Joi.object({
  exerciseId: Joi.string().required(),
  exerciseName: Joi.string().max(100).optional(),
  exerciseAnimationUrl: Joi.string().uri().optional().allow("", null),
  order: Joi.number().min(1).required(),
  reps: Joi.number().min(1).max(100).optional(),
  duration: Joi.number().min(1).max(3600).optional(),
  restSeconds: Joi.number().min(0).max(600).default(20),
  weight: Joi.string().max(50).optional().allow("", null),
  notes: Joi.string().max(500).optional().allow("", null),
});

const workoutSessionSchema = Joi.object({
  name: Joi.string().max(100).default("Workout"),
  description: Joi.string().max(500).optional().allow("", null),
  estimatedDuration: Joi.number().min(0).max(300).optional(),
  exercises: Joi.array().items(exerciseSchema).optional(),
});

const workoutDaySchema = Joi.object({
  dayOfWeek: Joi.number().min(0).max(6).optional(),
  dayNumber: Joi.number().min(1).max(7).optional(),
  dayName: Joi.string().max(100).optional().allow("", null),
  isRestDay: Joi.boolean().default(false),
  restDayNotes: Joi.string().max(500).optional().allow("", null),
  focusArea: Joi.string().max(100).optional().allow("", null),
  workouts: Joi.array().items(workoutSessionSchema).optional(),
});

const createPlanSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(2000).optional().allow("", null),
  category: Joi.string()
    .valid(...categoryEnum)
    .default("custom"),
  difficulty: Joi.string()
    .valid(...difficultyEnum)
    .default("intermediate"),
  subscriptionPlanIds: Joi.array().items(Joi.string()).optional(),
  durationWeeks: Joi.number().min(1).max(52).default(4),
  daysPerWeek: Joi.number().min(1).max(7).default(5),
  weeklySchedule: Joi.array().items(workoutDaySchema).optional(),
  equipmentRequired: Joi.array().items(Joi.string()).optional(),
  goals: Joi.string().max(1000).optional().allow("", null),
  coachNotes: Joi.string().max(2000).optional().allow("", null),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().default(true),
  isDraft: Joi.boolean().default(false),
});

const updatePlanSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  description: Joi.string().max(2000).optional().allow("", null),
  category: Joi.string()
    .valid(...categoryEnum)
    .optional(),
  difficulty: Joi.string()
    .valid(...difficultyEnum)
    .optional(),
  subscriptionPlanIds: Joi.array().items(Joi.string()).optional(),
  durationWeeks: Joi.number().min(1).max(52).optional(),
  daysPerWeek: Joi.number().min(1).max(7).optional(),
  weeklySchedule: Joi.array().items(workoutDaySchema).optional(),
  equipmentRequired: Joi.array().items(Joi.string()).optional(),
  goals: Joi.string().max(1000).optional().allow("", null),
  coachNotes: Joi.string().max(2000).optional().allow("", null),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().optional(),
  isDraft: Joi.boolean().optional(),
});

// Helper function to validate and enrich exercises
async function validateAndEnrichExercises(weeklySchedule) {
  const exerciseIds = new Set();

  // Collect all exercise IDs
  for (const day of weeklySchedule) {
    if (!day.isRestDay && day.workouts) {
      for (const workout of day.workouts) {
        if (workout.exercises) {
          for (const ex of workout.exercises) {
            exerciseIds.add(ex.exerciseId);
          }
        }
      }
    }
  }

  if (exerciseIds.size === 0) return weeklySchedule;

  // Fetch exercises
  const exercises = await Exercise.find({
    _id: { $in: Array.from(exerciseIds) },
    isActive: true,
  }).select("_id name animationUrl");

  const exerciseMap = new Map();
  exercises.forEach((ex) => {
    exerciseMap.set(ex._id.toString(), ex);
  });

  // Validate and enrich
  const missingIds = [];
  for (const day of weeklySchedule) {
    if (!day.isRestDay && day.workouts) {
      for (const workout of day.workouts) {
        if (workout.exercises) {
          for (const ex of workout.exercises) {
            const exerciseData = exerciseMap.get(ex.exerciseId);
            if (!exerciseData) {
              missingIds.push(ex.exerciseId);
            } else {
              // Enrich with exercise data
              ex.exerciseName = exerciseData.name;
              ex.exerciseAnimationUrl = exerciseData.animationUrl || null;
            }
          }
        }
      }
    }
  }

  if (missingIds.length > 0) {
    throw new Error(`Invalid exercise IDs: ${missingIds.join(", ")}`);
  }

  return weeklySchedule;
}

// Helper function to validate subscription plan ownership
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
// ➕ @desc Create a new workout plan
// @route POST /api/v1/coach/workout-plans
// @access Private (Coach only)
// ------------------------------
export const createCoachWorkoutPlan = asyncHandler(async (req, res) => {
  const { error, value } = createPlanSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Validate subscription plans belong to this coach
  if (value.subscriptionPlanIds && value.subscriptionPlanIds.length > 0) {
    await validateSubscriptionPlans(value.subscriptionPlanIds, req.user._id);
  }

  // Validate and enrich exercises
  if (value.weeklySchedule && value.weeklySchedule.length > 0) {
    value.weeklySchedule = await validateAndEnrichExercises(value.weeklySchedule);
  }

  const plan = await CoachWorkoutPlan.create({
    ...value,
    coachId: req.user._id,
  });

  // Update linked subscription plans
  if (value.subscriptionPlanIds && value.subscriptionPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: value.subscriptionPlanIds } },
      {
        $addToSet: { workoutPlanIds: plan._id },
        $set: { "features.hasWorkoutPlan": true },
      }
    );
  }

  res.status(201).json({
    success: true,
    message: "Workout plan created successfully",
    data: plan,
  });
});

// ------------------------------
// 📋 @desc Get all workout plans for coach
// @route GET /api/v1/coach/workout-plans
// @access Private (Coach only)
// ------------------------------
export const getCoachWorkoutPlans = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { search, category, isActive, isDraft } = req.query;

  // Default behavior: only return active plans.
  // Pass ?isActive=false explicitly if you need to view archived/soft-deleted plans.
  const query = { coachId: req.user._id, isActive: true };

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  if (isDraft !== undefined) {
    query.isDraft = isDraft === "true";
  }

  if (category) {
    query.category = category;
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query.$or = [
      { name: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
    ];
  }

  const [plans, total] = await Promise.all([
    CoachWorkoutPlan.find(query)
      .select("-weeklySchedule") // Exclude heavy field for list view
      .populate("subscriptionPlanIds", "title")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    CoachWorkoutPlan.countDocuments(query),
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
// 🔍 @desc Get workout plan by ID
// @route GET /api/v1/coach/workout-plans/:id
// @access Private (Coach only)
// ------------------------------
export const getCoachWorkoutPlanById = asyncHandler(async (req, res) => {
  const plan = await CoachWorkoutPlan.findOne({
    _id: req.params.id,
    coachId: req.user._id,
    isActive: true,
  })
    .populate("subscriptionPlanIds", "title price durationWeeks")
    .populate({
      path: "weeklySchedule.workouts.exercises.exerciseId",
      select: "name category muscleGroups animationUrl thumbnailUrl difficulty",
    });

  if (!plan) {
    res.status(404);
    throw new Error("Workout plan not found or access denied");
  }

  res.json({
    success: true,
    data: plan,
  });
});

// ------------------------------
// ✏️ @desc Update workout plan
// @route PATCH /api/v1/coach/workout-plans/:id
// @access Private (Coach only)
// ------------------------------
export const updateCoachWorkoutPlan = asyncHandler(async (req, res) => {
  const { error, value } = updatePlanSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const existingPlan = await CoachWorkoutPlan.findOne({
    _id: req.params.id,
    coachId: req.user._id,
    isActive: true,
  });

  if (!existingPlan) {
    res.status(404);
    throw new Error("Workout plan not found or access denied");
  }

  // Validate subscription plans
  if (value.subscriptionPlanIds && value.subscriptionPlanIds.length > 0) {
    await validateSubscriptionPlans(value.subscriptionPlanIds, req.user._id);
  }

  // Validate and enrich exercises
  if (value.weeklySchedule && value.weeklySchedule.length > 0) {
    value.weeklySchedule = await validateAndEnrichExercises(value.weeklySchedule);
  }

  // Handle subscription plan updates
  const oldPlanIds = existingPlan.subscriptionPlanIds.map((id) => id.toString());
  const newPlanIds = value.subscriptionPlanIds || oldPlanIds;

  // Remove from old plans not in new list
  const removedPlanIds = oldPlanIds.filter((id) => !newPlanIds.includes(id));
  if (removedPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: removedPlanIds } },
      { $pull: { workoutPlanIds: existingPlan._id } }
    );

    // Update hasWorkoutPlan feature flag
    for (const planId of removedPlanIds) {
      const plan = await Plan.findById(planId);
      if (plan && plan.workoutPlanIds.length === 0) {
        plan.features.hasWorkoutPlan = false;
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
        $addToSet: { workoutPlanIds: existingPlan._id },
        $set: { "features.hasWorkoutPlan": true },
      }
    );
  }

  const plan = await CoachWorkoutPlan.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: "Workout plan updated successfully",
    data: plan,
  });
});

// ------------------------------
// 🗑️ @desc Delete workout plan (soft delete)
// @route DELETE /api/v1/coach/workout-plans/:id
// @access Private (Coach only)
// ------------------------------
export const deleteCoachWorkoutPlan = asyncHandler(async (req, res) => {
  const plan = await CoachWorkoutPlan.findOne({
    _id: req.params.id,
    coachId: req.user._id,
    isActive: true,
  });

  if (!plan) {
    res.status(404);
    throw new Error("Workout plan not found or access denied");
  }

  // Remove from linked subscription plans
  if (plan.subscriptionPlanIds && plan.subscriptionPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: plan.subscriptionPlanIds } },
      { $pull: { workoutPlanIds: plan._id } }
    );

    // Update hasWorkoutPlan feature flag
    for (const planId of plan.subscriptionPlanIds) {
      const subPlan = await Plan.findById(planId);
      if (subPlan && subPlan.workoutPlanIds.length === 0) {
        subPlan.features.hasWorkoutPlan = false;
        await subPlan.save();
      }
    }
  }

  plan.isActive = false;
  await plan.save();

  res.json({
    success: true,
    message: "Workout plan deleted successfully",
  });
});

// ------------------------------
// 📥 @desc Create workout plan from template
// @route POST /api/v1/coach/workout-plans/from-template/:templateId
// @access Private (Coach only)
// ------------------------------
export const createFromTemplate = asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const { name, subscriptionPlanIds } = req.body;

  const template = await WorkoutTemplate.findOne({
    _id: templateId,
    isActive: true,
  });

  if (!template) {
    res.status(404);
    throw new Error("Workout template not found");
  }

  // Validate subscription plans
  if (subscriptionPlanIds && subscriptionPlanIds.length > 0) {
    await validateSubscriptionPlans(subscriptionPlanIds, req.user._id);
  }

  // Create plan from template
  const planData = {
    coachId: req.user._id,
    name: name || `${template.name} (Copy)`,
    description: template.description,
    category: template.category,
    difficulty: template.difficulty,
    durationWeeks: template.durationWeeks,
    daysPerWeek: template.daysPerWeek,
    equipmentRequired: template.equipmentRequired,
    weeklySchedule: template.weeklySchedule.map((day) => ({
      dayNumber: day.dayNumber,
      dayName: day.dayName,
      isRestDay: day.isRestDay,
      focusArea: day.focusArea,
      workouts: [
        {
          name: day.dayName || "Workout",
          estimatedDuration: day.estimatedDuration,
          exercises: (day.exercises || []).map((ex) => ({
            exerciseId: ex.exerciseId.toString(), // Convert ObjectId to string
            order: ex.order,
            reps: ex.reps,
            duration: ex.duration,
            weight: ex.weight,
            restSeconds: ex.restSeconds,
            notes: ex.notes,
          })),
        },
      ],
    })),
    basedOnTemplate: template._id,
    subscriptionPlanIds: subscriptionPlanIds || [],
    thumbnailUrl: template.thumbnailUrl,
  };

  // Enrich exercises with names and animation URLs
  if (planData.weeklySchedule && planData.weeklySchedule.length > 0) {
    planData.weeklySchedule = await validateAndEnrichExercises(planData.weeklySchedule);
  }

  const plan = await CoachWorkoutPlan.create(planData);

  // Update template usage count
  await WorkoutTemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });

  // Update linked subscription plans
  if (subscriptionPlanIds && subscriptionPlanIds.length > 0) {
    await Plan.updateMany(
      { _id: { $in: subscriptionPlanIds } },
      {
        $addToSet: { workoutPlanIds: plan._id },
        $set: { "features.hasWorkoutPlan": true },
      }
    );
  }

  res.status(201).json({
    success: true,
    message: "Workout plan created from template successfully",
    data: plan,
  });
});

// ------------------------------
// 🔗 @desc Assign workout plan to subscription plan
// @route POST /api/v1/coach/workout-plans/:id/assign/:subscriptionPlanId
// @access Private (Coach only)
// ------------------------------
export const assignToSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id, subscriptionPlanId } = req.params;

  const workoutPlan = await CoachWorkoutPlan.findOne({
    _id: id,
    coachId: req.user._id,
  });

  if (!workoutPlan) {
    res.status(404);
    throw new Error("Workout plan not found or access denied");
  }

  const subscriptionPlan = await Plan.findOne({
    _id: subscriptionPlanId,
    coachId: req.user._id,
  });

  if (!subscriptionPlan) {
    res.status(404);
    throw new Error("Subscription plan not found or access denied");
  }

  // Add workout plan to subscription plan
  if (!workoutPlan.subscriptionPlanIds.includes(subscriptionPlanId)) {
    workoutPlan.subscriptionPlanIds.push(subscriptionPlanId);
    await workoutPlan.save();
  }

  // Add workout plan ID to subscription plan
  if (!subscriptionPlan.workoutPlanIds.includes(id)) {
    subscriptionPlan.workoutPlanIds.push(id);
    subscriptionPlan.features.hasWorkoutPlan = true;
    await subscriptionPlan.save();
  }

  res.json({
    success: true,
    message: "Workout plan assigned to subscription plan successfully",
    data: {
      workoutPlan: workoutPlan._id,
      subscriptionPlan: subscriptionPlan._id,
    },
  });
});

// ------------------------------
// 🔓 @desc Unassign workout plan from subscription plan
// @route DELETE /api/v1/coach/workout-plans/:id/assign/:subscriptionPlanId
// @access Private (Coach only)
// ------------------------------
export const unassignFromSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id, subscriptionPlanId } = req.params;

  const workoutPlan = await CoachWorkoutPlan.findOne({
    _id: id,
    coachId: req.user._id,
  });

  if (!workoutPlan) {
    res.status(404);
    throw new Error("Workout plan not found or access denied");
  }

  // Remove subscription plan from workout plan
  workoutPlan.subscriptionPlanIds = workoutPlan.subscriptionPlanIds.filter(
    (pid) => pid.toString() !== subscriptionPlanId
  );
  await workoutPlan.save();

  // Remove workout plan from subscription plan
  const subscriptionPlan = await Plan.findById(subscriptionPlanId);
  if (subscriptionPlan) {
    subscriptionPlan.workoutPlanIds = subscriptionPlan.workoutPlanIds.filter(
      (wid) => wid.toString() !== id
    );
    if (subscriptionPlan.workoutPlanIds.length === 0) {
      subscriptionPlan.features.hasWorkoutPlan = false;
    }
    await subscriptionPlan.save();
  }

  res.json({
    success: true,
    message: "Workout plan unassigned from subscription plan successfully",
  });
});
