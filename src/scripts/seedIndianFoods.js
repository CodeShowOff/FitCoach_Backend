import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import FoodItem from "../models/FoodItem.js";
import User from "../models/User.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDIAN_DATA_SOURCE = "indianFoods.json";
const INDIAN_FOODS_PATH = path.resolve(__dirname, "../data/indianFoods.json");

const categoryMap = {
  lentil: "lentil",
  vegetable: "vegetables",
  paneer: "dairy",
  snack: "snacks",
  bread: "grains",
  rice: "grains",
  mixed: "other",
  meat: "meat",
  seafood: "seafood",
  egg: "eggs",
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapCategory = (category) => {
  const key = String(category || "").trim().toLowerCase();
  return categoryMap[key] || "other";
};

const buildTags = (subcategory, isVegetarian) => {
  const tags = ["indian", "nutrition-index"];

  if (subcategory) tags.push(String(subcategory).toLowerCase());
  if (isVegetarian === true) tags.push("vegetarian");
  if (isVegetarian === false) tags.push("non-vegetarian");

  return [...new Set(tags)];
};

const mapDishToFoodItem = (dish, createdBy) => {
  const subcategory = String(dish.category || "other").trim().toLowerCase();
  const isVegetarian = dish.vegetarian === true;

  return {
    name: String(dish.name || "").trim(),
    description: `Indian nutrition reference entry for ${dish.name}.`,
    category: mapCategory(subcategory),
    subcategory,
    servingSize: toNumber(dish.serving_size_g, 100),
    servingUnit: "g",
    nutrition: {
      calories: toNumber(dish.calories_kcal),
      protein: toNumber(dish.protein_g),
      carbohydrates: toNumber(dish.carbs_g),
      fat: toNumber(dish.fat_g),
      fiber: toNumber(dish.fiber_g),
      sugar: toNumber(dish.sugar_g),
      sodium: toNumber(dish.sodium_mg),
    },
    micronutrients: {
      vitaminA: toNumber(dish.vitamin_A_ug),
      vitaminB: toNumber(dish.vitamin_B_mg),
      vitaminC: toNumber(dish.vitamin_C_mg),
      vitaminD: toNumber(dish.vitamin_D_IU),
      vitaminE: toNumber(dish.vitamin_E_mg),
      vitaminK: toNumber(dish.vitamin_K_ug),
      iron: toNumber(dish.iron_mg),
      calcium: toNumber(dish.calcium_mg),
      magnesium: toNumber(dish.magnesium_mg),
      potassium: toNumber(dish.potassium_mg),
      zinc: toNumber(dish.zinc_mg),
    },
    isVegetarian,
    isVegan: isVegetarian,
    isGlutenFree: false,
    isDairyFree: false,
    isNutFree: false,
    isLowCarb: toNumber(dish.carbs_g) <= 20,
    isHighProtein: toNumber(dish.protein_g) >= 15,
    cuisine: "Indian",
    tags: buildTags(subcategory, isVegetarian),
    isActive: true,
    isCustom: false,
    createdBy,
    dataSource: INDIAN_DATA_SOURCE,
  };
};

async function getCreatorUserId() {
  const adminUser = await User.findOne({ role: "admin" }).select("_id").lean();
  if (adminUser?._id) {
    return adminUser._id;
  }

  const fallbackUser = await User.findOne({}).select("_id role email").lean();
  if (fallbackUser?._id) {
    console.warn(
      `⚠️ No admin user found. Using fallback user (${fallbackUser.email || fallbackUser.role || "unknown"}) as createdBy.`
    );
    return fallbackUser._id;
  }

  throw new Error("No users found. Create an admin user first (npm run create-admin -- <email> <password>).\n");
}

async function loadIndianFoodsJson() {
  const raw = await fs.readFile(INDIAN_FOODS_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid indianFoods.json format: expected an array");
  }

  return parsed;
}

async function seedIndianFoods() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/fitcoach";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const [rawFoods, createdBy] = await Promise.all([
      loadIndianFoodsJson(),
      getCreatorUserId(),
    ]);

    const normalizedFoods = rawFoods
      .map((dish) => mapDishToFoodItem(dish, createdBy))
      .filter((dish) => dish.name.length > 0);

    const operations = normalizedFoods.map((dish) => ({
      updateOne: {
        filter: {
          name: dish.name,
          dataSource: INDIAN_DATA_SOURCE,
        },
        update: { $set: dish },
        upsert: true,
      },
    }));

    const result = await FoodItem.bulkWrite(operations, { ordered: false });

    const totalIndianFoods = await FoodItem.countDocuments({
      dataSource: INDIAN_DATA_SOURCE,
      isCustom: false,
      isActive: true,
    });

    console.log("\n✅ Indian foods seed completed");
    console.log(`   Source rows processed: ${operations.length}`);
    console.log(`   Upserted: ${result.upsertedCount || 0}`);
    console.log(`   Updated: ${result.modifiedCount || 0}`);
    console.log(`   Matched existing: ${result.matchedCount || 0}`);
    console.log(`   Total Indian foods in DB: ${totalIndianFoods}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed Indian foods:", error.message || error);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors on exit path
    }
  }
}

seedIndianFoods();
