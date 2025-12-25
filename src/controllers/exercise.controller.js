// src/controllers/exercise.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import Exercise from "../models/Exercise.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const exerciseCategoryEnum = [
  "strength",
  "cardio",
  "flexibility",
  "yoga",
  "functional",
  "plyometric",
  "calisthenics",
  "stretching",
];

const muscleGroupEnum = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "abs",
  "obliques",
  "lower_back",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "hip_flexors",
  "adductors",
  "abductors",
  "full_body",
  "neck",
];

const equipmentEnum = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "kettlebell",
  "resistance_band",
  "cable_machine",
  "smith_machine",
  "pull_up_bar",
  "bench",
  "yoga_mat",
  "medicine_ball",
  "stability_ball",
  "foam_roller",
  "trx",
  "battle_ropes",
  "box",
  "treadmill",
  "stationary_bike",
  "rowing_machine",
  "elliptical",
  "none",
];

const difficultyEnum = ["beginner", "intermediate", "advanced"];

const createExerciseSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).optional().allow("", null),
  category: Joi.string()
    .valid(...exerciseCategoryEnum)
    .required(),
  subcategory: Joi.string().max(100).optional().allow("", null),
  muscleGroups: Joi.array()
    .items(Joi.string().valid(...muscleGroupEnum))
    .optional(),
  equipment: Joi.custom((value, helpers) => {
    // Allow null, undefined, or empty string
    if (value === null || value === undefined || value === '') {
      return [];
    }
    if (typeof value === 'string') {
      if (!equipmentEnum.includes(value)) {
        return helpers.error('any.invalid');
      }
      return [value]; // Convert to array
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return [];
      }
      for (const item of value) {
        if (typeof item !== 'string' || !equipmentEnum.includes(item)) {
          return helpers.error('any.invalid');
        }
      }
      return value;
    }
    return helpers.error('any.invalid');
  }).optional().messages({
    'any.invalid': '"equipment" must be a valid equipment type or array of equipment types'
  }),
  difficulty: Joi.string()
    .valid(...difficultyEnum)
    .default("intermediate"),
  instructions: Joi.array().items(Joi.string().max(500)).optional(),
  tips: Joi.array().items(Joi.string().max(300)).optional(),
  animationUrl: Joi.string().uri().optional().allow("", null),
  videoUrl: Joi.string().uri().optional().allow("", null), // Alias for animationUrl
  imageUrl: Joi.string().uri().optional().allow("", null), // Alias for animationUrl
  animationPublicId: Joi.string().optional().allow("", null),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  defaultDuration: Joi.number().min(0).max(600).optional(),
  defaultReps: Joi.number().min(0).max(100).optional(),
  defaultSets: Joi.number().min(1).max(10).default(3),
  isTimeBased: Joi.boolean().default(false),
  isYoga: Joi.boolean().default(false),
  caloriesPerMinute: Joi.number().min(0).max(50).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  isActive: Joi.boolean().default(true),
});

const updateExerciseSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional().allow("", null),
  category: Joi.string()
    .valid(...exerciseCategoryEnum)
    .optional(),
  subcategory: Joi.string().max(100).optional().allow("", null),
  muscleGroups: Joi.array()
    .items(Joi.string().valid(...muscleGroupEnum))
    .optional(),
  equipment: Joi.custom((value, helpers) => {
    // Allow null, undefined, or empty string
    if (value === null || value === undefined || value === '') {
      return [];
    }
    if (typeof value === 'string') {
      if (!equipmentEnum.includes(value)) {
        return helpers.error('any.invalid');
      }
      return [value]; // Convert to array
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return [];
      }
      for (const item of value) {
        if (typeof item !== 'string' || !equipmentEnum.includes(item)) {
          return helpers.error('any.invalid');
        }
      }
      return value;
    }
    return helpers.error('any.invalid');
  }).optional().messages({
    'any.invalid': '"equipment" must be a valid equipment type or array of equipment types'
  }),
  difficulty: Joi.string()
    .valid(...difficultyEnum)
    .optional(),
  instructions: Joi.array().items(Joi.string().max(500)).optional(),
  tips: Joi.array().items(Joi.string().max(300)).optional(),
  animationUrl: Joi.string().uri().optional().allow("", null),
  videoUrl: Joi.string().uri().optional().allow("", null), // Alias for animationUrl
  imageUrl: Joi.string().uri().optional().allow("", null), // Alias for animationUrl
  animationPublicId: Joi.string().optional().allow("", null),
  thumbnailUrl: Joi.string().uri().optional().allow("", null),
  thumbnailPublicId: Joi.string().optional().allow("", null),
  defaultDuration: Joi.number().min(0).max(600).optional(),
  defaultReps: Joi.number().min(0).max(100).optional(),
  defaultSets: Joi.number().min(1).max(10).optional(),
  isTimeBased: Joi.boolean().optional(),
  isYoga: Joi.boolean().optional(),
  caloriesPerMinute: Joi.number().min(0).max(50).optional(),
  alternatives: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  isActive: Joi.boolean().optional(),
});

