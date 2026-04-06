import asyncHandler from "express-async-handler";
import FoodItem from "../models/FoodItem.js";

const INDIAN_DATA_SOURCE = "indianFoods.json";

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBooleanQuery = (value) => {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return null;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapFoodToIndianDish = (food) => ({
  name: food.name,
  category: food.subcategory || food.category || "other",
  vegetarian: Boolean(food.isVegetarian),
  calories_kcal: toNumber(food.nutrition?.calories),
  protein_g: toNumber(food.nutrition?.protein),
  carbs_g: toNumber(food.nutrition?.carbohydrates),
  fat_g: toNumber(food.nutrition?.fat),
  fiber_g: toNumber(food.nutrition?.fiber),
  sugar_g: toNumber(food.nutrition?.sugar),
  vitamin_A_ug: toNumber(food.micronutrients?.vitaminA),
  vitamin_B_mg: toNumber(food.micronutrients?.vitaminB),
  vitamin_C_mg: toNumber(food.micronutrients?.vitaminC),
  vitamin_D_IU: toNumber(food.micronutrients?.vitaminD),
  vitamin_E_mg: toNumber(food.micronutrients?.vitaminE),
  vitamin_K_ug: toNumber(food.micronutrients?.vitaminK),
  iron_mg: toNumber(food.micronutrients?.iron),
  calcium_mg: toNumber(food.micronutrients?.calcium),
  magnesium_mg: toNumber(food.micronutrients?.magnesium),
  potassium_mg: toNumber(food.micronutrients?.potassium),
  sodium_mg: toNumber(food.nutrition?.sodium),
  zinc_mg: toNumber(food.micronutrients?.zinc),
  serving_size_g: toNumber(food.servingSize, 100),
});

// ------------------------------
// 🍛 @desc Get Indian nutrition foods (public, paginated)
// @route GET /api/v1/indian-foods
// @access Public
// ------------------------------
export const getIndianFoods = asyncHandler(async (req, res) => {
  const page = Math.max(1, toInt(req.query.page, 1));
  const requestedLimit = toInt(req.query.limit, 50);
  const limit = Math.max(1, Math.min(50, requestedLimit)); // keep payload mobile-friendly
  const skip = (page - 1) * limit;

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const vegFilter = typeof req.query.vegFilter === "string"
    ? req.query.vegFilter
    : typeof req.query.veg === "string"
      ? req.query.veg
      : "all";

  const highProtein = parseBooleanQuery(req.query.highProtein) === true;
  const lowCalorie = parseBooleanQuery(req.query.lowCalorie) === true;

  const query = {
    isActive: true,
    isCustom: false,
    cuisine: { $regex: "^indian$", $options: "i" },
    dataSource: INDIAN_DATA_SOURCE,
  };

  if (vegFilter === "veg") {
    query.isVegetarian = true;
  } else if (vegFilter === "nonveg") {
    query.isVegetarian = false;
  }

  if (highProtein) {
    query["nutrition.protein"] = { $gte: 15 };
  }

  if (lowCalorie) {
    query["nutrition.calories"] = { $lte: 250 };
  }

  if (search) {
    const safeTerm = escapeRegExp(search);
    query.$or = [
      { name: { $regex: safeTerm, $options: "i" } },
      { subcategory: { $regex: safeTerm, $options: "i" } },
      { category: { $regex: safeTerm, $options: "i" } },
    ];
  }

  const [foodItems, total] = await Promise.all([
    FoodItem.find(query)
      .select("name category subcategory servingSize isVegetarian nutrition micronutrients")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodItem.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: foodItems.map(mapFoodToIndianDish),
    pagination: {
      total,
      page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
    },
  });
});
