// src/controllers/foodItem.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import FoodItem from "../models/FoodItem.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const categoryEnum = [
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
];

const allergenEnum = [
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
];

const nutritionSchema = Joi.object({
  calories: Joi.number().min(0).optional(),
  protein: Joi.number().min(0).optional(),
  carbohydrates: Joi.number().min(0).optional(),
  fat: Joi.number().min(0).optional(),
  fiber: Joi.number().min(0).optional(),
  sugar: Joi.number().min(0).optional(),
  sodium: Joi.number().min(0).optional(),
  cholesterol: Joi.number().min(0).optional(),
  saturatedFat: Joi.number().min(0).optional(),
  transFat: Joi.number().min(0).optional(),
});

const micronutrientsSchema = Joi.object({
  vitaminA: Joi.number().min(0).optional(),
  vitaminB: Joi.number().min(0).optional(),
  vitaminC: Joi.number().min(0).optional(),
  vitaminD: Joi.number().min(0).optional(),
  vitaminE: Joi.number().min(0).optional(),
  vitaminK: Joi.number().min(0).optional(),
  iron: Joi.number().min(0).optional(),
  calcium: Joi.number().min(0).optional(),
  magnesium: Joi.number().min(0).optional(),
  potassium: Joi.number().min(0).optional(),
  zinc: Joi.number().min(0).optional(),
  phosphorus: Joi.number().min(0).optional(),
});

const createFoodItemSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(1000).optional().allow("", null),
  category: Joi.string()
    .valid(...categoryEnum)
    .required(),
  subcategory: Joi.string().max(100).optional().allow("", null),
  servingSize: Joi.number().min(0).required(),
  servingUnit: Joi.string().max(50).default("g"),
  servingDescription: Joi.string().max(100).optional().allow("", null),
  nutrition: nutritionSchema.optional(),
  micronutrients: micronutrientsSchema.optional(),
  isVegetarian: Joi.boolean().default(false),
  isVegan: Joi.boolean().default(false),
  isGlutenFree: Joi.boolean().default(false),
  isDairyFree: Joi.boolean().default(false),
  isNutFree: Joi.boolean().default(false),
  isLowCarb: Joi.boolean().default(false),
  isHighProtein: Joi.boolean().default(false),
  isKeto: Joi.boolean().default(false),
  allergens: Joi.array()
    .items(Joi.string().valid(...allergenEnum))
    .optional(),
  cuisine: Joi.string().max(100).optional().allow("", null),
  imageUrl: Joi.string().uri().optional().allow("", null),
  imagePublicId: Joi.string().optional().allow("", null),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  dataSource: Joi.string().max(200).optional().allow("", null),
  isActive: Joi.boolean().default(true),
});

const updateFoodItemSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  description: Joi.string().max(1000).optional().allow("", null),
  category: Joi.string()
    .valid(...categoryEnum)
    .optional(),
  subcategory: Joi.string().max(100).optional().allow("", null),
  servingSize: Joi.number().min(0).optional(),
  servingUnit: Joi.string().max(50).optional(),
  servingDescription: Joi.string().max(100).optional().allow("", null),
  nutrition: nutritionSchema.optional(),
  micronutrients: micronutrientsSchema.optional(),
  isVegetarian: Joi.boolean().optional(),
  isVegan: Joi.boolean().optional(),
  isGlutenFree: Joi.boolean().optional(),
  isDairyFree: Joi.boolean().optional(),
  isNutFree: Joi.boolean().optional(),
  isLowCarb: Joi.boolean().optional(),
  isHighProtein: Joi.boolean().optional(),
  isKeto: Joi.boolean().optional(),
  allergens: Joi.array()
    .items(Joi.string().valid(...allergenEnum))
    .optional(),
  cuisine: Joi.string().max(100).optional().allow("", null),
  imageUrl: Joi.string().uri().optional().allow("", null),
  imagePublicId: Joi.string().optional().allow("", null),
  alternatives: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  dataSource: Joi.string().max(200).optional().allow("", null),
  isActive: Joi.boolean().optional(),
});

// ------------------------------
// ➕ @desc Create a new food item
// @route POST /api/v1/food-items
// @access Private (Admin only)
// ------------------------------
export const createFoodItem = asyncHandler(async (req, res) => {
  const { error, value } = createFoodItemSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Determine if this is a custom food item (created by coach) or global (created by admin)
  const isCustom = req.user.role === "coach";

  const foodItem = await FoodItem.create({
    ...value,
    createdBy: req.user._id,
    isCustom,
  });

  res.status(201).json({
    success: true,
    message: `${isCustom ? "Custom" : "Global"} food item created successfully`,
    data: foodItem,
  });
});

