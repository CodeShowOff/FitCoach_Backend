// src/models/CoachWorkoutPlan.js
import mongoose from "mongoose";

/**
 * Coach Workout Plan Model
 * Coach-customized workout plans that can be assigned to subscription plans
 */

// Sub-schema for exercises within a workout
const planExerciseSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    // Denormalized for quick access (reduces joins)
    exerciseName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    exerciseAnimationUrl: {
      type: String,
      trim: true,
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
    restSeconds: {
      type: Number,
      default: 60,
      min: 0,
      max: 600,
    },
    weight: {
      type: String, // Can be "bodyweight", "10kg", "moderate", etc.
      trim: true,
      maxlength: 50,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: true }
);

// Sub-schema for a single workout session within a day
const workoutSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Workout",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    estimatedDuration: {
      type: Number, // minutes
      min: 0,
      max: 300,
    },
    exercises: [planExerciseSchema],
  },
  { _id: true }
);

// Sub-schema for a workout day
// NOTE FOR CONTRIBUTORS:
// Backend supports multiple sessions per day through `workouts: [workoutSessionSchema]`.
// Current coach plan UI still edits a single session per day, so multi-session editing
// is not fully exposed in the frontend yet.
const workoutDaySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      min: 0, // 0 = Sunday, 1 = Monday, etc.
      max: 6,
    },
    dayNumber: {
      type: Number, // Day 1, Day 2, etc. (for flexible scheduling)
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
    restDayNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    focusArea: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Multiple sessions per day are supported at the data-model level.
    workouts: [workoutSessionSchema],
  },
  { _id: true }
);

const coachWorkoutPlanSchema = new mongoose.Schema(
  {
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coach ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Workout plan name is required"],
      trim: true,
      maxlength: 150,
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
        "custom",
      ],
      default: "custom",
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
    // Link to subscription plans (clients who subscribe get this workout)
    subscriptionPlanIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
      },
    ],
    // Program duration
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
    // Weekly schedule - the core workout structure
    weeklySchedule: [workoutDaySchema],
    // Equipment needed
    equipmentRequired: [
      {
        type: String,
        trim: true,
      },
    ],
    // Goals and notes
    goals: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    coachNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    // If created from a template
    basedOnTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutTemplate",
    },
    // Thumbnail
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    thumbnailPublicId: {
      type: String,
      trim: true,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
coachWorkoutPlanSchema.index({ coachId: 1, isActive: 1 });
coachWorkoutPlanSchema.index({ coachId: 1, subscriptionPlanIds: 1 });
coachWorkoutPlanSchema.index({ subscriptionPlanIds: 1 });
coachWorkoutPlanSchema.index({ coachId: 1, category: 1 });
coachWorkoutPlanSchema.index({ createdAt: -1 });

// Method to get all exercise IDs in the plan
coachWorkoutPlanSchema.methods.getAllExerciseIds = function () {
  const exerciseIds = new Set();
  for (const day of this.weeklySchedule) {
    if (!day.isRestDay && day.workouts) {
      for (const workout of day.workouts) {
        if (workout.exercises) {
          for (const exercise of workout.exercises) {
            if (exercise.exerciseId) {
              exerciseIds.add(exercise.exerciseId.toString());
            }
          }
        }
      }
    }
  }
  return Array.from(exerciseIds);
};

const CoachWorkoutPlan = mongoose.model("CoachWorkoutPlan", coachWorkoutPlanSchema);
export default CoachWorkoutPlan;
