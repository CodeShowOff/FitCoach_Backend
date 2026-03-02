// src/scripts/seedFoodItems.js
/**
 * Seed script to populate the FoodItem collection with comprehensive food data
 * Run: node src/scripts/seedFoodItems.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import FoodItem from "../models/FoodItem.js";

dotenv.config();

const foodItems = [
  // ============================================
  // PROTEINS - MEAT & POULTRY
  // ============================================
  {
    name: "Chicken Breast (Grilled)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 165,
      protein: 31,
      carbohydrates: 0,
      fat: 3.6,
      fiber: 0,
      sugar: 0
    },
    micronutrients: {
      sodium: 74,
      potassium: 256
    },
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Chicken Thigh (Skinless)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 177,
      protein: 26,
      carbohydrates: 0,
      fat: 8,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Ground Beef (90% Lean)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 176,
      protein: 26,
      carbohydrates: 0,
      fat: 10,
      fiber: 0,
      sugar: 0
    },
    micronutrients: {
      iron: 2.6
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Salmon (Baked)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 208,
      protein: 20,
      carbohydrates: 0,
      fat: 13,
      fiber: 0,
      sugar: 0
    },
    micronutrients: {
      potassium: 363
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Tuna (Canned in Water)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 116,
      protein: 26,
      carbohydrates: 0,
      fat: 0.8,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Shrimp (Cooked)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 99,
      protein: 24,
      carbohydrates: 0.2,
      fat: 0.3,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Turkey Breast (Roasted)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 135,
      protein: 30,
      carbohydrates: 0,
      fat: 0.7,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Pork Tenderloin",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 143,
      protein: 26,
      carbohydrates: 0,
      fat: 3.5,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Lamb Chop (Lean)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 182,
      protein: 25,
      carbohydrates: 0,
      fat: 8,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Tilapia (Baked)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 128,
      protein: 26,
      carbohydrates: 0,
      fat: 2.7,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: false,
    isGlutenFree: true,
    isActive: true
  },

  // ============================================
  // PROTEINS - EGGS & DAIRY
  // ============================================
  {
    name: "Whole Egg (Large)",
    category: "protein",
    servingSize: 50,
    servingUnit: "g",
    nutrition: {
      calories: 78,
      protein: 6,
      carbohydrates: 0.6,
      fat: 5,
      fiber: 0,
      sugar: 0.6
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Egg Whites",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 52,
      protein: 11,
      carbohydrates: 0.7,
      fat: 0.2,
      fiber: 0,
      sugar: 0.7
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Greek Yogurt (Plain, Non-fat)",
    category: "dairy",
    servingSize: 170,
    servingUnit: "g",
    nutrition: {
      calories: 100,
      protein: 17,
      carbohydrates: 6,
      fat: 0.7,
      fiber: 0,
      sugar: 4
    },
    micronutrients: {
      calcium: 187
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Cottage Cheese (Low-fat)",
    category: "dairy",
    servingSize: 113,
    servingUnit: "g",
    nutrition: {
      calories: 81,
      protein: 14,
      carbohydrates: 3,
      fat: 1,
      fiber: 0,
      sugar: 3
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Milk (Whole)",
    category: "dairy",
    servingSize: 240,
    servingUnit: "ml",
    nutrition: {
      calories: 149,
      protein: 8,
      carbohydrates: 12,
      fat: 8,
      fiber: 0,
      sugar: 12
    },
    micronutrients: {
      calcium: 276,
      vitaminD: 3
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Milk (Skim)",
    category: "dairy",
    servingSize: 240,
    servingUnit: "ml",
    nutrition: {
      calories: 83,
      protein: 8,
      carbohydrates: 12,
      fat: 0.2,
      fiber: 0,
      sugar: 12
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Cheddar Cheese",
    category: "dairy",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 113,
      protein: 7,
      carbohydrates: 0.4,
      fat: 9,
      fiber: 0,
      sugar: 0.1
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Mozzarella Cheese (Part-skim)",
    category: "dairy",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 72,
      protein: 7,
      carbohydrates: 0.8,
      fat: 4.5,
      fiber: 0,
      sugar: 0.2
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Paneer (Indian Cottage Cheese)",
    category: "dairy",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 265,
      protein: 18,
      carbohydrates: 3.6,
      fat: 21,
      fiber: 0,
      sugar: 0
    },
    micronutrients: {
      calcium: 480
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },

  // ============================================
  // PROTEINS - PLANT-BASED
  // ============================================
  {
    name: "Tofu (Firm)",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 76,
      protein: 8,
      carbohydrates: 1.9,
      fat: 4.8,
      fiber: 0.3,
      sugar: 0.5
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Tempeh",
    category: "protein",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 193,
      protein: 19,
      carbohydrates: 9.4,
      fat: 11,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Chickpeas (Cooked)",
    category: "legumes",
    servingSize: 164,
    servingUnit: "g",
    nutrition: {
      calories: 269,
      protein: 14.5,
      carbohydrates: 45,
      fat: 4.2,
      fiber: 12.5,
      sugar: 8
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Black Beans (Cooked)",
    category: "legumes",
    servingSize: 172,
    servingUnit: "g",
    nutrition: {
      calories: 227,
      protein: 15,
      carbohydrates: 41,
      fat: 0.9,
      fiber: 15,
      sugar: 0.6
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Lentils (Cooked)",
    category: "legumes",
    servingSize: 198,
    servingUnit: "g",
    nutrition: {
      calories: 230,
      protein: 18,
      carbohydrates: 40,
      fat: 0.8,
      fiber: 15.6,
      sugar: 3.6
    },
    micronutrients: {
      iron: 6.6,
      potassium: 731
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Kidney Beans (Cooked)",
    category: "legumes",
    servingSize: 177,
    servingUnit: "g",
    nutrition: {
      calories: 225,
      protein: 15,
      carbohydrates: 40,
      fat: 0.9,
      fiber: 11,
      sugar: 0.6
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Edamame (Shelled)",
    category: "legumes",
    servingSize: 155,
    servingUnit: "g",
    nutrition: {
      calories: 188,
      protein: 18.5,
      carbohydrates: 14,
      fat: 8,
      fiber: 8,
      sugar: 3.4
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },

  // ============================================
  // CARBOHYDRATES - GRAINS
  // ============================================
  {
    name: "White Rice (Cooked)",
    category: "grains",
    servingSize: 158,
    servingUnit: "g",
    nutrition: {
      calories: 206,
      protein: 4.3,
      carbohydrates: 45,
      fat: 0.4,
      fiber: 0.6,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Brown Rice (Cooked)",
    category: "grains",
    servingSize: 195,
    servingUnit: "g",
    nutrition: {
      calories: 216,
      protein: 5,
      carbohydrates: 45,
      fat: 1.8,
      fiber: 3.5,
      sugar: 0.7
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Quinoa (Cooked)",
    category: "grains",
    servingSize: 185,
    servingUnit: "g",
    nutrition: {
      calories: 222,
      protein: 8,
      carbohydrates: 39,
      fat: 3.6,
      fiber: 5,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Oatmeal (Cooked)",
    category: "grains",
    servingSize: 234,
    servingUnit: "g",
    nutrition: {
      calories: 158,
      protein: 6,
      carbohydrates: 27,
      fat: 3.2,
      fiber: 4,
      sugar: 1
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Whole Wheat Bread",
    category: "grains",
    servingSize: 43,
    servingUnit: "g",
    nutrition: {
      calories: 91,
      protein: 5,
      carbohydrates: 15,
      fat: 1.4,
      fiber: 2.4,
      sugar: 2.8
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "White Bread",
    category: "grains",
    servingSize: 25,
    servingUnit: "g",
    nutrition: {
      calories: 67,
      protein: 2.3,
      carbohydrates: 13,
      fat: 0.8,
      fiber: 0.6,
      sugar: 1.3
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Pasta (Cooked)",
    category: "grains",
    servingSize: 140,
    servingUnit: "g",
    nutrition: {
      calories: 220,
      protein: 8,
      carbohydrates: 43,
      fat: 1.3,
      fiber: 2.5,
      sugar: 0.8
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Whole Wheat Pasta (Cooked)",
    category: "grains",
    servingSize: 140,
    servingUnit: "g",
    nutrition: {
      calories: 174,
      protein: 7.5,
      carbohydrates: 37,
      fat: 0.8,
      fiber: 6.3,
      sugar: 0.8
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Couscous (Cooked)",
    category: "grains",
    servingSize: 157,
    servingUnit: "g",
    nutrition: {
      calories: 176,
      protein: 6,
      carbohydrates: 36,
      fat: 0.3,
      fiber: 2.2,
      sugar: 0.3
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Barley (Cooked)",
    category: "grains",
    servingSize: 157,
    servingUnit: "g",
    nutrition: {
      calories: 193,
      protein: 3.5,
      carbohydrates: 44,
      fat: 0.7,
      fiber: 6,
      sugar: 0.4
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },

  // ============================================
  // CARBOHYDRATES - INDIAN STAPLES
  // ============================================
  {
    name: "Chapati / Roti",
    category: "grains",
    servingSize: 40,
    servingUnit: "g",
    nutrition: {
      calories: 104,
      protein: 3.1,
      carbohydrates: 18,
      fat: 2.5,
      fiber: 2,
      sugar: 0.4
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Naan (Plain)",
    category: "grains",
    servingSize: 90,
    servingUnit: "g",
    nutrition: {
      calories: 262,
      protein: 9,
      carbohydrates: 45,
      fat: 5,
      fiber: 2,
      sugar: 3
    },
    isVegetarian: true,
    isActive: true
  },
  {
    name: "Paratha (Plain)",
    category: "grains",
    servingSize: 80,
    servingUnit: "g",
    nutrition: {
      calories: 260,
      protein: 5,
      carbohydrates: 32,
      fat: 12,
      fiber: 2,
      sugar: 1
    },
    isVegetarian: true,
    isActive: true
  },
  {
    name: "Basmati Rice (Cooked)",
    category: "grains",
    servingSize: 158,
    servingUnit: "g",
    nutrition: {
      calories: 210,
      protein: 4.4,
      carbohydrates: 46,
      fat: 0.5,
      fiber: 0.6,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Poha (Flattened Rice, Cooked)",
    category: "grains",
    servingSize: 150,
    servingUnit: "g",
    nutrition: {
      calories: 250,
      protein: 5,
      carbohydrates: 50,
      fat: 4,
      fiber: 2,
      sugar: 1
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Upma (Semolina)",
    category: "grains",
    servingSize: 200,
    servingUnit: "g",
    nutrition: {
      calories: 270,
      protein: 6,
      carbohydrates: 40,
      fat: 10,
      fiber: 3,
      sugar: 1
    },
    isVegetarian: true,
    isActive: true
  },
  {
    name: "Idli (2 pieces)",
    category: "grains",
    servingSize: 80,
    servingUnit: "g",
    nutrition: {
      calories: 78,
      protein: 2,
      carbohydrates: 16,
      fat: 0.3,
      fiber: 1,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Dosa (Plain)",
    category: "grains",
    servingSize: 100,
    servingUnit: "g",
    nutrition: {
      calories: 133,
      protein: 4,
      carbohydrates: 22,
      fat: 3.5,
      fiber: 1,
      sugar: 1
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isActive: true
  },

  // ============================================
  // VEGETABLES
  // ============================================
  {
    name: "Broccoli (Steamed)",
    category: "vegetables",
    servingSize: 156,
    servingUnit: "g",
    nutrition: {
      calories: 55,
      protein: 3.7,
      carbohydrates: 11,
      fat: 0.6,
      fiber: 5.1,
      sugar: 2.2
    },
    micronutrients: {
      vitaminC: 135,
      vitaminA: 567
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Spinach (Raw)",
    category: "vegetables",
    servingSize: 30,
    servingUnit: "g",
    nutrition: {
      calories: 7,
      protein: 0.9,
      carbohydrates: 1.1,
      fat: 0.1,
      fiber: 0.7,
      sugar: 0.1
    },
    micronutrients: {
      iron: 0.8,
      vitaminA: 2813,
      vitaminC: 8.4
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Sweet Potato (Baked)",
    category: "vegetables",
    servingSize: 200,
    servingUnit: "g",
    nutrition: {
      calories: 180,
      protein: 4,
      carbohydrates: 41,
      fat: 0.2,
      fiber: 6.6,
      sugar: 13
    },
    micronutrients: {
      vitaminA: 38433
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Potato (Baked with skin)",
    category: "vegetables",
    servingSize: 173,
    servingUnit: "g",
    nutrition: {
      calories: 161,
      protein: 4.3,
      carbohydrates: 37,
      fat: 0.2,
      fiber: 3.8,
      sugar: 1.7
    },
    micronutrients: {
      potassium: 926
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Carrots (Raw)",
    category: "vegetables",
    servingSize: 128,
    servingUnit: "g",
    nutrition: {
      calories: 52,
      protein: 1.2,
      carbohydrates: 12,
      fat: 0.3,
      fiber: 3.6,
      sugar: 6
    },
    micronutrients: {
      vitaminA: 21384
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Bell Pepper (Red)",
    category: "vegetables",
    servingSize: 149,
    servingUnit: "g",
    nutrition: {
      calories: 46,
      protein: 1.5,
      carbohydrates: 9,
      fat: 0.4,
      fiber: 3.1,
      sugar: 6.3
    },
    micronutrients: {
      vitaminC: 190
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Tomato (Raw)",
    category: "vegetables",
    servingSize: 182,
    servingUnit: "g",
    nutrition: {
      calories: 33,
      protein: 1.6,
      carbohydrates: 7.1,
      fat: 0.4,
      fiber: 2.2,
      sugar: 4.8
    },
    micronutrients: {
      vitaminC: 25
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Cucumber",
    category: "vegetables",
    servingSize: 104,
    servingUnit: "g",
    nutrition: {
      calories: 16,
      protein: 0.7,
      carbohydrates: 3.8,
      fat: 0.1,
      fiber: 0.5,
      sugar: 1.7
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Cauliflower (Raw)",
    category: "vegetables",
    servingSize: 107,
    servingUnit: "g",
    nutrition: {
      calories: 27,
      protein: 2.1,
      carbohydrates: 5.3,
      fat: 0.3,
      fiber: 2.1,
      sugar: 2
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Green Beans (Cooked)",
    category: "vegetables",
    servingSize: 125,
    servingUnit: "g",
    nutrition: {
      calories: 44,
      protein: 2.4,
      carbohydrates: 10,
      fat: 0.4,
      fiber: 4,
      sugar: 3.3
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Asparagus (Cooked)",
    category: "vegetables",
    servingSize: 180,
    servingUnit: "g",
    nutrition: {
      calories: 40,
      protein: 4.3,
      carbohydrates: 7.4,
      fat: 0.4,
      fiber: 3.6,
      sugar: 2.5
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Zucchini (Cooked)",
    category: "vegetables",
    servingSize: 180,
    servingUnit: "g",
    nutrition: {
      calories: 27,
      protein: 2,
      carbohydrates: 5,
      fat: 0.4,
      fiber: 1.8,
      sugar: 3
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Mushrooms (Raw)",
    category: "vegetables",
    servingSize: 96,
    servingUnit: "g",
    nutrition: {
      calories: 21,
      protein: 3,
      carbohydrates: 3.3,
      fat: 0.3,
      fiber: 1,
      sugar: 2
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Onion (Raw)",
    category: "vegetables",
    servingSize: 110,
    servingUnit: "g",
    nutrition: {
      calories: 44,
      protein: 1.2,
      carbohydrates: 10,
      fat: 0.1,
      fiber: 1.9,
      sugar: 4.7
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Kale (Raw)",
    category: "vegetables",
    servingSize: 67,
    servingUnit: "g",
    nutrition: {
      calories: 33,
      protein: 2.2,
      carbohydrates: 6,
      fat: 0.5,
      fiber: 1.3,
      sugar: 0
    },
    micronutrients: {
      vitaminA: 6693,
      vitaminC: 80
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Cabbage (Raw)",
    category: "vegetables",
    servingSize: 89,
    servingUnit: "g",
    nutrition: {
      calories: 22,
      protein: 1.1,
      carbohydrates: 5.2,
      fat: 0.1,
      fiber: 2.2,
      sugar: 2.9
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Lettuce (Iceberg)",
    category: "vegetables",
    servingSize: 72,
    servingUnit: "g",
    nutrition: {
      calories: 10,
      protein: 0.6,
      carbohydrates: 2.1,
      fat: 0.1,
      fiber: 0.9,
      sugar: 1.4
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Eggplant (Cooked)",
    category: "vegetables",
    servingSize: 99,
    servingUnit: "g",
    nutrition: {
      calories: 35,
      protein: 0.8,
      carbohydrates: 9,
      fat: 0.2,
      fiber: 2.5,
      sugar: 3.2
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },

  // ============================================
  // FRUITS
  // ============================================
  {
    name: "Apple (Medium)",
    category: "fruits",
    servingSize: 182,
    servingUnit: "g",
    nutrition: {
      calories: 95,
      protein: 0.5,
      carbohydrates: 25,
      fat: 0.3,
      fiber: 4.4,
      sugar: 19
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Banana (Medium)",
    category: "fruits",
    servingSize: 118,
    servingUnit: "g",
    nutrition: {
      calories: 105,
      protein: 1.3,
      carbohydrates: 27,
      fat: 0.4,
      fiber: 3.1,
      sugar: 14
    },
    micronutrients: {
      potassium: 422
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Orange (Medium)",
    category: "fruits",
    servingSize: 131,
    servingUnit: "g",
    nutrition: {
      calories: 62,
      protein: 1.2,
      carbohydrates: 15,
      fat: 0.2,
      fiber: 3.1,
      sugar: 12
    },
    micronutrients: {
      vitaminC: 70
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Strawberries",
    category: "fruits",
    servingSize: 152,
    servingUnit: "g",
    nutrition: {
      calories: 49,
      protein: 1,
      carbohydrates: 12,
      fat: 0.5,
      fiber: 3,
      sugar: 7.4
    },
    micronutrients: {
      vitaminC: 89
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Blueberries",
    category: "fruits",
    servingSize: 148,
    servingUnit: "g",
    nutrition: {
      calories: 84,
      protein: 1.1,
      carbohydrates: 21,
      fat: 0.5,
      fiber: 3.6,
      sugar: 15
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Grapes",
    category: "fruits",
    servingSize: 151,
    servingUnit: "g",
    nutrition: {
      calories: 104,
      protein: 1.1,
      carbohydrates: 27,
      fat: 0.2,
      fiber: 1.4,
      sugar: 23
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Mango (Sliced)",
    category: "fruits",
    servingSize: 165,
    servingUnit: "g",
    nutrition: {
      calories: 99,
      protein: 1.4,
      carbohydrates: 25,
      fat: 0.6,
      fiber: 2.6,
      sugar: 23
    },
    micronutrients: {
      vitaminC: 60,
      vitaminA: 1785
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Pineapple (Chunks)",
    category: "fruits",
    servingSize: 165,
    servingUnit: "g",
    nutrition: {
      calories: 82,
      protein: 0.9,
      carbohydrates: 22,
      fat: 0.2,
      fiber: 2.3,
      sugar: 16
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Watermelon (Diced)",
    category: "fruits",
    servingSize: 152,
    servingUnit: "g",
    nutrition: {
      calories: 46,
      protein: 0.9,
      carbohydrates: 11,
      fat: 0.2,
      fiber: 0.6,
      sugar: 9.4
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Papaya (Cubed)",
    category: "fruits",
    servingSize: 145,
    servingUnit: "g",
    nutrition: {
      calories: 62,
      protein: 0.7,
      carbohydrates: 16,
      fat: 0.4,
      fiber: 2.5,
      sugar: 11
    },
    micronutrients: {
      vitaminC: 88,
      vitaminA: 1531
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Avocado",
    category: "fruits",
    servingSize: 150,
    servingUnit: "g",
    nutrition: {
      calories: 240,
      protein: 3,
      carbohydrates: 13,
      fat: 22,
      fiber: 10,
      sugar: 1
    },
    micronutrients: {
      potassium: 728
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Peach (Medium)",
    category: "fruits",
    servingSize: 150,
    servingUnit: "g",
    nutrition: {
      calories: 59,
      protein: 1.4,
      carbohydrates: 14,
      fat: 0.4,
      fiber: 2.3,
      sugar: 13
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Pear (Medium)",
    category: "fruits",
    servingSize: 178,
    servingUnit: "g",
    nutrition: {
      calories: 102,
      protein: 0.6,
      carbohydrates: 27,
      fat: 0.2,
      fiber: 5.5,
      sugar: 17
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Pomegranate Seeds",
    category: "fruits",
    servingSize: 87,
    servingUnit: "g",
    nutrition: {
      calories: 72,
      protein: 1.5,
      carbohydrates: 16,
      fat: 1,
      fiber: 3.5,
      sugar: 12
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },

  // ============================================
  // NUTS & SEEDS
  // ============================================
  {
    name: "Almonds (Raw)",
    category: "nuts_seeds",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 164,
      protein: 6,
      carbohydrates: 6,
      fat: 14,
      fiber: 3.5,
      sugar: 1.2
    },
    micronutrients: {
      calcium: 76
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    allergens: ["tree_nuts"],
    isActive: true
  },
  {
    name: "Walnuts",
    category: "nuts_seeds",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 185,
      protein: 4.3,
      carbohydrates: 3.9,
      fat: 18.5,
      fiber: 1.9,
      sugar: 0.7
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    allergens: ["tree_nuts"],
    isActive: true
  },
  {
    name: "Cashews (Raw)",
    category: "nuts_seeds",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 157,
      protein: 5.2,
      carbohydrates: 8.6,
      fat: 12.4,
      fiber: 0.9,
      sugar: 1.7
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    allergens: ["tree_nuts"],
    isActive: true
  },
  {
    name: "Peanuts (Roasted)",
    category: "nuts_seeds",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 161,
      protein: 7.3,
      carbohydrates: 4.6,
      fat: 14,
      fiber: 2.4,
      sugar: 1.2
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    allergens: ["peanuts"],
    isActive: true
  },
  {
    name: "Peanut Butter",
    category: "nuts_seeds",
    servingSize: 32,
    servingUnit: "g",
    nutrition: {
      calories: 188,
      protein: 8,
      carbohydrates: 6,
      fat: 16,
      fiber: 1.9,
      sugar: 3
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    allergens: ["peanuts"],
    isActive: true
  },
  {
    name: "Almond Butter",
    category: "nuts_seeds",
    servingSize: 32,
    servingUnit: "g",
    nutrition: {
      calories: 196,
      protein: 6.8,
      carbohydrates: 6,
      fat: 18,
      fiber: 3.3,
      sugar: 2
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    allergens: ["tree_nuts"],
    isActive: true
  },
  {
    name: "Chia Seeds",
    category: "nuts_seeds",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 138,
      protein: 4.7,
      carbohydrates: 12,
      fat: 8.7,
      fiber: 9.8,
      sugar: 0
    },
    micronutrients: {
      calcium: 177
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Flax Seeds (Ground)",
    category: "nuts_seeds",
    servingSize: 14,
    servingUnit: "g",
    nutrition: {
      calories: 75,
      protein: 2.6,
      carbohydrates: 4,
      fat: 6,
      fiber: 3.8,
      sugar: 0.2
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Pumpkin Seeds",
    category: "nuts_seeds",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 151,
      protein: 7,
      carbohydrates: 5,
      fat: 13,
      fiber: 1.7,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Sunflower Seeds",
    category: "nuts_seeds",
    servingSize: 28,
    servingUnit: "g",
    nutrition: {
      calories: 165,
      protein: 5.5,
      carbohydrates: 6.8,
      fat: 14,
      fiber: 2.4,
      sugar: 0.8
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },

  // ============================================
  // HEALTHY FATS & OILS
  // ============================================
  {
    name: "Olive Oil",
    category: "fats",
    servingSize: 14,
    servingUnit: "ml",
    nutrition: {
      calories: 119,
      protein: 0,
      carbohydrates: 0,
      fat: 13.5,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Coconut Oil",
    category: "fats",
    servingSize: 14,
    servingUnit: "ml",
    nutrition: {
      calories: 121,
      protein: 0,
      carbohydrates: 0,
      fat: 13.5,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Ghee (Clarified Butter)",
    category: "fats",
    servingSize: 14,
    servingUnit: "ml",
    nutrition: {
      calories: 120,
      protein: 0,
      carbohydrates: 0,
      fat: 14,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Butter",
    category: "fats",
    servingSize: 14,
    servingUnit: "g",
    nutrition: {
      calories: 102,
      protein: 0.1,
      carbohydrates: 0,
      fat: 11.5,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },

  // ============================================
  // PROTEIN SUPPLEMENTS
  // ============================================
  {
    name: "Whey Protein Powder (Scoop)",
    category: "supplements",
    servingSize: 30,
    servingUnit: "g",
    nutrition: {
      calories: 120,
      protein: 24,
      carbohydrates: 3,
      fat: 1.5,
      fiber: 0,
      sugar: 2
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Casein Protein Powder (Scoop)",
    category: "supplements",
    servingSize: 33,
    servingUnit: "g",
    nutrition: {
      calories: 120,
      protein: 24,
      carbohydrates: 3,
      fat: 1,
      fiber: 0,
      sugar: 1
    },
    isVegetarian: true,
    isGlutenFree: true,
    isActive: true
  },
  {
    name: "Plant Protein Powder (Pea/Rice)",
    category: "supplements",
    servingSize: 35,
    servingUnit: "g",
    nutrition: {
      calories: 130,
      protein: 22,
      carbohydrates: 5,
      fat: 2.5,
      fiber: 2,
      sugar: 1
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },

  // ============================================
  // BEVERAGES
  // ============================================
  {
    name: "Black Coffee",
    category: "beverages",
    servingSize: 240,
    servingUnit: "ml",
    nutrition: {
      calories: 2,
      protein: 0.3,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Green Tea",
    category: "beverages",
    servingSize: 240,
    servingUnit: "ml",
    nutrition: {
      calories: 2,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Orange Juice (Fresh)",
    category: "beverages",
    servingSize: 240,
    servingUnit: "ml",
    nutrition: {
      calories: 112,
      protein: 1.7,
      carbohydrates: 26,
      fat: 0.5,
      fiber: 0.5,
      sugar: 21
    },
    micronutrients: {
      vitaminC: 124
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Coconut Water",
    category: "beverages",
    servingSize: 240,
    servingUnit: "ml",
    nutrition: {
      calories: 46,
      protein: 1.7,
      carbohydrates: 9,
      fat: 0.5,
      fiber: 2.6,
      sugar: 6
    },
    micronutrients: {
      potassium: 600
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Almond Milk (Unsweetened)",
    category: "beverages",
    servingSize: 240,
    servingUnit: "ml",
    nutrition: {
      calories: 30,
      protein: 1,
      carbohydrates: 1,
      fat: 2.5,
      fiber: 0,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    allergens: ["tree_nuts"],
    isActive: true
  },

  // ============================================
  // CONDIMENTS & EXTRAS
  // ============================================
  {
    name: "Honey",
    category: "condiments",
    servingSize: 21,
    servingUnit: "g",
    nutrition: {
      calories: 64,
      protein: 0.1,
      carbohydrates: 17,
      fat: 0,
      fiber: 0,
      sugar: 17
    },
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Maple Syrup (Pure)",
    category: "condiments",
    servingSize: 20,
    servingUnit: "ml",
    nutrition: {
      calories: 52,
      protein: 0,
      carbohydrates: 13,
      fat: 0,
      fiber: 0,
      sugar: 12
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Hummus",
    category: "condiments",
    servingSize: 30,
    servingUnit: "g",
    nutrition: {
      calories: 50,
      protein: 2,
      carbohydrates: 4,
      fat: 3,
      fiber: 1,
      sugar: 0
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Salsa",
    category: "condiments",
    servingSize: 30,
    servingUnit: "g",
    nutrition: {
      calories: 10,
      protein: 0.5,
      carbohydrates: 2,
      fat: 0,
      fiber: 0.5,
      sugar: 1
    },
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isActive: true
  },
  {
    name: "Soy Sauce (Low Sodium)",
    category: "condiments",
    servingSize: 15,
    servingUnit: "ml",
    nutrition: {
      calories: 10,
      protein: 1,
      carbohydrates: 1,
      fat: 0,
      fiber: 0,
      sugar: 0
    },
    micronutrients: {
      sodium: 575
    },
    isVegetarian: true,
    isVegan: true,
    isDairyFree: true,
    isActive: true
  }
];

async function seedFoodItems() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/fitcoach";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check existing count
    const existingCount = await FoodItem.countDocuments();
    console.log(`📊 Current food items in database: ${existingCount}`);

    if (existingCount > 0) {
      const response = await new Promise((resolve) => {
        process.stdout.write("⚠️  Database already has food items. Do you want to add more? (y/n): ");
        process.stdin.once("data", (data) => resolve(data.toString().trim().toLowerCase()));
      });
      
      if (response !== "y") {
        console.log("❌ Seeding cancelled");
        process.exit(0);
      }
    }

    // Insert food items (skip duplicates by name)
    let added = 0;
    let skipped = 0;

    for (const foodItem of foodItems) {
      const exists = await FoodItem.findOne({ name: foodItem.name });
      if (exists) {
        skipped++;
        continue;
      }
      await FoodItem.create(foodItem);
      added++;
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Added: ${added} food items`);
    console.log(`   Skipped (duplicates): ${skipped} food items`);
    console.log(`   Total in database: ${await FoodItem.countDocuments()}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding food items:", error);
    process.exit(1);
  }
}

seedFoodItems();