// ------------------------------
// 📋 @desc Get all food items (paginated, filterable)
// @route GET /api/v1/food-items
// @access Private (Admin, Coach, Client)
// ------------------------------
export const getFoodItems = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const {
    search,
    category,
    isVegetarian,
    isVegan,
    isGlutenFree,
    cuisine,
    isActive,
    sortBy,
  } = req.query;

  const query = {};

  // Show food items based on user role:
  // - Admin: Can see all food items (global and all custom)
  // - Coach: Can see global food items + their own custom food items
  // - Client: Can see global food items + their coach's custom food items
  if (req.user?.role === "admin") {
    // Admin sees everything
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
  } else if (req.user?.role === "coach") {
    // Coach sees global food items + their own custom food items
    query.$or = [
      { isCustom: false, isActive: true }, // Global food items
      { isCustom: true, createdBy: req.user._id }, // Own custom food items
    ];
  } else if (req.user?.role === "client") {
    // Client sees global food items + their coach's custom food items
    const coachId = req.user.assignedCoach;
    if (coachId) {
      query.$or = [
        { isCustom: false, isActive: true }, // Global food items
        { isCustom: true, createdBy: coachId, isActive: true }, // Coach's custom food items
      ];
    } else {
      // No assigned coach, only global food items
      query.isCustom = false;
      query.isActive = true;
    }
  } else {
    // Default: only global active food items
    query.isCustom = false;
    query.isActive = true;
  }

  // Additional filters
  const additionalFilters = {};

  if (category) {
    additionalFilters.category = category;
  }

  if (isVegetarian !== undefined) {
    additionalFilters.isVegetarian = isVegetarian === "true";
  }

  if (isVegan !== undefined) {
    additionalFilters.isVegan = isVegan === "true";
  }

  if (isGlutenFree !== undefined) {
    additionalFilters.isGlutenFree = isGlutenFree === "true";
  }

  if (cuisine) {
    additionalFilters.cuisine = { $regex: cuisine, $options: "i" };
  }

  // Merge additional filters with main query
  Object.assign(query, additionalFilters);

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

  // Sort options
  let sort = { isCustom: 1, name: 1 }; // Global items first, then custom
  if (sortBy === "calories") sort = { isCustom: 1, "nutrition.calories": 1 };
  if (sortBy === "protein") sort = { isCustom: 1, "nutrition.protein": -1 };
  if (sortBy === "popular") sort = { isCustom: 1, usageCount: -1 };
  if (sortBy === "newest") sort = { isCustom: 1, createdAt: -1 };

  const [foodItems, total] = await Promise.all([
    FoodItem.find(query)
      .select("-__v")
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .populate("createdBy", "name"),
    FoodItem.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: foodItems,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// 🔍 @desc Get food item by ID
// @route GET /api/v1/food-items/:id
// @access Private (Admin, Coach, Client)
// ------------------------------
export const getFoodItemById = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (req.user?.role !== "admin") {
    query.isActive = true;
  }

  const foodItem = await FoodItem.findOne(query).populate(
    "alternatives",
    "name nutrition.calories nutrition.protein servingSize servingUnit"
  );

  if (!foodItem) {
    res.status(404);
    throw new Error("Food item not found");
  }

  res.json({
    success: true,
    data: foodItem,
  });
});

// ------------------------------
// ✏️ @desc Update food item
// @route PATCH /api/v1/food-items/:id
// @access Private (Admin for all, Coach for own custom food items)
// ------------------------------
export const updateFoodItem = asyncHandler(async (req, res) => {
  const { error, value } = updateFoodItemSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const foodItem = await FoodItem.findById(req.params.id);

  if (!foodItem) {
    res.status(404);
    throw new Error("Food item not found");
  }

  // Authorization: Admin can update all, Coach can only update their own custom food items
  if (req.user.role === "coach") {
    if (!foodItem.isCustom || foodItem.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only update your own custom food items");
    }
  } else if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to update food items");
  }

  Object.assign(foodItem, value);
  await foodItem.save();

  res.json({
    success: true,
    message: "Food item updated successfully",
    data: foodItem,
  });
});