// ------------------------------
// ➕ @desc Create a new exercise
// @route POST /api/v1/exercises
// @access Private (Admin only)
// ------------------------------
export const createExercise = asyncHandler(async (req, res) => {
  const { error, value } = createExerciseSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Determine if this is a custom exercise (created by coach) or global (created by admin)
  const isCustom = req.user.role === "coach";

  // Handle videoUrl/imageUrl as alias for animationUrl
  if (value.videoUrl && !value.animationUrl) {
    value.animationUrl = value.videoUrl;
  }
  if (value.imageUrl && !value.animationUrl) {
    value.animationUrl = value.imageUrl;
  }
  delete value.videoUrl; // Remove videoUrl since it's not in the model
  delete value.imageUrl; // Remove imageUrl since it's not in the model

  const exercise = await Exercise.create({
    ...value,
    createdBy: req.user._id,
    isCustom,
  });

  res.status(201).json({
    success: true,
    message: `${isCustom ? "Custom" : "Global"} exercise created successfully`,
    data: exercise,
  });
});

// ------------------------------
// 📋 @desc Get all exercises (paginated, filterable)
// @route GET /api/v1/exercises
// @access Private (Admin, Coach, Client)
// ------------------------------
export const getExercises = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { search, category, muscleGroup, equipment, difficulty, isYoga, isActive } = req.query;

  const query = {};

  // Show exercises based on user role:
  // - Admin: Can see all exercises (global and all custom)
  // - Coach: Can see global exercises + their own custom exercises
  // - Client: Can see global exercises + their coach's custom exercises
  if (req.user?.role === "admin") {
    // Admin sees everything
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
  } else if (req.user?.role === "coach") {
    // Coach sees global exercises + their own custom exercises
    query.$or = [
      { isCustom: false, isActive: true }, // Global exercises
      { isCustom: true, createdBy: req.user._id }, // Own custom exercises
    ];
  } else if (req.user?.role === "client") {
    // Client sees global exercises + their coach's custom exercises
    const coachId = req.user.assignedCoach;
    if (coachId) {
      query.$or = [
        { isCustom: false, isActive: true }, // Global exercises
        { isCustom: true, createdBy: coachId, isActive: true }, // Coach's custom exercises
      ];
    } else {
      // No assigned coach, only global exercises
      query.isCustom = false;
      query.isActive = true;
    }
  } else {
    // Default: only global active exercises
    query.isCustom = false;
    query.isActive = true;
  }

  // Additional filters
  const additionalFilters = {};

  // Filter by category
  if (category) {
    additionalFilters.category = category;
  }

  // Filter by muscle group
  if (muscleGroup) {
    additionalFilters.muscleGroups = muscleGroup;
  }

  // Filter by equipment
  if (equipment) {
    additionalFilters.equipment = equipment;
  }

  // Filter by difficulty
  if (difficulty) {
    additionalFilters.difficulty = difficulty;
  }

  // Filter yoga exercises
  if (isYoga !== undefined) {
    additionalFilters.isYoga = isYoga === "true";
  }

  // Merge additional filters with main query
  Object.assign(query, additionalFilters);

  // Search by name, description, or tags
  if (search && search.trim().length > 0) {
    const term = search.trim();
    const searchCondition = {
      $or: [
        { name: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { tags: { $regex: term, $options: "i" } },
      ],
    };
    
    // Combine with existing $or if present
    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        searchCondition,
      ];
      delete query.$or;
    } else {
      Object.assign(query, searchCondition);
    }
  }

  const [exercises, total] = await Promise.all([
    Exercise.find(query)
      .select("-__v")
      .skip(skip)
      .limit(limit)
      .sort({ isCustom: 1, name: 1 }) // Global exercises first, then custom
      .populate("createdBy", "name"),
    Exercise.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: exercises,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// 🔍 @desc Get exercise by ID
// @route GET /api/v1/exercises/:id
// @access Private (Admin, Coach, Client)
// ------------------------------
export const getExerciseById = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  // Only show active exercises for non-admin users
  if (req.user?.role !== "admin") {
    query.isActive = true;
  }

  const exercise = await Exercise.findOne(query).populate("alternatives", "name thumbnailUrl");

  if (!exercise) {
    res.status(404);
    throw new Error("Exercise not found");
  }

  res.json({
    success: true,
    data: exercise,
  });
});

