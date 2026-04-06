// src/models/FoodItem.js
import mongoose from "mongoose";

/**
 * Global Food Item Model
 * Admin-managed library of food items that coaches can use in diet plans
 */
const foodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Food name is required"],
      trim: true,
      maxlength: 150,
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
        "protein",
        "carbs",
        "fats",
        "vegetables",
        "fruits",
        "dairy",
        "beverages",
        "snacks",
        "supplements",
        "grains",
        "lentil",
        "legumes",
        "nuts_seeds",
        "seafood",
        "poultry",
        "meat",
        "eggs",
        "sweets",
        "condiments",
        "other",
      ],
      required: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Serving information
    servingSize: {
      type: Number,
      required: true,
      min: 0,
    },
    servingUnit: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "g",
    },
    servingDescription: {
      type: String,
      trim: true,
      maxlength: 100, // e.g., "1 cup", "1 medium bowl"
    },
    // Core nutrition per serving
    nutrition: {
      calories: {
        type: Number,
        min: 0,
      },
      protein: {
        type: Number, // grams
        min: 0,
      },
      carbohydrates: {
        type: Number, // grams
        min: 0,
      },
      fat: {
        type: Number, // grams
        min: 0,
      },
      fiber: {
        type: Number, // grams
        min: 0,
      },
      sugar: {
        type: Number, // grams
        min: 0,
      },
      sodium: {
        type: Number, // mg
        min: 0,
      },
      cholesterol: {
        type: Number, // mg
        min: 0,
      },
      saturatedFat: {
        type: Number, // grams
        min: 0,
      },
      transFat: {
        type: Number, // grams
        min: 0,
      },
    },
    // Micronutrients (optional detailed tracking)
    micronutrients: {
      vitaminA: { type: Number, min: 0 }, // mcg
      vitaminB: { type: Number, min: 0 }, // mg
      vitaminC: { type: Number, min: 0 }, // mg
      vitaminD: { type: Number, min: 0 }, // IU
      vitaminE: { type: Number, min: 0 }, // mg
      vitaminK: { type: Number, min: 0 }, // mcg
      iron: { type: Number, min: 0 }, // mg
      calcium: { type: Number, min: 0 }, // mg
      magnesium: { type: Number, min: 0 }, // mg
      potassium: { type: Number, min: 0 }, // mg
      zinc: { type: Number, min: 0 }, // mg
      phosphorus: { type: Number, min: 0 }, // mg
    },
    // Dietary flags
    isVegetarian: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVegan: {
      type: Boolean,
      default: false,
    },
    isGlutenFree: {
      type: Boolean,
      default: false,
    },
    isDairyFree: {
      type: Boolean,
      default: false,
    },
    isNutFree: {
      type: Boolean,
      default: false,
    },
    isLowCarb: {
      type: Boolean,
      default: false,
    },
    isHighProtein: {
      type: Boolean,
      default: false,
    },
    isKeto: {
      type: Boolean,
      default: false,
    },
    // Allergen information
    allergens: [
      {
        type: String,
        enum: [
          "gluten",
          "dairy",
          "eggs",
          "peanuts",
          "tree_nuts",
          "soy",
          "shellfish",
          "fish",
          "sesame",
          "mustard",
          "celery",
          "lupin",
          "molluscs",
          "sulphites",
        ],
      },
    ],
    // Regional cuisine
    cuisine: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Image
    imageUrl: {
      type: String,
      trim: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
    },
    // Alternative foods (for substitution suggestions)
    alternatives: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodItem",
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
    // Popularity/usage tracking
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
    // Custom food item flag (created by coach for their clients)
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
    // Source of data
    dataSource: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
foodItemSchema.index({ name: "text", description: "text", tags: "text" });
foodItemSchema.index({ category: 1, isActive: 1 });
foodItemSchema.index({ isVegetarian: 1, isActive: 1 });
foodItemSchema.index({ cuisine: 1, isActive: 1 });
foodItemSchema.index({ "nutrition.calories": 1 });
foodItemSchema.index({ "nutrition.protein": -1 });
foodItemSchema.index({ usageCount: -1 });
foodItemSchema.index({ createdAt: -1 });
foodItemSchema.index({ isCustom: 1, createdBy: 1, isActive: 1 });
foodItemSchema.index({ dataSource: 1, isActive: 1, isCustom: 1, name: 1 });
foodItemSchema.index({ dataSource: 1, isVegetarian: 1, "nutrition.protein": -1, "nutrition.calories": 1 });

// Virtual for macros as percentage
foodItemSchema.virtual("macroPercentages").get(function () {
  const protein = this.nutrition?.protein || 0;
  const carbs = this.nutrition?.carbohydrates || 0;
  const fat = this.nutrition?.fat || 0;
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round(((protein * 4) / total) * 100),
    carbs: Math.round(((carbs * 4) / total) * 100),
    fat: Math.round(((fat * 9) / total) * 100),
  };
});

const FoodItem = mongoose.model("FoodItem", foodItemSchema);
export default FoodItem;
