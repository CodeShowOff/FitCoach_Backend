// src/controllers/workoutTemplate.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import WorkoutTemplate from "../models/WorkoutTemplate.js";
import Exercise from "../models/Exercise.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const templateCategoryEnum = [
  "strength",
  "cardio",
  "weight_loss",
  "muscle_gain",
  "yoga",
  "hiit",
  "flexibility",
  "endurance",
  "general_fitness",
  "sports_specific",
  "rehabilitation",
];

const difficultyEnum = ["beginner", "intermediate", "advanced"];

const exerciseInTemplateSchema = Joi.object({
  exerciseId: Joi.string().required(),
  order: Joi.number().min(1).required(),
  sets: Joi.number().min(1).max(20).default(3),
  reps: Joi.number().min(1).max(100).optional(),
  duration: Joi.number().min(1).max(3600).optional(),
  restSeconds: Joi.number().min(0).max(600).default(20),
  notes: Joi.string().max(300).optional().allow("", null),
});

const workoutDaySchema = Joi.object({
  dayNumber: Joi.number().min(1).max(7).required(),
  dayName: Joi.string().max(100).optional().allow("", null),
  isRestDay: Joi.boolean().default(false),
  focusArea: Joi.string().max(100).optional().allow("", null),
  estimatedDuration: Joi.number().min(0).max(300).optional(),
  exercises: Joi.array().items(exerciseInTemplateSchema).optional(),
});

const createTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(2000).optional().allow("", null),
  category: Joi.string()
    .valid(...templateCategoryEnum)
    .required(),
  difficulty: Joi.string()
    .valid(...difficultyEnum)
    .default("intermediate"),
  targetAudience: Joi.string().max(200).optional().allow("", null),
  equipmentRequired: Joi.array().items(Joi.string()).optional(),
  durationWeeks: Joi.number().min(1).max(52).default(4),
  daysPerWeek: Joi.number().min(1).max(7).default(5),
  avgWorkoutDuration: Joi.number().min(10).max(180).optional(),
  weeklySchedule: Joi.array().items(workoutDaySchema).optional(),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  description: Joi.string().max(2000).optional().allow("", null),
  category: Joi.string()
    .valid(...templateCategoryEnum)
    .optional(),
  difficulty: Joi.string()
    .valid(...difficultyEnum)
    .optional(),
  targetAudience: Joi.string().max(200).optional().allow("", null),
  equipmentRequired: Joi.array().items(Joi.string()).optional(),
  durationWeeks: Joi.number().min(1).max(52).optional(),
  daysPerWeek: Joi.number().min(1).max(7).optional(),
  avgWorkoutDuration: Joi.number().min(10).max(180).optional(),
  weeklySchedule: Joi.array().items(workoutDaySchema).optional(),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  isActive: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
});

// ------------------------------
// ➕ @desc Create a new workout template
// @route POST /api/v1/workout-templates
// @access Private (Admin only)
// ------------------------------
export const createWorkoutTemplate = asyncHandler(async (req, res) => {
  const { error, value } = createTemplateSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Validate that all exercise IDs exist
  if (value.weeklySchedule) {
    const exerciseIds = new Set();
    for (const day of value.weeklySchedule) {
      if (day.exercises) {
        for (const ex of day.exercises) {
          exerciseIds.add(ex.exerciseId);
        }
      }
    }

    if (exerciseIds.size > 0) {
      const existingExercises = await Exercise.find({
        _id: { $in: Array.from(exerciseIds) },
        isActive: true,
      }).select("_id");

      const existingIds = new Set(existingExercises.map((e) => e._id.toString()));
      const missingIds = Array.from(exerciseIds).filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        res.status(400);
        throw new Error(`Invalid exercise IDs: ${missingIds.join(", ")}`);
      }
    }
  }

  const template = await WorkoutTemplate.create({
    ...value,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Workout template created successfully",
    data: template,
  });
});

// ------------------------------
// 📋 @desc Get all workout templates (paginated, filterable)
// @route GET /api/v1/workout-templates
// @access Private (Admin, Coach)
// ------------------------------
export const getWorkoutTemplates = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { search, category, difficulty, isFeatured, isActive } = req.query;

  const query = {};

  // Only show active templates for non-admin users
  if (req.user?.role !== "admin") {
    query.isActive = true;
  } else if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  if (category) {
    query.category = category;
  }

  if (difficulty) {
    query.difficulty = difficulty;
  }

  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured === "true";
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query.$or = [
      { name: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
      { tags: { $regex: term, $options: "i" } },
    ];
  }

  const [templates, total] = await Promise.all([
    WorkoutTemplate.find(query)
      .select("-weeklySchedule") // Exclude heavy field for list view
      .skip(skip)
      .limit(limit)
      .sort({ isFeatured: -1, usageCount: -1, createdAt: -1 }),
    WorkoutTemplate.countDocuments(query),
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
// 🔍 @desc Get workout template by ID
// @route GET /api/v1/workout-templates/:id
// @access Private (Admin, Coach)
// ------------------------------
export const getWorkoutTemplateById = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (req.user?.role !== "admin") {
    query.isActive = true;
  }

  const template = await WorkoutTemplate.findOne(query).populate({
    path: "weeklySchedule.exercises.exerciseId",
    select: "name category muscleGroups animationUrl thumbnailUrl difficulty",
  });

  if (!template) {
    res.status(404);
    throw new Error("Workout template not found");
  }

  res.json({
    success: true,
    data: template,
  });
});

// ------------------------------
// ✏️ @desc Update workout template
// @route PATCH /api/v1/workout-templates/:id
// @access Private (Admin only)
// ------------------------------
export const updateWorkoutTemplate = asyncHandler(async (req, res) => {
  const { error, value } = updateTemplateSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Validate exercise IDs if weeklySchedule is being updated
  if (value.weeklySchedule) {
    const exerciseIds = new Set();
    for (const day of value.weeklySchedule) {
      if (day.exercises) {
        for (const ex of day.exercises) {
          exerciseIds.add(ex.exerciseId);
        }
      }
    }

    if (exerciseIds.size > 0) {
      const existingExercises = await Exercise.find({
        _id: { $in: Array.from(exerciseIds) },
        isActive: true,
      }).select("_id");

      const existingIds = new Set(existingExercises.map((e) => e._id.toString()));
      const missingIds = Array.from(exerciseIds).filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        res.status(400);
        throw new Error(`Invalid exercise IDs: ${missingIds.join(", ")}`);
      }
    }
  }

  const template = await WorkoutTemplate.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true,
  });

  if (!template) {
    res.status(404);
    throw new Error("Workout template not found");
  }

  res.json({
    success: true,
    message: "Workout template updated successfully",
    data: template,
  });
});

// ------------------------------
// 🗑️ @desc Delete workout template (soft delete)
// @route DELETE /api/v1/workout-templates/:id
// @access Private (Admin only)
// ------------------------------
export const deleteWorkoutTemplate = asyncHandler(async (req, res) => {
  const template = await WorkoutTemplate.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!template) {
    res.status(404);
    throw new Error("Workout template not found");
  }

  res.json({
    success: true,
    message: "Workout template deleted successfully",
  });
});

// ------------------------------
// 📊 @desc Get workout template categories
// @route GET /api/v1/workout-templates/metadata
// @access Private (Admin, Coach)
// ------------------------------
export const getWorkoutTemplateMetadata = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      categories: templateCategoryEnum,
      difficulties: difficultyEnum,
    },
  });
});