// ------------------------------
// ✏️ @desc Update exercise
// @route PATCH /api/v1/exercises/:id
// @access Private (Admin for all, Coach for own custom exercises)
// ------------------------------
export const updateExercise = asyncHandler(async (req, res) => {
  const { error, value } = updateExerciseSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const exercise = await Exercise.findById(req.params.id);

  if (!exercise) {
    res.status(404);
    throw new Error("Exercise not found");
  }

  // Authorization: Admin can update all, Coach can only update their own custom exercises
  if (req.user.role === "coach") {
    if (!exercise.isCustom || exercise.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only update your own custom exercises");
    }
  } else if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to update exercises");
  }

  // Handle videoUrl/imageUrl as alias for animationUrl
  if (value.videoUrl && !value.animationUrl) {
    value.animationUrl = value.videoUrl;
  }
  if (value.imageUrl && !value.animationUrl) {
    value.animationUrl = value.imageUrl;
  }
  delete value.videoUrl; // Remove videoUrl since it's not in the model
  delete value.imageUrl; // Remove imageUrl since it's not in the model

  Object.assign(exercise, value);
  await exercise.save();

  res.json({
    success: true,
    message: "Exercise updated successfully",
    data: exercise,
  });
});

// ------------------------------
// 🗑️ @desc Delete exercise (soft delete)
// @route DELETE /api/v1/exercises/:id
// @access Private (Admin for all, Coach for own custom exercises)
// ------------------------------
export const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);

  if (!exercise) {
    res.status(404);
    throw new Error("Exercise not found");
  }

  // Authorization: Admin can delete all, Coach can only delete their own custom exercises
  if (req.user.role === "coach") {
    if (!exercise.isCustom || exercise.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only delete your own custom exercises");
    }
  } else if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to delete exercises");
  }

  exercise.isActive = false;
  await exercise.save();

  res.json({
    success: true,
    message: "Exercise deleted successfully",
  });
});

// ------------------------------
// 📊 @desc Get exercise categories and metadata
// @route GET /api/v1/exercises/metadata
// @access Private (Admin, Coach, Client)
// ------------------------------
export const getExerciseMetadata = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      categories: exerciseCategoryEnum,
      muscleGroups: muscleGroupEnum,
      equipment: equipmentEnum,
      difficulties: difficultyEnum,
    },
  });
});

// ------------------------------
// 📦 @desc Bulk create exercises
// @route POST /api/v1/exercises/bulk
// @access Private (Admin only)
// ------------------------------
export const bulkCreateExercises = asyncHandler(async (req, res) => {
  const { exercises } = req.body;

  if (!Array.isArray(exercises) || exercises.length === 0) {
    res.status(400);
    throw new Error("Please provide an array of exercises");
  }

  if (exercises.length > 100) {
    res.status(400);
    throw new Error("Maximum 100 exercises can be created at once");
  }

  // Validate each exercise
  const validatedExercises = [];
  const errors = [];

  for (let i = 0; i < exercises.length; i++) {
    const { error, value } = createExerciseSchema.validate(exercises[i]);
    if (error) {
      errors.push({ index: i, error: error.details[0].message });
    } else {
      validatedExercises.push({
        ...value,
        createdBy: req.user._id,
      });
    }
  }

  if (errors.length > 0) {
    res.status(400);
    throw new Error(`Validation errors: ${JSON.stringify(errors)}`);
  }

  const created = await Exercise.insertMany(validatedExercises);

  res.status(201).json({
    success: true,
    message: `${created.length} exercises created successfully`,
    data: created,
  });
});

