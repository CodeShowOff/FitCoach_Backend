// src/models/Exercise.js
import mongoose from "mongoose";

/**
 * Global Exercise Library Model
 * Admin-managed library of exercises that coaches can use in workout plans
 */
const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Exercise name is required"],
      trim: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      enum: [
        "strength",
        "cardio",
        "flexibility",
        "yoga",
        "functional",
        "plyometric",
        "calisthenics",
        "stretching",
      ],
      required: [true, "Exercise category is required"],
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    muscleGroups: [
      {
        type: String,
        enum: [
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
        ],
      },
    ],
    equipment: [
      {
        type: String,
        enum: [
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
        ],
      },
    ],
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
      index: true,
    },
    instructions: [
      {
        type: String,
        trim: true,
        maxlength: 500,
      },
    ],
    tips: [
      {
        type: String,
        trim: true,
        maxlength: 300,
      },
    ],
    // Animation/GIF demo
    animationUrl: {
      type: String,
      trim: true,
    },
    animationPublicId: {
      type: String,
      trim: true,
    },
    // Thumbnail for preview
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    thumbnailPublicId: {
      type: String,
      trim: true,
    },
    // Default duration for timed exercises (planks, holds, etc.)
    defaultDuration: {
      type: Number,
      min: 0,
      max: 600, // seconds
    },
    // Default reps for rep-based exercises
    defaultReps: {
      type: Number,
      min: 0,
      max: 100,
    },
    // Default sets
    defaultSets: {
      type: Number,
      min: 1,
      max: 10,
      default: 3,
    },
    // Whether this is a timed exercise (vs rep-based)
    isTimeBased: {
      type: Boolean,
      default: false,
    },
    // Is this a yoga pose/exercise
    isYoga: {
      type: Boolean,
      default: false,
    },
    // Calories burned per minute estimate
    caloriesPerMinute: {
      type: Number,
      min: 0,
      max: 50,
    },
    // Related/alternative exercises
    alternatives: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise",
      },
    ],
    // Tags for search
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    // Admin control
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Custom exercise flag (created by coach for their clients)
    isCustom: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Created by (admin for global, coach for custom)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
exerciseSchema.index({ name: "text", description: "text", tags: "text" });
exerciseSchema.index({ category: 1, muscleGroups: 1, isActive: 1 });
exerciseSchema.index({ category: 1, difficulty: 1, isActive: 1 });
exerciseSchema.index({ equipment: 1, isActive: 1 });
exerciseSchema.index({ isYoga: 1, isActive: 1 });
exerciseSchema.index({ createdAt: -1 });
exerciseSchema.index({ isCustom: 1, createdBy: 1, isActive: 1 });

const Exercise = mongoose.model("Exercise", exerciseSchema);
export default Exercise;