// ------------------------------
// 🗑️ @desc Delete food item (soft delete)
// @route DELETE /api/v1/food-items/:id
// @access Private (Admin for all, Coach for own custom food items)
// ------------------------------
export const deleteFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await FoodItem.findById(req.params.id);

  if (!foodItem) {
    res.status(404);
    throw new Error("Food item not found");
  }

  // Authorization: Admin can delete all, Coach can only delete their own custom food items
  if (req.user.role === "coach") {
    if (!foodItem.isCustom || foodItem.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only delete your own custom food items");
    }
  } else if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to delete food items");
  }

  foodItem.isActive = false;
  await foodItem.save();

  res.json({
    success: true,
    message: "Food item deleted successfully",
  });
});

// ------------------------------
// 📊 @desc Get food item categories and metadata
// @route GET /api/v1/food-items/metadata
// @access Private (Admin, Coach, Client)
// ------------------------------
export const getFoodItemMetadata = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      categories: categoryEnum,
      allergens: allergenEnum,
      dietaryFilters: [
        "isVegetarian",
        "isVegan",
        "isGlutenFree",
        "isDairyFree",
        "isNutFree",
        "isLowCarb",
        "isHighProtein",
        "isKeto",
      ],
    },
  });
});

// ------------------------------
// 📦 @desc Bulk create food items
// @route POST /api/v1/food-items/bulk
// @access Private (Admin only)
// ------------------------------
export const bulkCreateFoodItems = asyncHandler(async (req, res) => {
  const { foods } = req.body;

  if (!Array.isArray(foods) || foods.length === 0) {
    res.status(400);
    throw new Error("Please provide an array of food items");
  }

  if (foods.length > 500) {
    res.status(400);
    throw new Error("Maximum 500 food items can be created at once");
  }

  const validatedFoods = [];
  const errors = [];

  for (let i = 0; i < foods.length; i++) {
    const { error, value } = createFoodItemSchema.validate(foods[i]);
    if (error) {
      errors.push({ index: i, error: error.details[0].message });
    } else {
      validatedFoods.push({
        ...value,
        createdBy: req.user._id,
      });
    }
  }

  if (errors.length > 0 && errors.length === foods.length) {
    res.status(400);
    throw new Error(`All items have validation errors: ${JSON.stringify(errors.slice(0, 5))}`);
  }

  const created = await FoodItem.insertMany(validatedFoods, { ordered: false });

  res.status(201).json({
    success: true,
    message: `${created.length} food items created successfully`,
    data: {
      created: created.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 10),
    },
  });
});

// ------------------------------
// 📥 @desc Import Indian foods from JSON
// @route POST /api/v1/food-items/import-indian
// @access Private (Admin only)
// ------------------------------
export const importIndianFoods = asyncHandler(async (req, res) => {
  const { foods } = req.body;

  if (!Array.isArray(foods) || foods.length === 0) {
    res.status(400);
    throw new Error("Please provide an array of Indian food items");
  }

  // Transform Indian foods JSON format to FoodItem format
  const transformedFoods = foods.map((food) => ({
    name: food.name,
    category: mapIndianCategory(food.category),
    servingSize: food.serving_size_g || 100,
    servingUnit: "g",
    nutrition: {
      calories: food.calories_kcal,
      protein: food.protein_g,
      carbohydrates: food.carbs_g,
      fat: food.fat_g,
      fiber: food.fiber_g,
      sugar: food.sugar_g,
      sodium: food.sodium_mg,
    },
    micronutrients: {
      vitaminA: food.vitamin_A_ug,
      vitaminB: food.vitamin_B_mg,
      vitaminC: food.vitamin_C_mg,
      vitaminD: food.vitamin_D_IU,
      vitaminE: food.vitamin_E_mg,
      vitaminK: food.vitamin_K_ug,
      iron: food.iron_mg,
      calcium: food.calcium_mg,
      magnesium: food.magnesium_mg,
      potassium: food.potassium_mg,
      zinc: food.zinc_mg,
    },
    isVegetarian: food.vegetarian === true,
    cuisine: "Indian",
    dataSource: "indianFoods.json",
    isActive: true,
    createdBy: req.user._id,
  }));

  const created = await FoodItem.insertMany(transformedFoods, { ordered: false });

  res.status(201).json({
    success: true,
    message: `${created.length} Indian food items imported successfully`,
    data: {
      imported: created.length,
    },
  });
});

// Helper function to map Indian food categories
function mapIndianCategory(category) {
  const categoryMap = {
    lentil: "lentil",
    vegetable: "vegetables",
    grain: "grains",
    protein: "protein",
    dairy: "dairy",
    snack: "snacks",
    sweet: "sweets",
    beverage: "beverages",
    fruit: "fruits",
    meat: "meat",
    seafood: "seafood",
    egg: "eggs",
  };
  return categoryMap[category?.toLowerCase()] || "other";
}