// ------------------------------
// 🎬 @desc Upload animation for exercise
// @route POST /api/v1/exercises/:id/animation
// @access Private (Admin only)
// ------------------------------
export const uploadExerciseAnimation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exercise = await Exercise.findById(id);
  if (!exercise) {
    res.status(404);
    throw new Error("Exercise not found");
  }

  // Authorization: Admin can upload for all, Coach can only upload for their own custom exercises
  if (req.user.role === "coach") {
    if (!exercise.isCustom || exercise.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only upload animations for your own custom exercises");
    }
  } else if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to upload exercise animations");
  }

  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  // Determine resource type based on file mimetype
  const isVideo = req.file.mimetype.startsWith("video/");
  const isImage = req.file.mimetype.startsWith("image/");

  if (!isVideo && !isImage) {
    res.status(400);
    throw new Error("Only image (GIF, PNG, JPG) or video (MP4, WEBM) files are allowed");
  }

  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";

  // Delete old animation if exists
  if (exercise.animationPublicId) {
    try {
      await cloudinary.uploader.destroy(exercise.animationPublicId, {
        resource_type: exercise.animationUrl?.includes(".mp4") || exercise.animationUrl?.includes(".webm") ? "video" : "image",
        invalidate: true,
      });
    } catch (e) {
      console.warn("Failed to delete old animation from Cloudinary:", e.message || e);
    }
  }

  const uploadOptions = {
    folder: `${folderPrefix}/exercises/animations`,
    public_id: `exercise_${id}_${Date.now()}`,
    resource_type: isVideo ? "video" : "image",
    overwrite: true,
  };

  // Add transformations for different file types
  if (isImage && !req.file.mimetype.includes("gif")) {
    uploadOptions.transformation = [
      { width: 600, height: 600, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ];
  } else if (isVideo) {
    uploadOptions.transformation = [
      { width: 600, height: 600, crop: "limit" },
      { quality: "auto" },
    ];
    uploadOptions.eager = [
      { width: 200, height: 200, crop: "fill", format: "jpg" }, // Thumbnail
    ];
    uploadOptions.eager_async = true;
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  // Update exercise with animation URLs
  exercise.animationUrl = uploadResult.secure_url || uploadResult.url;
  exercise.animationPublicId = uploadResult.public_id;

  // Set thumbnail URL (use eager transformation for videos, or the same URL for GIFs/images)
  if (isVideo && uploadResult.eager && uploadResult.eager[0]) {
    exercise.thumbnailUrl = uploadResult.eager[0].secure_url || uploadResult.eager[0].url;
    exercise.thumbnailPublicId = uploadResult.eager[0].public_id;
  } else {
    exercise.thumbnailUrl = uploadResult.secure_url || uploadResult.url;
    exercise.thumbnailPublicId = uploadResult.public_id;
  }

  await exercise.save();

  res.json({
    success: true,
    message: "Exercise animation uploaded successfully",
    data: {
      animationUrl: exercise.animationUrl,
      animationPublicId: exercise.animationPublicId,
      thumbnailUrl: exercise.thumbnailUrl,
      thumbnailPublicId: exercise.thumbnailPublicId,
    },
  });
});

// ------------------------------
// 🗑️ @desc Delete animation from exercise
// @route DELETE /api/v1/exercises/:id/animation
// @access Private (Admin only)
// ------------------------------
export const deleteExerciseAnimation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exercise = await Exercise.findById(id);
  if (!exercise) {
    res.status(404);
    throw new Error("Exercise not found");
  }

  // Authorization: Admin can delete for all, Coach can only delete for their own custom exercises
  if (req.user.role === "coach") {
    if (!exercise.isCustom || exercise.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only delete animations for your own custom exercises");
    }
  } else if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to delete exercise animations");
  }

  if (!exercise.animationPublicId) {
    res.status(400);
    throw new Error("No animation to delete");
  }

  // Determine resource type
  const isVideo = exercise.animationUrl?.includes(".mp4") || exercise.animationUrl?.includes(".webm");

  try {
    await cloudinary.uploader.destroy(exercise.animationPublicId, {
      resource_type: isVideo ? "video" : "image",
      invalidate: true,
    });

    // Also delete thumbnail if different from animation
    if (exercise.thumbnailPublicId && exercise.thumbnailPublicId !== exercise.animationPublicId) {
      await cloudinary.uploader.destroy(exercise.thumbnailPublicId, {
        resource_type: "image",
        invalidate: true,
      });
    }
  } catch (e) {
    console.warn("Failed to delete animation from Cloudinary:", e.message || e);
  }

  exercise.animationUrl = null;
  exercise.animationPublicId = null;
  exercise.thumbnailUrl = null;
  exercise.thumbnailPublicId = null;
  await exercise.save();

  res.json({
    success: true,
    message: "Exercise animation deleted successfully",
  });
});
