// src/models/ClientDietLog.js
import mongoose from "mongoose";

/**
 * Client Diet Log Model
 * Tracks client's diet adherence and meal logging
 */

// Sub-schema for logged food items
const loggedFoodSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 50,
    },
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
    // Custom entry (not from library)
    isCustomEntry: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// Sub-schema for logged meals
const loggedMealSchema = new mongoose.Schema(
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
        "other",
      ],
      required: true,
    },
    time: {
      type: Date,
    },
    foods: [loggedFoodSchema],
    // Adherence to planned meal
    adherenceStatus: {
      type: String,
      enum: ["followed", "modified", "skipped", "extra"],
      default: "followed",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Photo of meal (optional)
    photoUrl: {
      type: String,
      trim: true,
    },
    photoPublicId: {
      type: String,
      trim: true,
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

const clientDietLogSchema = new mongoose.Schema(
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
    dietPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoachDietPlan",
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
    },
    // Date of the log (stored as start of day in UTC)
    date: {
      type: Date,
      required: [true, "Log date is required"],
      index: true,
    },
    // Logged meals
    meals: {
      type: [loggedMealSchema],
      default: [],
    },
    // Daily totals (calculated)
    dailyTotals: {
      calories: {
        type: Number,
        min: 0,
        default: 0,
      },
      protein: {
        type: Number,
        min: 0,
        default: 0,
      },
      carbs: {
        type: Number,
        min: 0,
        default: 0,
      },
      fat: {
        type: Number,
        min: 0,
        default: 0,
      },
      fiber: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    // Daily targets (copied from diet plan for comparison)
    dailyTargets: {
      calories: { type: Number },
      protein: { type: Number },
      carbs: { type: Number },
      fat: { type: Number },
    },
    // Water intake for the day (liters)
    waterIntake: {
      type: Number,
      min: 0,
      max: 20,
      default: 0,
    },
    waterGoal: {
      type: Number,
      min: 0,
      max: 20,
    },
    // Overall adherence score (percentage)
    adherenceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    // Overall rating
    overallAdherence: {
      type: String,
      enum: ["excellent", "good", "fair", "poor", "not_logged"],
      default: "not_logged",
    },
    // Hunger levels throughout the day (1-5)
    hungerLevel: {
      morning: { type: Number, min: 1, max: 5 },
      afternoon: { type: Number, min: 1, max: 5 },
      evening: { type: Number, min: 1, max: 5 },
    },
    // Energy levels (1-5)
    energyLevel: {
      type: Number,
      min: 1,
      max: 5,
    },
    // Cravings
    cravings: {
      type: String,
      trim: true,
      maxlength: 500,
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
    // Coach review status
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
clientDietLogSchema.index({ clientId: 1, date: -1 });
clientDietLogSchema.index({ clientId: 1, date: 1 }, { unique: true }); // One log per day per client
clientDietLogSchema.index({ coachId: 1, clientId: 1, date: -1 });
clientDietLogSchema.index({ dietPlanId: 1, date: -1 });
clientDietLogSchema.index({ subscriptionId: 1, date: -1 });
clientDietLogSchema.index({ createdAt: -1 });

// Pre-save hook to calculate totals
clientDietLogSchema.pre("save", function (next) {
  // Calculate meal totals
  if (this.meals && this.meals.length > 0) {
    for (const meal of this.meals) {
      if (meal.foods && meal.foods.length > 0) {
        meal.totalCalories = meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
        meal.totalProtein = meal.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
        meal.totalCarbs = meal.foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
        meal.totalFat = meal.foods.reduce((sum, f) => sum + (f.fat || 0), 0);
      }
    }

    // Calculate daily totals
    this.dailyTotals = {
      calories: this.meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0),
      protein: this.meals.reduce((sum, m) => sum + (m.totalProtein || 0), 0),
      carbs: this.meals.reduce((sum, m) => sum + (m.totalCarbs || 0), 0),
      fat: this.meals.reduce((sum, m) => sum + (m.totalFat || 0), 0),
    };

    // Calculate adherence score if targets are set
    if (this.dailyTargets && this.dailyTargets.calories) {
      const calorieAdherence = Math.min(100, (this.dailyTotals.calories / this.dailyTargets.calories) * 100);
      const proteinAdherence = this.dailyTargets.protein
        ? Math.min(100, (this.dailyTotals.protein / this.dailyTargets.protein) * 100)
        : 100;

      this.adherenceScore = Math.round((calorieAdherence + proteinAdherence) / 2);

      // Set overall adherence rating
      if (this.adherenceScore >= 90) {
        this.overallAdherence = "excellent";
      } else if (this.adherenceScore >= 75) {
        this.overallAdherence = "good";
      } else if (this.adherenceScore >= 50) {
        this.overallAdherence = "fair";
      } else {
        this.overallAdherence = "poor";
      }
    }
  }

  next();
});

// Method to add a meal
clientDietLogSchema.methods.addMeal = function (mealData) {
  this.meals.push(mealData);
  return this;
};

// Method to get calorie deficit/surplus
clientDietLogSchema.methods.getCalorieBalance = function () {
  if (!this.dailyTargets?.calories) return null;
  return this.dailyTotals.calories - this.dailyTargets.calories;
};

const ClientDietLog = mongoose.model("ClientDietLog", clientDietLogSchema);
export default ClientDietLog;
