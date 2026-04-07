// src/models/WorkoutTemplate.js
import mongoose from "mongoose";

/**
 * Global Workout Template Model
 * Admin-managed pre-built workout routines that coaches can clone and customize
 */

// Sub-schema for exercises within a workout
const templateExerciseSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    reps: {
      type: Number,
      min: 1,
      max: 100,
    },
    duration: {
      type: Number, // seconds (for timed exercises)
      min: 1,
      max: 3600,
    },
    weight: {
      type: String, // Can be "bodyweight", "10kg", "moderate", etc.
      trim: true,
      maxlength: 50,
    },
    restSeconds: {
      type: Number,
      default: 60,
      min: 0,
      max: 600,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
);

// Sub-schema for a single workout day
// NOTE FOR CONTRIBUTORS:
// Template model does NOT support multiple sessions per day yet.
// It stores exercises directly on each day, and during template -> coach-plan conversion
// backend creates one workout session per day from this structure.
const workoutDaySchema = new mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    dayName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    isRestDay: {
      type: Boolean,
      default: false,
    },
    focusArea: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    estimatedDuration: {
      type: Number, // minutes
      min: 0,
      max: 300,
    },
    // Single-session-per-day representation (session-less template day).
    exercises: [templateExerciseSchema],
  },
  { _id: true }
);

const workoutTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      maxlength: 150,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: [
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
      ],
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
      index: true,
    },
    // Target audience
    targetAudience: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    // Equipment required for this template
    equipmentRequired: [
      {
        type: String,
        trim: true,
      },
    ],
    // Duration of the program in weeks
    durationWeeks: {
      type: Number,
      default: 4,
      min: 1,
      max: 52,
    },
    // Days per week
    daysPerWeek: {
      type: Number,
      default: 5,
      min: 1,
      max: 7,
    },
    // Average workout duration in minutes
    avgWorkoutDuration: {
      type: Number,
      min: 10,
      max: 180,
    },
    // Weekly schedule
    weeklySchedule: [workoutDaySchema],
    // Thumbnail/cover image
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    thumbnailPublicId: {
      type: String,
      trim: true,
    },
    // Tags for search and filtering
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    // Usage tracking
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Admin control
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Created by admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
workoutTemplateSchema.index({ name: "text", description: "text", tags: "text" });
workoutTemplateSchema.index({ category: 1, difficulty: 1, isActive: 1 });
workoutTemplateSchema.index({ isFeatured: 1, isActive: 1 });
workoutTemplateSchema.index({ usageCount: -1 });
workoutTemplateSchema.index({ createdAt: -1 });

const WorkoutTemplate = mongoose.model("WorkoutTemplate", workoutTemplateSchema);
export default WorkoutTemplate;
