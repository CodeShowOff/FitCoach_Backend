// src/models/DietTemplate.js
import mongoose from "mongoose";

/**
 * Global Diet Template Model
 * Admin-managed pre-built diet plans that coaches can clone and customize
 */

// Sub-schema for food items in a meal
const templateFoodSchema = new mongoose.Schema(
  {
    foodItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodItem",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.1,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "g",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false }
);

// Sub-schema for a meal
const templateMealSchema = new mongoose.Schema(
  {
    mealType: {
      type: String,
      enum: [
        "breakfast",
        "mid_morning_snack",
        "lunch",
        "afternoon_snack",
        "evening_snack",
        "dinner",
        "pre_workout",
        "post_workout",
        "bedtime_snack",
      ],
      required: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    time: {
      type: String,
      trim: true,
      maxlength: 20, // e.g., "8:00 AM"
    },
    foods: [templateFoodSchema],
    alternatives: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodItem",
      },
    ],
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Calculated totals for this meal
    totalCalories: {
      type: Number,
      min: 0,
    },
    totalProtein: {
      type: Number,
      min: 0,
    },
    totalCarbs: {
      type: Number,
      min: 0,
    },
    totalFat: {
      type: Number,
      min: 0,
    },
  },
  { _id: true }
);

const dietTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Diet template name is required"],
      trim: true,
      maxlength: 150,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    goal: {
      type: String,
      enum: [
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
      ],
      required: true,
      index: true,
    },
    // Daily macro targets
    dailyTargets: {
      calories: {
        type: Number,
        min: 500,
        max: 10000,
      },
      protein: {
        type: Number,
        min: 0,
        max: 500,
      },
      carbohydrates: {
        type: Number,
        min: 0,
        max: 1000,
      },
      fat: {
        type: Number,
        min: 0,
        max: 500,
      },
      fiber: {
        type: Number,
        min: 0,
        max: 100,
      },
      water: {
        type: Number, // liters
        min: 0,
        max: 10,
      },
    },
    // Number of meals per day
    mealsPerDay: {
      type: Number,
      default: 4,
      min: 1,
      max: 8,
    },
    // Sample daily meals (for single day template)
    sampleMeals: [templateMealSchema],
    // Weekly diet schedule (for day-wise template)
    weeklySchedule: [
      {
        dayOfWeek: {
          type: Number,
          min: 0,
          max: 6,
        },
        dayNumber: {
          type: Number,
          min: 1,
          max: 7,
        },
        dayName: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        meals: [templateMealSchema],
        notes: {
          type: String,
          trim: true,
          maxlength: 500,
        },
      },
    ],
    // Days per week
    daysPerWeek: {
      type: Number,
      default: 7,
      min: 1,
      max: 7,
    },
    // Dietary restrictions
    dietaryType: {
      type: String,
      enum: ["any", "vegetarian", "vegan", "pescatarian", "keto", "paleo", "halal", "kosher"],
      default: "any",
      index: true,
    },
    // Foods to avoid
    foodsToAvoid: [
      {
        type: String,
        trim: true,
        maxlength: 100,
      },
    ],
    // Recommended foods
    recommendedFoods: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodItem",
      },
    ],
    // Tips and guidelines
    guidelines: [
      {
        type: String,
        trim: true,
        maxlength: 500,
      },
    ],
    // Thumbnail
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    thumbnailPublicId: {
      type: String,
      trim: true,
    },
    // Tags
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    // Difficulty to follow
    difficulty: {
      type: String,
      enum: ["easy", "moderate", "challenging"],
      default: "moderate",
    },
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
dietTemplateSchema.index({ name: "text", description: "text", tags: "text" });
dietTemplateSchema.index({ goal: 1, dietaryType: 1, isActive: 1 });
dietTemplateSchema.index({ isFeatured: 1, isActive: 1 });
dietTemplateSchema.index({ usageCount: -1 });
dietTemplateSchema.index({ createdAt: -1 });

const DietTemplate = mongoose.model("DietTemplate", dietTemplateSchema);
export default DietTemplate;
