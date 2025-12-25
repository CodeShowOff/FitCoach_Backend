// src/models/CoachDietPlan.js
import mongoose from "mongoose";

/**
 * Coach Diet Plan Model
 * Coach-customized diet plans that can be assigned to subscription plans
 */

// Sub-schema for food items in a meal
const planFoodSchema = new mongoose.Schema(
  {
    foodItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodItem",
    },
    // Denormalized for quick access
    foodName: {
      type: String,
      trim: true,
      maxlength: 150,
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
    // Pre-calculated nutrition for this serving
    calories: {
      type: Number,
      min: 0,
    },
    protein: {
      type: Number,
      min: 0,
    },
    carbs: {
      type: Number,
      min: 0,
    },
    fat: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: true }
);

// Sub-schema for a meal
const planMealSchema = new mongoose.Schema(
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
      maxlength: 20,
    },
    foods: [planFoodSchema],
    // Alternative food options
    alternatives: [
      {
        foodItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FoodItem",
        },
        foodName: {
          type: String,
          trim: true,
          maxlength: 150,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Calculated totals
    totalCalories: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalProtein: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalCarbs: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalFat: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: true }
);

// Sub-schema for a diet day (similar to workouts)
const dietDaySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      min: 0, // 0 = Sunday, 1 = Monday, etc.
      max: 6,
    },
    dayNumber: {
      type: Number, // Day 1, Day 2, etc.
      min: 1,
      max: 7,
    },
    dayName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    meals: [planMealSchema],
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: true }
);

const coachDietPlanSchema = new mongoose.Schema(
  {
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coach ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Diet plan name is required"],
      trim: true,
      maxlength: 150,
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
        "custom",
      ],
      default: "custom",
      index: true,
    },
    // Link to subscription plans
    subscriptionPlanIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
      },
    ],
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
        type: Number,
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
    // Daily meals structure (DEPRECATED - kept for backward compatibility)
    meals: [planMealSchema],
    // Weekly diet schedule - new day-wise structure
    weeklySchedule: [dietDaySchema],
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
    },
    // Specific restrictions/notes
    dietaryRestrictions: [
      {
        type: String,
        trim: true,
        maxlength: 100,
      },
    ],
    // Allergy notes
    allergyNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Foods to avoid
    foodsToAvoid: [
      {
        type: String,
        trim: true,
        maxlength: 100,
      },
    ],
    // Custom coach instructions
    customInstructions: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    // Supplements recommendation
    supplements: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        dosage: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        timing: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        notes: {
          type: String,
          trim: true,
          maxlength: 300,
        },
      },
    ],
    // If created from a template
    basedOnTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DietTemplate",
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for query performance
coachDietPlanSchema.index({ coachId: 1, isActive: 1 });
coachDietPlanSchema.index({ coachId: 1, subscriptionPlanIds: 1 });
coachDietPlanSchema.index({ subscriptionPlanIds: 1 });
coachDietPlanSchema.index({ coachId: 1, goal: 1 });
coachDietPlanSchema.index({ createdAt: -1 });

// Pre-save hook to calculate meal totals
coachDietPlanSchema.pre("save", function (next) {
  // Handle old structure (backward compatibility)
  if (this.meals && this.meals.length > 0) {
    for (const meal of this.meals) {
      if (meal.foods && meal.foods.length > 0) {
        meal.totalCalories = meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
        meal.totalProtein = meal.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
        meal.totalCarbs = meal.foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
        meal.totalFat = meal.foods.reduce((sum, f) => sum + (f.fat || 0), 0);
      }
    }
  }
  
  // Handle new weekly schedule structure
  if (this.weeklySchedule && this.weeklySchedule.length > 0) {
    for (const day of this.weeklySchedule) {
      if (day.meals && day.meals.length > 0) {
        for (const meal of day.meals) {
          if (meal.foods && meal.foods.length > 0) {
            meal.totalCalories = meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
            meal.totalProtein = meal.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
            meal.totalCarbs = meal.foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
            meal.totalFat = meal.foods.reduce((sum, f) => sum + (f.fat || 0), 0);
          }
        }
      }
    }
  }
  next();
});

// Method to get daily totals (backward compatible)
coachDietPlanSchema.methods.getDailyTotals = function () {
  if (!this.meals || this.meals.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  return {
    calories: this.meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0),
    protein: this.meals.reduce((sum, m) => sum + (m.totalProtein || 0), 0),
    carbs: this.meals.reduce((sum, m) => sum + (m.totalCarbs || 0), 0),
    fat: this.meals.reduce((sum, m) => sum + (m.totalFat || 0), 0),
  };
};

// Method to get meals for a specific day of week
coachDietPlanSchema.methods.getMealsForDay = function (dayOfWeek) {
  // If using new weekly schedule structure
  if (this.weeklySchedule && this.weeklySchedule.length > 0) {
    const daySchedule = this.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    const dayMeals = daySchedule?.meals || [];

    // If weeklySchedule exists but meals are incomplete (e.g. foods missing),
    // merge from legacy `meals` so clients still see suggested items.
    const legacyMeals = this.meals || [];
    if (!Array.isArray(dayMeals) || dayMeals.length === 0) {
      return legacyMeals;
    }

    const legacyByType = new Map(
      (Array.isArray(legacyMeals) ? legacyMeals : []).map((m) => [m.mealType, m])
    );

    return dayMeals.map((m) => {
      const legacy = legacyByType.get(m.mealType);

      const mealObj = typeof m?.toObject === "function" ? m.toObject() : m;
      const legacyObj = legacy && typeof legacy?.toObject === "function" ? legacy.toObject() : legacy;

      const hasFoods = Array.isArray(mealObj?.foods) && mealObj.foods.length > 0;
      const legacyHasFoods = Array.isArray(legacyObj?.foods) && legacyObj.foods.length > 0;

      if (!hasFoods && legacyHasFoods) {
        return {
          ...legacyObj,
          ...mealObj,
          foods: legacyObj.foods,
        };
      }

      return mealObj;
    });
  }
  // Fall back to old structure (same meals every day)
  return this.meals || [];
};

// Virtual field to get today's meals (for convenience)
coachDietPlanSchema.virtual('todaysMeals').get(function() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  return this.getMealsForDay(dayOfWeek);
});

// Method to get totals for a specific day
coachDietPlanSchema.methods.getDayTotals = function (dayOfWeek) {
  const dayMeals = this.getMealsForDay(dayOfWeek);
  if (!dayMeals || dayMeals.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  return {
    calories: dayMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0),
    protein: dayMeals.reduce((sum, m) => sum + (m.totalProtein || 0), 0),
    carbs: dayMeals.reduce((sum, m) => sum + (m.totalCarbs || 0), 0),
    fat: dayMeals.reduce((sum, m) => sum + (m.totalFat || 0), 0),
  };
};

const CoachDietPlan = mongoose.model("CoachDietPlan", coachDietPlanSchema);
export default CoachDietPlan;
