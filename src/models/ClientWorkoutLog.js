// src/models/ClientWorkoutLog.js
import mongoose from "mongoose";

/**
 * Client Workout Log Model
 * Tracks client's workout completion and progress
 */

// Sub-schema for individual exercise logs
const exerciseLogSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
    },
    exerciseName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    plannedReps: {
      type: Number,
      min: 1,
      max: 100,
    },
    plannedDuration: {
      type: Number, // seconds
      min: 1,
      max: 3600,
    },
    // Actual completion
    // Actual reps logged by client
    actualReps: [
      {
        type: Number,
        min: 0,
        max: 200,
      },
    ],
    // Weight used (in kg or lbs based on user preference)
    weightUsed: [
      {
        type: Number,
        min: 0,
        max: 1000,
      },
    ],
    // Actual duration for timed exercises
    actualDuration: {
      type: Number, // seconds
      min: 0,
      max: 7200,
    },
    // Status of this exercise
    completed: {
      type: Boolean,
      default: false,
    },
    skipped: {
      type: Boolean,
      default: false,
    },
    skipReason: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    // Client notes for this exercise
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Difficulty rating (1-5)
    difficultyRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { _id: true }
);

const clientWorkoutLogSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client ID is required"],
      index: true,
    },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coach ID is required"],
      index: true,
    },
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoachWorkoutPlan",
      required: [true, "Workout plan ID is required"],
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
    },
    // Scheduled date for this workout
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
      index: true,
    },
    // Day of week (0-6)
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    // Day number in the plan (1-7)
    dayNumber: {
      type: Number,
      min: 1,
      max: 7,
    },
    // Week number in the program
    weekNumber: {
      type: Number,
      min: 1,
      max: 52,
    },
    // Workout session name
    workoutName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Focus area
    focusArea: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Workout status
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "missed", "partial", "rest_day"],
      default: "scheduled",
      index: true,
    },
    // Timing
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    // Exercise logs
    exerciseLogs: [exerciseLogSchema],
    // Summary statistics
    totalExercises: {
      type: Number,
      default: 0,
    },
    completedExercises: {
      type: Number,
      default: 0,
    },
    // Workout duration in minutes
    actualDuration: {
      type: Number,
      min: 0,
      max: 600,
    },
    // Estimated calories burned
    caloriesBurned: {
      type: Number,
      min: 0,
      max: 5000,
    },
    // Overall difficulty rating (1-5)
    overallDifficulty: {
      type: Number,
      min: 1,
      max: 5,
    },
    // Energy level before workout (1-5)
    energyLevel: {
      type: Number,
      min: 1,
      max: 5,
    },
    // Mood after workout (1-5)
    moodAfter: {
      type: Number,
      min: 1,
      max: 5,
    },
    // Client notes
    clientNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    // Coach feedback
    coachFeedback: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    // Whether the coach has reviewed this log
    coachReviewed: {
      type: Boolean,
      default: false,
    },
    coachReviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
clientWorkoutLogSchema.index({ clientId: 1, scheduledDate: -1 });
clientWorkoutLogSchema.index({ clientId: 1, status: 1 });
clientWorkoutLogSchema.index({ clientId: 1, status: 1, scheduledDate: 1 });
clientWorkoutLogSchema.index({ status: 1, scheduledDate: 1 });
clientWorkoutLogSchema.index({ coachId: 1, clientId: 1, scheduledDate: -1 });
clientWorkoutLogSchema.index({ workoutPlanId: 1, scheduledDate: -1 });
clientWorkoutLogSchema.index({ subscriptionId: 1, scheduledDate: -1 });
clientWorkoutLogSchema.index({ createdAt: -1 });

// Pre-save hook to calculate summary statistics
clientWorkoutLogSchema.pre("save", function (next) {
  if (this.exerciseLogs && this.exerciseLogs.length > 0) {
    this.totalExercises = this.exerciseLogs.length;
    this.completedExercises = this.exerciseLogs.filter((e) => e.completed).length;
  } else {
    this.totalExercises = 0;
    this.completedExercises = 0;
  }
  next();
});

// Method to calculate completion percentage
clientWorkoutLogSchema.methods.getCompletionPercentage = function () {
  if (this.totalExercises === 0) return 0;
  return Math.round((this.completedExercises / this.totalExercises) * 100);
};

// Method to mark workout as complete
clientWorkoutLogSchema.methods.markComplete = function () {
  const totalExercises = Array.isArray(this.exerciseLogs) ? this.exerciseLogs.length : 0;
  const completedExercises = Array.isArray(this.exerciseLogs)
    ? this.exerciseLogs.filter((e) => e.completed).length
    : 0;

  // Keep summary fields in sync before status determination.
  this.totalExercises = totalExercises;
  this.completedExercises = completedExercises;

  this.status = completedExercises === totalExercises ? "completed" : "partial";
  this.completedAt = new Date();
  if (this.startedAt) {
    this.actualDuration = Math.round((this.completedAt - this.startedAt) / 60000);
  }
};

const ClientWorkoutLog = mongoose.model("ClientWorkoutLog", clientWorkoutLogSchema);
export default ClientWorkoutLog;
