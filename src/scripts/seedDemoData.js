import crypto from "node:crypto";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

import User from "../models/User.js";
import Exercise from "../models/Exercise.js";
import FoodItem from "../models/FoodItem.js";
import ProductTemplate from "../models/ProductTemplate.js";
import Product from "../models/Product.js";
import WorkoutTemplate from "../models/WorkoutTemplate.js";
import DietTemplate from "../models/DietTemplate.js";
import CoachWorkoutPlan from "../models/CoachWorkoutPlan.js";
import CoachDietPlan from "../models/CoachDietPlan.js";
import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import PlanRequest from "../models/PlanRequest.js";
import Order from "../models/Order.js";
import Voucher from "../models/Voucher.js";
import ClientWorkoutLog from "../models/ClientWorkoutLog.js";
import ClientDietLog from "../models/ClientDietLog.js";
import ProgressPhoto from "../models/ProgressPhoto.js";
import WaterIntake from "../models/WaterIntake.js";
import CoachReview from "../models/CoachReview.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import Document from "../models/Document.js";
import Token from "../models/Token.js";
import PlatformSubscription from "../models/PlatformSubscription.js";
import ContactRequest from "../models/ContactRequest.js";
import ContactUs from "../models/ContactUs.js";
import Feedback from "../models/Feedback.js";
import BugReport from "../models/BugReport.js";
import AccountDeletionRequest from "../models/AccountDeletionRequest.js";

dotenv.config({ quiet: true });

const DEMO_TAG = "demo-seed-2026";
const DEMO_EMAIL_DOMAIN = "demo.fitcoach.local";
const DEMO_ADMIN_EMAIL = `admin@${DEMO_EMAIL_DOMAIN}`;
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "DemoPass123!";
const DEMO_DATA_SOURCE = "demo_seed_dataset";
const DEFAULT_COACH_COUNT = 5;
const DEFAULT_CLIENTS_PER_COACH = 50;

const args = process.argv.slice(2);
const argMap = new Map(
  args
    .filter((arg) => arg.includes("="))
    .map((arg) => {
      const [k, ...rest] = arg.split("=");
      return [k.replace(/^--/, ""), rest.join("=")];
    })
);

const hasFlag = (flag) => args.includes(flag);

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const COACH_COUNT = toInt(argMap.get("coaches"), DEFAULT_COACH_COUNT);
const CLIENTS_PER_COACH = toInt(
  argMap.get("clientsPerCoach"),
  DEFAULT_CLIENTS_PER_COACH
);
const KEEP_EXISTING = hasFlag("--keep-existing");

const oneDayMs = 24 * 60 * 60 * 1000;

const imageUrl = (seed, w = 640, h = 420) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

const publicId = (prefix, seed) => `${DEMO_TAG}/${prefix}/${seed}`;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const sample = (arr, count) => {
  if (count >= arr.length) return [...arr];
  const clone = [...arr];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(Math.random() * clone.length);
    out.push(clone[idx]);
    clone.splice(idx, 1);
  }
  return out;
};

const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const daysAgo = (days, hour = 9) => {
  const d = new Date(Date.now() - days * oneDayMs);
  d.setHours(hour, randInt(0, 59), 0, 0);
  return d;
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const COACH_NAME_POOL = [
  "Aarav Sharma",
  "Riya Patel",
  "Arjun Mehta",
  "Sneha Kapoor",
  "Vikram Singh",
  "Neha Verma",
  "Rohan Gupta",
  "Priya Nair",
  "Karan Malhotra",
  "Ananya Iyer",
];

const CLIENT_FIRST_NAME_POOL = [
  "Aditi",
  "Rahul",
  "Pooja",
  "Kunal",
  "Meera",
  "Sahil",
  "Ishita",
  "Yash",
  "Nidhi",
  "Aditya",
  "Kavya",
  "Varun",
  "Simran",
  "Dev",
  "Ritika",
  "Manav",
  "Tanvi",
  "Harsh",
  "Sanya",
  "Nikhil",
];

const CLIENT_LAST_NAME_POOL = [
  "Sharma",
  "Patel",
  "Verma",
  "Gupta",
  "Yadav",
  "Nair",
  "Reddy",
  "Khan",
  "Joshi",
  "Chopra",
  "Mishra",
  "Kulkarni",
  "Bansal",
  "Saxena",
  "Pillai",
];

const nameFromPool = (pool, index) => pool[index % pool.length];

function buildClientName(coachIndex, clientIndex) {
  const first = nameFromPool(
    CLIENT_FIRST_NAME_POOL,
    clientIndex + coachIndex * 3
  );
  const last = nameFromPool(
    CLIENT_LAST_NAME_POOL,
    clientIndex * 2 + coachIndex
  );
  return `${first} ${last}`;
}

function historyPoints(base, variance, entries = 6) {
  return Array.from({ length: entries }, (_, i) => ({
    value: Number((base + (Math.random() * variance - variance / 2)).toFixed(1)),
    date: daysAgo((entries - i) * 7),
  }));
}

function progressNotes() {
  const notePool = [
    "Energy improving week by week.",
    "Sleep quality is better than last check-in.",
    "Staying consistent with workouts.",
    "Hydration goal achieved most days.",
    "Strength numbers are trending up.",
  ];
  return Array.from({ length: 4 }, (_, i) => ({
    text: notePool[i % notePool.length],
    date: daysAgo((4 - i) * 10),
  }));
}

function buildWaterLogs(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const dateRef = daysAgo(days - i);
    const dateKey = dateRef.toISOString().slice(0, 10);
    const entries = Array.from({ length: randInt(3, 6) }, (_, idx) => {
      const amount = Number((Math.random() * 0.35 + 0.2).toFixed(2));
      const t = new Date(dateRef);
      t.setHours(7 + idx * 3, randInt(0, 50), 0, 0);
      return {
        amount,
        time: t,
        notes: idx === 0 ? "Morning hydration" : undefined,
      };
    });
    const totalAmount = Number(
      entries.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
    );
    return {
      date: dateKey,
      entries,
      totalAmount,
    };
  });
}

async function cleanupExistingDemoData() {
  const demoUsers = await User.find({
    email: { $regex: `@${DEMO_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`, $options: "i" },
  })
    .select("_id")
    .lean();

  const demoUserIds = demoUsers.map((u) => u._id);
  const conversationIds = demoUserIds.length
    ? (
        await Conversation.find({
          $or: [
            { coachId: { $in: demoUserIds } },
            { clientId: { $in: demoUserIds } },
            { name: { $regex: DEMO_TAG, $options: "i" } },
          ],
        })
          .select("_id")
          .lean()
      ).map((c) => c._id)
    : [];

  const ops = [
    AccountDeletionRequest.deleteMany({ userId: { $in: demoUserIds } }),
    Token.deleteMany({ userId: { $in: demoUserIds } }),
    PlatformSubscription.deleteMany({ userId: { $in: demoUserIds } }),
    Notification.deleteMany({
      $or: [
        { recipientId: { $in: demoUserIds } },
        { senderId: { $in: demoUserIds } },
        { message: { $regex: DEMO_TAG, $options: "i" } },
      ],
    }),
    Document.deleteMany({ userId: { $in: demoUserIds } }),
    ProgressPhoto.deleteMany({
      $or: [{ clientId: { $in: demoUserIds } }, { coachId: { $in: demoUserIds } }],
    }),
    WaterIntake.deleteMany({
      $or: [{ clientId: { $in: demoUserIds } }, { coachId: { $in: demoUserIds } }],
    }),
    ClientDietLog.deleteMany({
      $or: [{ clientId: { $in: demoUserIds } }, { coachId: { $in: demoUserIds } }],
    }),
    ClientWorkoutLog.deleteMany({
      $or: [{ clientId: { $in: demoUserIds } }, { coachId: { $in: demoUserIds } }],
    }),
    CoachReview.deleteMany({
      $or: [{ coach: { $in: demoUserIds } }, { client: { $in: demoUserIds } }],
    }),
    Voucher.deleteMany({ coachId: { $in: demoUserIds } }),
    Order.deleteMany({
      $or: [{ clientId: { $in: demoUserIds } }, { coachId: { $in: demoUserIds } }],
    }),
    PlanRequest.deleteMany({
      $or: [{ clientId: { $in: demoUserIds } }, { coachId: { $in: demoUserIds } }],
    }),
    Subscription.deleteMany({
      $or: [{ clientId: { $in: demoUserIds } }, { coachId: { $in: demoUserIds } }],
    }),
    Product.deleteMany({ coachId: { $in: demoUserIds } }),
    Plan.deleteMany({ coachId: { $in: demoUserIds } }),
    CoachWorkoutPlan.deleteMany({ coachId: { $in: demoUserIds } }),
    CoachDietPlan.deleteMany({ coachId: { $in: demoUserIds } }),
    ContactRequest.deleteMany({ coachId: { $in: demoUserIds } }),
    ContactUs.deleteMany({ message: { $regex: DEMO_TAG, $options: "i" } }),
    Feedback.deleteMany({ message: { $regex: DEMO_TAG, $options: "i" } }),
    BugReport.deleteMany({ description: { $regex: DEMO_TAG, $options: "i" } }),
  ];

  if (conversationIds.length) {
    ops.push(
      Message.deleteMany({ conversationId: { $in: conversationIds } }),
      ConversationMember.deleteMany({ conversationId: { $in: conversationIds } }),
      Conversation.deleteMany({ _id: { $in: conversationIds } })
    );
  } else {
    ops.push(
      Message.deleteMany({ senderId: { $in: demoUserIds } }),
      ConversationMember.deleteMany({ userId: { $in: demoUserIds } })
    );
  }

  await Promise.all(ops);

  await Promise.all([
    ProductTemplate.deleteMany({ tags: DEMO_TAG }),
    WorkoutTemplate.deleteMany({ tags: DEMO_TAG }),
    DietTemplate.deleteMany({ tags: DEMO_TAG }),
    Exercise.deleteMany({ tags: DEMO_TAG }),
    FoodItem.deleteMany({ dataSource: DEMO_DATA_SOURCE }),
  ]);

  if (demoUserIds.length) {
    await User.deleteMany({ _id: { $in: demoUserIds } });
  }
}

async function ensureAdmin() {
  const existing = await User.findOne({ email: DEMO_ADMIN_EMAIL });
  if (existing) return existing;

  return User.create({
    fullName: "FitCoach Demo Admin",
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_PASSWORD,
    role: "admin",
    emailVerified: true,
    isActive: true,
    avatarUrl: imageUrl("demo-admin", 320, 320),
    avatarPublicId: publicId("avatars", "admin"),
  });
}

function buildDemoExercises(createdBy, count = 72) {
  const categories = [
    "strength",
    "cardio",
    "flexibility",
    "yoga",
    "functional",
    "plyometric",
    "calisthenics",
    "stretching",
  ];
  const muscles = [
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "core",
    "quadriceps",
    "hamstrings",
    "glutes",
    "calves",
    "full_body",
  ];
  const equipments = [
    "bodyweight",
    "dumbbell",
    "barbell",
    "kettlebell",
    "resistance_band",
    "cable_machine",
    "bench",
    "yoga_mat",
    "trx",
    "battle_ropes",
    "box",
    "none",
  ];

  return Array.from({ length: count }, (_, i) => {
    const category = categories[i % categories.length];
    const idx = i + 1;
    return {
      name: `Demo Exercise ${idx}`,
      description: `${DEMO_TAG} guided movement for category ${category}.`,
      category,
      subcategory: `${category}_foundation`,
      muscleGroups: sample(muscles, randInt(1, 3)),
      equipment: sample(equipments, randInt(1, 2)),
      difficulty: ["beginner", "intermediate", "advanced"][idx % 3],
      instructions: [
        "Warm up for 3-5 minutes before starting.",
        "Keep your breathing controlled and posture stable.",
        "Finish with a cool down and light stretch.",
      ],
      tips: [
        "Prioritize form over speed.",
        "Increase load gradually week by week.",
      ],
      animationUrl: imageUrl(`exercise-${idx}`, 480, 360),
      animationPublicId: publicId("exercise-animations", idx),
      thumbnailUrl: imageUrl(`exercise-thumb-${idx}`, 320, 240),
      thumbnailPublicId: publicId("exercise-thumbs", idx),
      defaultDuration: category === "cardio" ? randInt(30, 90) : undefined,
      defaultReps: category === "cardio" ? undefined : randInt(8, 16),
      isTimeBased: category === "cardio" || category === "flexibility",
      isYoga: category === "yoga",
      caloriesPerMinute: Number((Math.random() * 6 + 4).toFixed(1)),
      tags: [DEMO_TAG, category, "judge-demo"],
      isActive: true,
      isCustom: false,
      createdBy,
    };
  });
}

function buildDemoFoodItems(createdBy, count = 120) {
  const categories = [
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

  return Array.from({ length: count }, (_, i) => {
    const idx = i + 1;
    const category = categories[i % categories.length];
    const calories = randInt(45, 260);
    const protein = Number((Math.random() * 24).toFixed(1));
    const carbohydrates = Number((Math.random() * 38).toFixed(1));
    const fat = Number((Math.random() * 16).toFixed(1));
    const isVegetarian = !["seafood", "poultry", "meat"].includes(category);

    return {
      name: `Demo Food ${idx}`,
      description: `${DEMO_TAG} nutrition item for ${category}.`,
      category,
      subcategory: `${category}_demo`,
      servingSize: randInt(50, 220),
      servingUnit: "g",
      servingDescription: "1 standard serving",
      nutrition: {
        calories,
        protein,
        carbohydrates,
        fat,
        fiber: Number((Math.random() * 8).toFixed(1)),
        sugar: Number((Math.random() * 10).toFixed(1)),
        sodium: randInt(5, 390),
      },
      micronutrients: {
        iron: Number((Math.random() * 7).toFixed(1)),
        calcium: randInt(10, 320),
        potassium: randInt(80, 600),
        vitaminC: Number((Math.random() * 60).toFixed(1)),
      },
      isVegetarian,
      isVegan: isVegetarian && category !== "dairy" && category !== "eggs",
      isGlutenFree: Math.random() > 0.35,
      isDairyFree: category !== "dairy",
      isNutFree: category !== "nuts_seeds",
      isLowCarb: carbohydrates < 12,
      isHighProtein: protein >= 15,
      isKeto: carbohydrates <= 8,
      cuisine: "International",
      imageUrl: imageUrl(`food-${idx}`, 500, 380),
      imagePublicId: publicId("food-images", idx),
      tags: [DEMO_TAG, category, "judge-demo"],
      usageCount: randInt(0, 150),
      isActive: true,
      isCustom: false,
      createdBy,
      dataSource: DEMO_DATA_SOURCE,
    };
  });
}

function buildWorkoutWeek(exercisePool) {
  const restDays = new Set([3, 6]);
  return Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;
    const dayOfWeek = i % 7;
    const isRestDay = restDays.has(i);

    const workoutExercises = isRestDay
      ? []
      : sample(exercisePool, randInt(5, 7)).map((exercise, idx) => ({
          exerciseId: exercise._id,
          exerciseName: exercise.name,
          exerciseAnimationUrl: exercise.animationUrl,
          order: idx + 1,
          reps: exercise.isTimeBased ? undefined : randInt(10, 15),
          duration: exercise.isTimeBased ? randInt(30, 90) : undefined,
          restSeconds: randInt(40, 90),
          weight: idx % 2 === 0 ? "bodyweight" : `${randInt(5, 20)}kg`,
          notes: idx === 0 ? "Focus on controlled tempo" : undefined,
        }));

    return {
      dayOfWeek,
      dayNumber,
      dayName: dayNames[dayOfWeek],
      isRestDay,
      restDayNotes: isRestDay ? "Light walk + mobility" : undefined,
      focusArea: isRestDay ? "Recovery" : pick(["Upper", "Lower", "Core", "Conditioning"]),
      workouts: isRestDay
        ? []
        : [
            {
              name: "Main Session",
              description: "Progressive overload session",
              estimatedDuration: randInt(35, 60),
              exercises: workoutExercises,
            },
          ],
    };
  });
}

function buildDietWeek(foodPool) {
  const mealTypes = ["breakfast", "lunch", "evening_snack", "dinner"];

  return Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;
    const dayOfWeek = i % 7;

    const meals = mealTypes.map((mealType, idx) => {
      const foods = sample(foodPool, 3).map((food) => ({
        foodItemId: food._id,
        foodName: food.name,
        quantity: randInt(60, 180),
        unit: "g",
        calories: Number(((food.nutrition?.calories || 100) * 0.8).toFixed(1)),
        protein: Number(((food.nutrition?.protein || 8) * 0.8).toFixed(1)),
        carbs: Number(((food.nutrition?.carbohydrates || 12) * 0.8).toFixed(1)),
        fat: Number(((food.nutrition?.fat || 4) * 0.8).toFixed(1)),
      }));

      return {
        mealType,
        name: `${mealType.replace(/_/g, " ")} bowl`,
        time: [`08:00`, `13:00`, `17:00`, `20:30`][idx],
        foods,
        notes: idx === 0 ? "Start with warm water." : undefined,
      };
    });

    return {
      dayOfWeek,
      dayNumber,
      dayName: dayNames[dayOfWeek],
      meals,
      notes: i % 2 === 0 ? "Keep sodium moderate." : undefined,
    };
  });
}

function makeTemplateMeals(foodPool) {
  const meals = ["breakfast", "lunch", "dinner"].map((mealType) => ({
    mealType,
    name: `${mealType} template meal`,
    time: mealType === "breakfast" ? "08:30" : mealType === "lunch" ? "13:00" : "20:00",
    foods: sample(foodPool, 2).map((food) => ({
      foodItemId: food._id,
      quantity: randInt(80, 160),
      unit: "g",
      notes: "Adjust per appetite",
    })),
  }));
  return meals;
}

function makeTemplateWorkoutDays(exercisePool) {
  return Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;
    const isRestDay = i === 3 || i === 6;
    return {
      dayNumber,
      dayName: dayNames[i % 7],
      isRestDay,
      focusArea: isRestDay ? "Recovery" : pick(["Strength", "Cardio", "Mobility"]),
      estimatedDuration: isRestDay ? 20 : randInt(35, 55),
      exercises: isRestDay
        ? []
        : sample(exercisePool, 4).map((exercise, idx) => ({
            exerciseId: exercise._id,
            order: idx + 1,
            reps: exercise.isTimeBased ? undefined : randInt(10, 15),
            duration: exercise.isTimeBased ? randInt(30, 70) : undefined,
            restSeconds: randInt(30, 80),
            weight: idx % 2 === 0 ? "bodyweight" : `${randInt(4, 16)}kg`,
          })),
    };
  });
}

async function seedDemoData() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/fitcoach";
  await mongoose.connect(mongoUri);

  const summary = {};
  const addCount = (key, count) => {
    summary[key] = (summary[key] || 0) + count;
  };

  try {
    if (!KEEP_EXISTING) {
      await cleanupExistingDemoData();
    }

    const admin = await ensureAdmin();
    addCount("admins", 1);

    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    const demoExercises = buildDemoExercises(admin._id, 72);
    const exercises = await Exercise.insertMany(demoExercises, { ordered: false });
    addCount("exercises", exercises.length);

    const demoFoods = buildDemoFoodItems(admin._id, 130);
    const foods = await FoodItem.insertMany(demoFoods, { ordered: false });
    addCount("foodItems", foods.length);

    const productTemplates = await ProductTemplate.insertMany(
      Array.from({ length: 12 }, (_, i) => ({
        name: `Demo Template Product ${i + 1}`,
        description: `${DEMO_TAG} product template for coach storefronts.`,
        mrp: randInt(1200, 4200),
        price: randInt(900, 3600),
        category: pick(["nutrition", "wellness", "supplement", "accessory"]),
        companyName: pick(["FitFuel", "NutriPlus", "HerbalCore", "WellBeing Labs"]),
        imageUrl: imageUrl(`product-template-${i + 1}`),
        imagePublicId: publicId("product-templates", i + 1),
        tags: [DEMO_TAG, "judge-demo"],
        usageCount: 0,
        isActive: true,
        isFeatured: i < 4,
        createdBy: admin._id,
      })),
      { ordered: false }
    );
    addCount("productTemplates", productTemplates.length);

    const workoutTemplates = await WorkoutTemplate.insertMany(
      Array.from({ length: 6 }, (_, i) => ({
        name: `Demo Workout Template ${i + 1}`,
        description: `${DEMO_TAG} reusable workout template ${i + 1}.`,
        category: pick([
          "strength",
          "cardio",
          "weight_loss",
          "muscle_gain",
          "hiit",
          "general_fitness",
        ]),
        difficulty: pick(["beginner", "intermediate", "advanced"]),
        targetAudience: "General adults",
        equipmentRequired: sample(
          ["dumbbell", "barbell", "yoga_mat", "bodyweight", "resistance_band"],
          randInt(2, 3)
        ),
        durationWeeks: pick([4, 8, 12]),
        daysPerWeek: 5,
        avgWorkoutDuration: randInt(35, 55),
        weeklySchedule: makeTemplateWorkoutDays(exercises),
        thumbnailUrl: imageUrl(`workout-template-${i + 1}`),
        thumbnailPublicId: publicId("workout-templates", i + 1),
        tags: [DEMO_TAG, "judge-demo"],
        usageCount: 0,
        isActive: true,
        isFeatured: i < 2,
        createdBy: admin._id,
      })),
      { ordered: false }
    );
    addCount("workoutTemplates", workoutTemplates.length);

    const dietTemplates = await DietTemplate.insertMany(
      Array.from({ length: 6 }, (_, i) => ({
        name: `Demo Diet Template ${i + 1}`,
        description: `${DEMO_TAG} reusable diet template ${i + 1}.`,
        goal: pick([
          "weight_loss",
          "muscle_gain",
          "balanced",
          "high_protein",
          "maintenance",
          "clean_eating",
        ]),
        dailyTargets: {
          calories: randInt(1700, 2400),
          protein: randInt(90, 150),
          carbohydrates: randInt(160, 280),
          fat: randInt(45, 80),
          fiber: randInt(20, 36),
          water: Number((Math.random() * 1.5 + 2.5).toFixed(1)),
        },
        mealsPerDay: 4,
        sampleMeals: makeTemplateMeals(foods),
        weeklySchedule: buildDietWeek(foods),
        daysPerWeek: 7,
        dietaryType: pick(["any", "vegetarian", "vegan", "keto", "paleo"]),
        foodsToAvoid: ["Refined sugar", "Deep-fried snacks"],
        recommendedFoods: sample(foods, 5).map((f) => f._id),
        guidelines: [
          "Prioritize whole foods and hydration.",
          "Split protein intake across meals.",
        ],
        thumbnailUrl: imageUrl(`diet-template-${i + 1}`),
        thumbnailPublicId: publicId("diet-templates", i + 1),
        tags: [DEMO_TAG, "judge-demo"],
        difficulty: pick(["easy", "moderate", "challenging"]),
        usageCount: 0,
        isActive: true,
        isFeatured: i < 2,
        createdBy: admin._id,
      })),
      { ordered: false }
    );
    addCount("dietTemplates", dietTemplates.length);

    const coachDocs = [];
    for (let i = 0; i < COACH_COUNT; i += 1) {
      const idx = i + 1;
      const coachFullName = nameFromPool(COACH_NAME_POOL, i);
      const referralCode = `COACH${idx.toString().padStart(2, "0")}DEMO`;
      const trialEnds = new Date(Date.now() + (idx === COACH_COUNT ? 16 : -12) * oneDayMs);
      const activeExpiry = new Date(Date.now() + (idx === COACH_COUNT ? 0 : 65) * oneDayMs);
      coachDocs.push({
        fullName: coachFullName,
        email: `coach${idx}@${DEMO_EMAIL_DOMAIN}`,
        password: hashedPassword,
        role: "coach",
        platformSubscriptionStatus: idx === COACH_COUNT ? "trial" : "active",
        trialEndsAt: trialEnds,
        subscriptionExpiresAt: idx === COACH_COUNT ? null : activeExpiry,
        phone: `90000010${idx.toString().padStart(2, "0")}`,
        whatsappNumber: `90000010${idx.toString().padStart(2, "0")}`,
        avatarUrl: imageUrl(`coach-avatar-${idx}`, 320, 320),
        avatarPublicId: publicId("avatars", `coach-${idx}`),
        paymentQrUrl: imageUrl(`coach-qr-${idx}`, 500, 500),
        paymentQrPublicId: publicId("payment-qr", `coach-${idx}`),
        companyName: `FitCoach Studio ${idx}`,
        specialization: pick([
          "Weight Management",
          "Body Recomposition",
          "Sports Nutrition",
          "Strength & Conditioning",
        ]),
        experienceYears: randInt(3, 12),
        description:
          "Certified coach focused on practical nutrition, sustainable routines, and measurable results.",
        socialMedia: {
          instagram: `https://instagram.com/demo_coach_${idx}`,
          facebook: `https://facebook.com/demo.coach.${idx}`,
          linkedin: `https://linkedin.com/in/demo-coach-${idx}`,
          website: `https://coach${idx}.fitcoach.demo`,
        },
        awards: [
          {
            url: imageUrl(`coach-award-${idx}`),
            publicId: publicId("awards", `coach-${idx}`),
          },
        ],
        transformations: [
          {
            url: imageUrl(`coach-transform-${idx}`),
            publicId: publicId("transformations", `coach-${idx}`),
          },
        ],
        referralCode,
        coachCode: referralCode,
        emailVerified: true,
        isActive: true,
      });
    }

    const coaches = await User.insertMany(coachDocs, { ordered: true });
    addCount("coaches", coaches.length);

    const clientDocs = [];
    for (const [coachIndex, coach] of coaches.entries()) {
      for (let i = 0; i < CLIENTS_PER_COACH; i += 1) {
        const idx = i + 1;
        const clientFullName = buildClientName(coachIndex, i);
        const startWeight = randInt(58, 98);
        const dateOfBirth = new Date(randInt(1988, 2006), randInt(0, 11), randInt(1, 28));
        clientDocs.push({
          fullName: clientFullName,
          email: `client${coachIndex + 1}_${idx}@${DEMO_EMAIL_DOMAIN}`.toLowerCase(),
          password: hashedPassword,
          role: "client",
          coachId: coach._id,
          coachCode: coach.referralCode,
          phone: `811${randInt(1000000, 9999999)}`,
          whatsappNumber: `811${randInt(1000000, 9999999)}`,
          avatarUrl: imageUrl(`client-avatar-${coach._id}-${idx}`, 320, 320),
          avatarPublicId: publicId("avatars", `client-${coach._id}-${idx}`),
          weightHistory: historyPoints(startWeight, 5, 6),
          heightHistory: historyPoints(randInt(155, 182), 1.5, 3),
          bmiHistory: historyPoints(randInt(21, 32), 1.8, 6),
          notesHistory: progressNotes(),
          bodyFatPercentageHistory: historyPoints(randInt(18, 34), 3, 6),
          visceralFatLevelHistory: historyPoints(randInt(8, 16), 2, 6),
          muscleMassHistory: historyPoints(randInt(26, 46), 2, 6),
          metabolicAgeHistory: historyPoints(randInt(25, 45), 2, 6),
          bodyWaterPercentageHistory: historyPoints(randInt(48, 62), 2.5, 6),
          boneMassHistory: historyPoints(randInt(2, 4), 0.4, 6),
          bloodSugarFastingHistory: historyPoints(randInt(80, 102), 8, 6),
          bloodSugarRandomHistory: historyPoints(randInt(110, 148), 16, 6),
          bloodPressureSystolicHistory: historyPoints(randInt(110, 132), 8, 6),
          bloodPressureDiastolicHistory: historyPoints(randInt(70, 88), 6, 6),
          dailyActivityLevel: pick([
            "Sedentary",
            "Lightly active",
            "Moderately active",
            "Very active",
          ]),
          hydrationHabits: pick(["1–2 liters/day", "2–3 liters/day", "> 3 liters/day"]),
          dailyWaterGoal: Number((Math.random() * 1.8 + 2.2).toFixed(1)),
          goalWeight: startWeight - randInt(2, 10),
          startWeight,
          waterIntakeLogs: buildWaterLogs(7),
          personalGoals: pick([
            "Lose fat while maintaining strength",
            "Improve stamina and sleep quality",
            "Increase lean mass gradually",
          ]),
          healthConditions: pick([
            "None",
            "Mild hypothyroidism (managed)",
            "Vitamin D deficiency history",
          ]),
          allergies: pick(["None", "Peanut sensitivity", "Lactose intolerance"]),
          medications: pick(["None", "Multivitamin", "Omega-3 supplement"]),
          pastWeightChanges: "Fluctuated +/- 5kg in the last 2 years.",
          dateOfBirth,
          gender: idx % 2 === 0 ? "Female" : "Male",
          emailVerified: true,
          isActive: true,
        });
      }
    }

    const clients = await User.insertMany(clientDocs, { ordered: true });
    addCount("clients", clients.length);

    const clientsByCoach = new Map(
      coaches.map((coach) => [
        coach._id.toString(),
        clients.filter((client) => client.coachId.toString() === coach._id.toString()),
      ])
    );

    const platformSubs = await PlatformSubscription.insertMany(
      coaches.map((coach, i) => {
        const isTrial = i === coaches.length - 1;
        const trialEndsAt = new Date(Date.now() + (isTrial ? 18 : -10) * oneDayMs);
        const validUntil = new Date(Date.now() + (isTrial ? 0 : 60 + i * 10) * oneDayMs);
        return {
          userId: coach._id,
          status: isTrial ? "trial" : "active",
          trialEndsAt,
          subscriptionExpiresAt: isTrial ? null : validUntil,
          lastPaymentDate: isTrial ? null : daysAgo(15),
          paymentHistory: isTrial
            ? []
            : [
                {
                  amount: 1499,
                  transactionId: `TRX-${coach._id.toString().slice(-6)}-${Date.now()}`,
                  paymentProof: imageUrl(`platform-proof-${coach._id}`),
                  status: "approved",
                  paidAt: daysAgo(15),
                  approvedBy: admin._id,
                  approvedAt: daysAgo(14),
                  validFrom: daysAgo(15),
                  validUntil,
                  notes: `${DEMO_TAG} platform renewal`,
                },
              ],
          totalPaid: isTrial ? 0 : 1499,
          notifications: {
            threeDayWarning: false,
            oneDayWarning: false,
            expiryNotification: false,
          },
        };
      }),
      { ordered: true }
    );
    addCount("platformSubscriptions", platformSubs.length);

    const workoutPlans = [];
    const dietPlans = [];
    const plans = [];
    const products = [];
    const vouchers = [];

    for (const [coachIndex, coach] of coaches.entries()) {
      const coachClients = clientsByCoach.get(coach._id.toString()) || [];

      const coachWorkoutPlans = await CoachWorkoutPlan.insertMany(
        Array.from({ length: 3 }, (_, i) => ({
          coachId: coach._id,
          name: `${coach.fullName} Workout Plan ${i + 1}`,
          description: `${DEMO_TAG} personalized workout progression for ${coach.fullName}.`,
          category: pick([
            "strength",
            "cardio",
            "weight_loss",
            "muscle_gain",
            "hiit",
            "general_fitness",
            "custom",
          ]),
          difficulty: pick(["beginner", "intermediate", "advanced"]),
          subscriptionPlanIds: [],
          durationWeeks: pick([4, 8, 12]),
          daysPerWeek: 5,
          weeklySchedule: buildWorkoutWeek(exercises),
          equipmentRequired: sample(
            ["dumbbell", "barbell", "bodyweight", "yoga_mat", "resistance_band"],
            3
          ),
          goals: "Improve body composition, stamina, and movement quality.",
          coachNotes: "Track RPE and increase load gradually.",
          basedOnTemplate: workoutTemplates[i % workoutTemplates.length]._id,
          thumbnailUrl: imageUrl(`coach-workout-${coachIndex + 1}-${i + 1}`),
          thumbnailPublicId: publicId(
            "coach-workout-thumbs",
            `${coachIndex + 1}-${i + 1}`
          ),
          isActive: true,
          isDraft: false,
        })),
        { ordered: true }
      );

      const coachDietPlans = await CoachDietPlan.insertMany(
        Array.from({ length: 3 }, (_, i) => ({
          coachId: coach._id,
          name: `${coach.fullName} Diet Plan ${i + 1}`,
          description: `${DEMO_TAG} adaptive nutrition protocol for ${coach.fullName}.`,
          goal: pick([
            "weight_loss",
            "muscle_gain",
            "maintenance",
            "high_protein",
            "balanced",
            "custom",
          ]),
          subscriptionPlanIds: [],
          dailyTargets: {
            calories: randInt(1700, 2450),
            protein: randInt(95, 155),
            carbohydrates: randInt(150, 290),
            fat: randInt(45, 85),
            fiber: randInt(22, 38),
            water: Number((Math.random() * 1.6 + 2.4).toFixed(1)),
          },
          mealsPerDay: 4,
          weeklySchedule: buildDietWeek(foods),
          daysPerWeek: 7,
          dietaryType: pick(["any", "vegetarian", "vegan", "keto", "paleo"]),
          dietaryRestrictions: ["Limit deep-fried foods", "Prefer whole grains"],
          allergyNotes: "Adjust meal substitutions for known sensitivities.",
          foodsToAvoid: ["Sugary soda", "Processed trans-fat snacks"],
          customInstructions: "Distribute protein evenly across meals.",
          supplements: [
            {
              name: "Omega-3",
              dosage: "1 capsule",
              timing: "After breakfast",
              notes: "Optional",
            },
            {
              name: "Whey Protein",
              dosage: "1 scoop",
              timing: "Post workout",
            },
          ],
          basedOnTemplate: dietTemplates[i % dietTemplates.length]._id,
          thumbnailUrl: imageUrl(`coach-diet-${coachIndex + 1}-${i + 1}`),
          thumbnailPublicId: publicId("coach-diet-thumbs", `${coachIndex + 1}-${i + 1}`),
          isActive: true,
          isDraft: false,
        })),
        { ordered: true }
      );

      const coachPlans = await Plan.insertMany(
        Array.from({ length: 3 }, (_, i) => ({
          coachId: coach._id,
          title: ["Starter", "Transformation", "Elite"][i],
          description: `${DEMO_TAG} ${["starter", "mid", "premium"][i]} offer by ${coach.fullName}.`,
          goal: pick(["weight_loss", "muscle_gain", "maintenance", "general_fitness"]),
          price: [1999, 3999, 6999][i],
          durationWeeks: [4, 8, 12][i],
          startDate: daysAgo(30 - i * 5),
          status: i === 2 && coachIndex % 2 === 1 ? "paused" : "active",
          isDefault: i === 0,
          workoutPlanIds: [coachWorkoutPlans[i]._id],
          dietPlanIds: [coachDietPlans[i]._id],
          features: {
            hasWorkoutPlan: true,
            hasDietPlan: true,
            hasProgressTracking: true,
            hasChat: true,
          },
        })),
        { ordered: true }
      );

      await Promise.all([
        CoachWorkoutPlan.updateMany(
          { _id: { $in: coachWorkoutPlans.map((p) => p._id) } },
          {
            $set: {
              subscriptionPlanIds: coachPlans.map((p) => p._id),
            },
          }
        ),
        CoachDietPlan.updateMany(
          { _id: { $in: coachDietPlans.map((p) => p._id) } },
          {
            $set: {
              subscriptionPlanIds: coachPlans.map((p) => p._id),
            },
          }
        ),
      ]);

      const coachProducts = await Product.insertMany(
        Array.from({ length: 8 }, (_, i) => {
          const template = productTemplates[(coachIndex * 8 + i) % productTemplates.length];
          const price = Math.max(699, template.price - randInt(0, 300));
          return {
            coachId: coach._id,
            templateId: template._id,
            name: `${template.name} (${coach.fullName.split(" ").pop()})`,
            description: `${DEMO_TAG} storefront product curated by ${coach.fullName}.`,
            mrp: template.mrp,
            price,
            category: template.category,
            imageUrl: template.imageUrl,
            imagePublicId: template.imagePublicId,
            isActive: true,
          };
        }),
        { ordered: true }
      );

      const coachVouchers = await Voucher.insertMany(
        [
          {
            coachId: coach._id,
            code: `WELCOME${coachIndex + 1}`,
            name: "Welcome Saver",
            discountPercent: 10,
            clientIds: coachClients.slice(0, 20).map((c) => c._id),
            appliesToAllClients: false,
            validFrom: daysAgo(20),
            validTo: daysAgo(-30),
            isActive: true,
            redeemedBy: coachClients.slice(0, 8).map((c) => c._id),
          },
          {
            coachId: coach._id,
            code: `VIP${coachIndex + 1}`,
            name: "VIP Client Offer",
            discountPercent: 15,
            clientIds: [],
            appliesToAllClients: true,
            validFrom: daysAgo(15),
            validTo: daysAgo(-45),
            isActive: true,
            redeemedBy: coachClients.slice(10, 16).map((c) => c._id),
          },
        ],
        { ordered: true }
      );

      workoutPlans.push(...coachWorkoutPlans);
      dietPlans.push(...coachDietPlans);
      plans.push(...coachPlans);
      products.push(...coachProducts);
      vouchers.push(...coachVouchers);
    }

    addCount("coachWorkoutPlans", workoutPlans.length);
    addCount("coachDietPlans", dietPlans.length);
    addCount("plans", plans.length);
    addCount("products", products.length);
    addCount("vouchers", vouchers.length);

    const planByCoach = new Map(
      coaches.map((coach) => [
        coach._id.toString(),
        plans.filter((plan) => plan.coachId.toString() === coach._id.toString()),
      ])
    );

    const productByCoach = new Map(
      coaches.map((coach) => [
        coach._id.toString(),
        products.filter((product) => product.coachId.toString() === coach._id.toString()),
      ])
    );

    const workoutPlanById = new Map(workoutPlans.map((item) => [String(item._id), item]));
    const dietPlanById = new Map(dietPlans.map((item) => [String(item._id), item]));

    const subscriptionsPayload = [];
    for (const coach of coaches) {
      const coachClients = clientsByCoach.get(coach._id.toString()) || [];
      const coachPlans = planByCoach.get(coach._id.toString()) || [];

      for (let i = 0; i < coachClients.length; i += 1) {
        const client = coachClients[i];
        const plan = coachPlans[i % coachPlans.length];
        const status = i < 40 ? "approved" : i < 45 ? "pending" : i < 48 ? "rejected" : "cancelled";
        const startDate = status === "approved" || status === "cancelled" ? daysAgo(randInt(5, 45)) : null;
        const endDate =
          startDate && status !== "pending" && status !== "rejected"
            ? new Date(startDate.getTime() + plan.durationWeeks * 7 * oneDayMs)
            : null;

        subscriptionsPayload.push({
          clientId: client._id,
          coachId: coach._id,
          planId: plan._id,
          amount: plan.price,
          paymentProofUrl:
            status === "pending" || status === "approved"
              ? imageUrl(`payment-proof-${client._id}`)
              : null,
          paymentMode: pick(["manual_qr", "cash", "other"]),
          status,
          startDate,
          endDate,
          durationWeeks: plan.durationWeeks,
          planTitle: plan.title,
          notes: `${DEMO_TAG} seeded subscription for judge demo.`,
          assignedWorkoutPlanIds: plan.workoutPlanIds || [],
          assignedDietPlanIds: plan.dietPlanIds || [],
        });
      }
    }

    const subscriptions = await Subscription.insertMany(subscriptionsPayload, { ordered: true });
    addCount("subscriptions", subscriptions.length);

    const approvedSubscriptions = subscriptions.filter((sub) => sub.status === "approved");

    const planRequests = await PlanRequest.insertMany(
      subscriptions
        .filter((sub) => sub.status !== "approved")
        .map((sub) => ({
          clientId: sub.clientId,
          coachId: sub.coachId,
          planId: sub.planId,
          status: sub.status === "pending" ? "pending" : "declined",
          notes: `${DEMO_TAG} plan request mapped to seeded subscription lifecycle.`,
          paymentMode: "manual_qr",
          paymentProofUrl:
            sub.status === "pending" ? imageUrl(`plan-request-proof-${sub.clientId}`) : null,
          approvedAt: null,
          declinedAt: sub.status === "pending" ? null : daysAgo(randInt(2, 10)),
        })),
      { ordered: true }
    );
    addCount("planRequests", planRequests.length);

    const orders = await Order.insertMany(
      approvedSubscriptions.map((sub, idx) => {
        const coachProducts = productByCoach.get(sub.coachId.toString()) || [];
        const selected = sample(coachProducts, randInt(1, 3));
        const items = selected.map((item) => ({
          productId: item._id,
          name: item.name,
          quantity: randInt(1, 3),
          price: item.price,
        }));
        const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const voucher = vouchers.find((v) => v.coachId.toString() === sub.coachId.toString());
        const discountAmount = idx % 4 === 0 ? Math.round(totalAmount * 0.1) : 0;

        return {
          clientId: sub.clientId,
          coachId: sub.coachId,
          items,
          totalAmount,
          discountAmount,
          finalAmount: totalAmount - discountAmount,
          voucherCode: discountAmount > 0 ? voucher?.code || null : null,
          paymentProofUrl: imageUrl(`order-proof-${sub.clientId}`),
          paymentMode: pick(["manual_qr", "cash", "other"]),
          status: pick(["approved", "fulfilled", "completed", "pending"]),
          notes: `${DEMO_TAG} seeded order for storefront demo.`,
        };
      }),
      { ordered: true }
    );
    addCount("orders", orders.length);

    const workoutLogsPayload = [];
    const dietLogsPayload = [];
    const waterPayload = [];
    const photosPayload = [];
    const reviewsPayload = [];

    for (const sub of approvedSubscriptions) {
      const workoutPlan = workoutPlanById.get(String(sub.assignedWorkoutPlanIds?.[0]));
      const dietPlan = dietPlanById.get(String(sub.assignedDietPlanIds?.[0]));
      const client = clients.find((c) => c._id.toString() === sub.clientId.toString());
      const coach = coaches.find((c) => c._id.toString() === sub.coachId.toString());
      if (!client || !coach) continue;

      for (let d = 0; d < 6; d += 1) {
        const scheduledDate = daysAgo(d + 1, 7);
        const dayOfWeek = scheduledDate.getDay();
        const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
        const weeklyDay = workoutPlan?.weeklySchedule?.find(
          (day) => Number(day.dayNumber) === dayNumber || Number(day.dayOfWeek) === dayOfWeek
        );
        const isRest = weeklyDay?.isRestDay === true;

        const baseExercises =
          weeklyDay?.workouts?.[0]?.exercises?.slice(0, 5) ||
          sample(exercises, 5).map((exercise, idx) => ({
            exerciseId: exercise._id,
            exerciseName: exercise.name,
            reps: randInt(10, 14),
            duration: undefined,
            order: idx + 1,
          }));

        const status = isRest
          ? "rest_day"
          : pick(["completed", "partial", "completed", "completed", "missed"]);

        const startedAt = !isRest && status !== "missed" ? new Date(scheduledDate.getTime() + 8 * 60 * 60 * 1000) : null;
        const completedAt =
          startedAt && status !== "missed"
            ? new Date(startedAt.getTime() + randInt(28, 70) * 60 * 1000)
            : null;

        workoutLogsPayload.push({
          clientId: client._id,
          coachId: coach._id,
          workoutPlanId: workoutPlan?._id || workoutPlans[0]._id,
          subscriptionId: sub._id,
          scheduledDate,
          dayOfWeek,
          dayNumber,
          weekNumber: randInt(1, 8),
          workoutName: weeklyDay?.workouts?.[0]?.name || "Main Session",
          focusArea: weeklyDay?.focusArea || "General Fitness",
          status,
          startedAt,
          completedAt,
          exerciseLogs: isRest
            ? []
            : baseExercises.map((exercise) => {
                const completed = status === "completed" ? true : status === "partial" ? Math.random() > 0.35 : false;
                return {
                  exerciseId: exercise.exerciseId,
                  exerciseName: exercise.exerciseName,
                  plannedReps: exercise.reps || undefined,
                  plannedDuration: exercise.duration || undefined,
                  actualReps: exercise.reps ? [Math.max(0, exercise.reps - randInt(0, 2))] : undefined,
                  weightUsed: [randInt(0, 20)],
                  actualDuration: exercise.duration ? randInt(20, 90) : undefined,
                  completed,
                  skipped: !completed,
                  skipReason: !completed ? "Time constraint" : undefined,
                  difficultyRating: randInt(2, 5),
                };
              }),
          actualDuration: startedAt && completedAt ? Math.round((completedAt - startedAt) / 60000) : 0,
          caloriesBurned: isRest ? 0 : randInt(180, 520),
          overallDifficulty: isRest ? undefined : randInt(2, 5),
          energyLevel: randInt(2, 5),
          moodAfter: randInt(2, 5),
          clientNotes: `${DEMO_TAG} workout note`,
          coachFeedback: status === "completed" ? "Excellent consistency." : "Keep showing up.",
          coachReviewed: Math.random() > 0.4,
          coachReviewedAt: Math.random() > 0.4 ? daysAgo(randInt(0, 5)) : null,
        });

        const dietDay =
          dietPlan?.weeklySchedule?.find(
            (day) => Number(day.dayNumber) === dayNumber || Number(day.dayOfWeek) === dayOfWeek
          ) || dietPlan?.weeklySchedule?.[0];

        const meals = (dietDay?.meals || []).slice(0, 4).map((meal) => ({
          mealType: meal.mealType,
          time: new Date(scheduledDate.getTime() + randInt(7, 20) * 60 * 60 * 1000),
          adherenceStatus: pick(["followed", "modified", "followed", "extra"]),
          notes: `${DEMO_TAG} logged meal`,
          foods: (meal.foods || []).slice(0, 3).map((food) => ({
            foodItemId: food.foodItemId,
            foodName: food.foodName,
            quantity: food.quantity,
            unit: food.unit,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            isCustomEntry: false,
          })),
        }));

        dietLogsPayload.push({
          clientId: client._id,
          coachId: coach._id,
          dietPlanId: dietPlan?._id || dietPlans[0]._id,
          subscriptionId: sub._id,
          date: new Date(scheduledDate.setHours(0, 0, 0, 0)),
          meals,
          dailyTargets: {
            calories: dietPlan?.dailyTargets?.calories || 2000,
            protein: dietPlan?.dailyTargets?.protein || 120,
            carbs: dietPlan?.dailyTargets?.carbohydrates || 220,
            fat: dietPlan?.dailyTargets?.fat || 60,
          },
          waterIntake: Number((Math.random() * 1.8 + 1.8).toFixed(1)),
          waterGoal: dietPlan?.dailyTargets?.water || 3,
          supplementsTaken: [
            { name: "Omega-3", taken: Math.random() > 0.2 },
            { name: "Whey Protein", taken: Math.random() > 0.35 },
          ],
          hungerLevel: {
            morning: randInt(1, 5),
            afternoon: randInt(1, 5),
            evening: randInt(1, 5),
          },
          energyLevel: randInt(2, 5),
          cravings: pick(["None", "Mild sweet cravings", "Late-night salty cravings"]),
          clientNotes: `${DEMO_TAG} diet check-in`,
          coachFeedback: "Good adherence; continue meal timing consistency.",
          coachReviewed: Math.random() > 0.4,
          coachReviewedAt: Math.random() > 0.4 ? daysAgo(randInt(0, 5)) : null,
        });

        waterPayload.push({
          clientId: client._id,
          coachId: coach._id,
          date: new Date(scheduledDate),
          amountLiters: Number((Math.random() * 1.5 + 2.2).toFixed(1)),
          notes: `${DEMO_TAG} hydration log`,
          goal: Number((Math.random() * 1.2 + 2.5).toFixed(1)),
        });
      }

      photosPayload.push(
        {
          clientId: client._id,
          coachId: coach._id,
          url: imageUrl(`progress-front-${client._id}`, 600, 900),
          publicId: publicId("progress", `${client._id}-front`),
          caption: "Front progress photo",
          uploadedAt: daysAgo(randInt(15, 30)),
        },
        {
          clientId: client._id,
          coachId: coach._id,
          url: imageUrl(`progress-side-${client._id}`, 600, 900),
          publicId: publicId("progress", `${client._id}-side`),
          caption: "Side progress photo",
          uploadedAt: daysAgo(randInt(1, 14)),
        }
      );

      if (Math.random() > 0.2) {
        reviewsPayload.push({
          coach: coach._id,
          client: client._id,
          review:
            "Great guidance and accountability. The plans are practical, chat support is fast, and I can see measurable improvements.",
          isApproved: Math.random() > 0.2,
          approvedAt: Math.random() > 0.2 ? daysAgo(randInt(1, 25)) : null,
        });
      }
    }

    const [workoutLogs, dietLogs, waterLogs, progressPhotos] = await Promise.all([
      ClientWorkoutLog.insertMany(workoutLogsPayload, { ordered: false }),
      ClientDietLog.insertMany(dietLogsPayload, { ordered: false }),
      WaterIntake.insertMany(waterPayload, { ordered: false }),
      ProgressPhoto.insertMany(photosPayload, { ordered: false }),
    ]);
    addCount("clientWorkoutLogs", workoutLogs.length);
    addCount("clientDietLogs", dietLogs.length);
    addCount("waterIntakeLogs", waterLogs.length);
    addCount("progressPhotos", progressPhotos.length);

    const reviews = await CoachReview.insertMany(reviewsPayload, { ordered: false });
    addCount("coachReviews", reviews.length);

    const conversations = [];
    const conversationMembers = [];
    const messages = [];

    for (const coach of coaches) {
      const coachClients = clientsByCoach.get(coach._id.toString()) || [];
      const coachPlans = planByCoach.get(coach._id.toString()) || [];

      const globalConversation = await Conversation.create({
        type: "global_broadcast",
        coachId: coach._id,
        name: `${coach.fullName} Community (${DEMO_TAG})`,
        description: "Coach announcements and motivation updates",
        imageUrl: imageUrl(`global-conversation-${coach._id}`),
        imagePublicId: publicId("chat", `global-${coach._id}`),
        isActive: true,
      });
      conversations.push(globalConversation);

      conversationMembers.push(
        {
          conversationId: globalConversation._id,
          userId: coach._id,
          role: "owner",
          joinedAt: daysAgo(30),
          isActive: true,
        },
        ...coachClients.map((client) => ({
          conversationId: globalConversation._id,
          userId: client._id,
          role: "member",
          joinedAt: daysAgo(randInt(2, 20)),
          isActive: true,
          unreadCount: randInt(0, 5),
        }))
      );

      for (const plan of coachPlans) {
        const groupConversation = await Conversation.create({
          type: "plan_group",
          coachId: coach._id,
          planId: plan._id,
          name: `${plan.title} Group (${DEMO_TAG})`,
          description: "Plan-specific guidance and peer accountability",
          imageUrl: imageUrl(`plan-group-${plan._id}`),
          imagePublicId: publicId("chat", `plan-group-${plan._id}`),
          planTitle: plan.title,
          isActive: true,
        });

        conversations.push(groupConversation);

        const planClientIds = approvedSubscriptions
          .filter(
            (sub) =>
              sub.coachId.toString() === coach._id.toString() &&
              sub.planId.toString() === plan._id.toString()
          )
          .map((sub) => sub.clientId.toString());

        conversationMembers.push(
          {
            conversationId: groupConversation._id,
            userId: coach._id,
            role: "owner",
            joinedAt: daysAgo(25),
            isActive: true,
          },
          ...coachClients
            .filter((client) => planClientIds.includes(client._id.toString()))
            .map((client) => ({
              conversationId: groupConversation._id,
              userId: client._id,
              role: "member",
              joinedAt: daysAgo(randInt(2, 18)),
              isActive: true,
              unreadCount: randInt(0, 4),
            }))
        );
      }

      const directClients = coachClients;
      for (const client of directClients) {
        const directConversation = await Conversation.create({
          type: "direct",
          coachId: coach._id,
          clientId: client._id,
          name: `${coach.fullName} ↔ ${client.fullName}`,
          description: null,
          isActive: true,
        });
        conversations.push(directConversation);

        messages.push(
          {
            conversationId: directConversation._id,
            senderId: coach._id,
            type: "text",
            content: "Welcome aboard! We'll start with baseline tracking and an easy first week.",
            senderName: coach.fullName,
            senderAvatarUrl: coach.avatarUrl,
            senderRole: "coach",
            createdAt: daysAgo(randInt(1, 10), 10),
            updatedAt: daysAgo(randInt(1, 10), 10),
          },
          {
            conversationId: directConversation._id,
            senderId: client._id,
            type: "text",
            content: "Thanks coach! I've updated my logs and I'm ready for week one.",
            senderName: client.fullName,
            senderAvatarUrl: client.avatarUrl,
            senderRole: "client",
            createdAt: daysAgo(randInt(0, 8), 17),
            updatedAt: daysAgo(randInt(0, 8), 17),
          }
        );
      }

      messages.push(
        {
          conversationId: globalConversation._id,
          senderId: coach._id,
          type: "text",
          content: "Daily reminder: hydration + steps + meal timing. Small actions, big results 💪",
          senderName: coach.fullName,
          senderAvatarUrl: coach.avatarUrl,
          senderRole: "coach",
          createdAt: daysAgo(2, 8),
          updatedAt: daysAgo(2, 8),
        },
        {
          conversationId: globalConversation._id,
          senderId: coach._id,
          type: "system",
          content: "New weekly challenge posted: consistency streak",
          senderName: "System",
          senderAvatarUrl: null,
          senderRole: "system",
          createdAt: daysAgo(1, 9),
          updatedAt: daysAgo(1, 9),
        }
      );
    }

    const insertedMembers = await ConversationMember.insertMany(conversationMembers, {
      ordered: false,
    });
    addCount("conversationMembers", insertedMembers.length);

    const insertedMessages = await Message.insertMany(messages, { ordered: false });
    addCount("messages", insertedMessages.length);
    addCount("conversations", conversations.length);

    const latestByConversation = new Map();
    for (const msg of insertedMessages) {
      const key = msg.conversationId.toString();
      const existing = latestByConversation.get(key);
      if (!existing || new Date(msg.createdAt) > new Date(existing.createdAt)) {
        latestByConversation.set(key, msg);
      }
    }

    if (latestByConversation.size > 0) {
      await Conversation.bulkWrite(
        Array.from(latestByConversation.values()).map((msg) => ({
          updateOne: {
            filter: { _id: msg.conversationId },
            update: {
              $set: {
                lastMessageAt: msg.createdAt,
                lastMessagePreview: msg.type === "text" ? (msg.content || "").slice(0, 100) : msg.type === "system" ? (msg.content || "System message").slice(0, 100) : "Message",
                lastMessageSenderId: msg.senderId,
              },
            },
          },
        }))
      );
    }

    const notificationDocs = [
      ...coaches.map((coach) => ({
        recipientId: coach._id,
        senderId: admin._id,
        title: "Demo Data Ready",
        message: `${DEMO_TAG}: your dashboard has complete demo data for plans, clients, chat, products, and logs.`,
        type: "system",
        meta: { tag: DEMO_TAG },
      })),
      ...clients.slice(0, 120).map((client) => ({
        recipientId: client._id,
        senderId: client.coachId,
        title: "Weekly Check-in",
        message: `${DEMO_TAG}: please submit this week’s workout and diet reflections.`,
        type: "plan",
        meta: { tag: DEMO_TAG },
      })),
      {
        recipientId: admin._id,
        senderId: null,
        title: "Seed Completed",
        message: `${DEMO_TAG}: judge demo database population finished successfully.`,
        type: "system",
        meta: { tag: DEMO_TAG },
      },
    ];
    const notifications = await Notification.insertMany(notificationDocs, { ordered: true });
    addCount("notifications", notifications.length);

    const docs = await Document.insertMany(
      [...coaches, ...clients.slice(0, 80)].map((user, idx) => ({
        userId: user._id,
        url: idx % 2 === 0 ? imageUrl(`doc-${user._id}`, 900, 1200) : `https://example.com/${DEMO_TAG}/documents/${user._id}.pdf`,
        publicId: publicId("documents", user._id),
        resourceType: idx % 2 === 0 ? "image" : "raw",
        mimeType: idx % 2 === 0 ? "image/jpeg" : "application/pdf",
        originalName: idx % 2 === 0 ? "progress-checkin.jpg" : "health-report.pdf",
        name: idx % 2 === 0 ? "Progress Check-in" : "Health Report",
        bytes: randInt(60_000, 450_000),
        format: idx % 2 === 0 ? "jpg" : "pdf",
      })),
      { ordered: true }
    );
    addCount("documents", docs.length);

    const tokens = await Token.insertMany(
      [...coaches, ...clients.slice(0, 100)].map((user) => ({
        userId: user._id,
        token: crypto.randomBytes(24).toString("hex"),
        expiresAt: new Date(Date.now() + randInt(3, 21) * oneDayMs),
      })),
      { ordered: true }
    );
    addCount("tokens", tokens.length);

    const contactRequests = await ContactRequest.insertMany(
      coaches.flatMap((coach, idx) =>
        Array.from({ length: 3 }, (_, i) => ({
          firstName: `Prospect${idx + 1}${i + 1}`,
          lastName: "Demo",
          email: `prospect${idx + 1}${i + 1}@${DEMO_EMAIL_DOMAIN}`,
          phone: `70000${idx}${i}${randInt(100, 999)}`,
          height: randInt(150, 186),
          weight: randInt(52, 104),
          age: randInt(20, 48),
          gender: pick(["male", "female", "other"]),
          message: `${DEMO_TAG}: interested in online transformation coaching and accountability support.`,
          coachId: coach._id,
          referralCode: coach.referralCode,
          status: pick(["pending", "contacted", "converted", "pending"]),
          notes: "Generated by demo seeder",
        }))
      ),
      { ordered: true }
    );
    addCount("contactRequests", contactRequests.length);

    const [contactUs, feedbacks, bugReports] = await Promise.all([
      ContactUs.insertMany(
        Array.from({ length: 20 }, (_, i) => ({
          name: `Visitor ${i + 1}`,
          email: `visitor${i + 1}@${DEMO_EMAIL_DOMAIN}`,
          message: `${DEMO_TAG}: contact us inquiry ${i + 1} about coaching and platform flow.`,
          status: pick(["unread", "read", "responded"]),
          adminNotes: i % 3 === 0 ? "Handled in demo context" : null,
        })),
      { ordered: true }
      ),
      Feedback.insertMany(
        Array.from({ length: 24 }, (_, i) => ({
          name: `Feedback User ${i + 1}`,
          email: `feedback${i + 1}@${DEMO_EMAIL_DOMAIN}`,
          userRole: pick(["client", "coach", "visitor", "other"]),
          feedbackType: pick([
            "general",
            "feature-request",
            "improvement",
            "complaint",
            "praise",
            "other",
          ]),
          category: pick([
            "platform",
            "coaches",
            "subscriptions",
            "products",
            "progress-tracking",
            "ui-ux",
            "performance",
            "other",
          ]),
          rating: randInt(3, 5),
          subject: `Demo feedback topic ${i + 1}`,
          message: `${DEMO_TAG}: this is seeded feedback to showcase admin moderation workflows.`,
          status: pick(["new", "reviewed", "acknowledged", "implemented", "archived"]),
          priority: pick(["low", "medium", "high"]),
          adminResponse: i % 4 === 0 ? "Thanks for the suggestion." : null,
          adminNotes: i % 5 === 0 ? "Useful signal for roadmap." : null,
          isPublic: Math.random() > 0.7,
          implementedAt: i % 6 === 0 ? daysAgo(randInt(1, 30)) : null,
        })),
      { ordered: true }
      ),
      BugReport.insertMany(
        Array.from({ length: 18 }, (_, i) => ({
          name: `Bug Reporter ${i + 1}`,
          email: `bug${i + 1}@${DEMO_EMAIL_DOMAIN}`,
          title: `Demo bug report ${i + 1}`,
          description: `${DEMO_TAG}: reproducible issue in seeded demo scenario ${i + 1}.`,
          stepsToReproduce:
            "1) Open dashboard 2) Navigate to plans 3) Attempt update 4) Observe behavior",
          severity: pick(["low", "medium", "high", "critical"]),
          category: pick(["ui", "functionality", "performance", "security", "data", "other"]),
          browserInfo: "Chrome 123",
          deviceInfo: "Windows Desktop",
          pageUrl: "https://demo.fitcoach.local/dashboard",
          status: pick(["open", "in-progress", "resolved", "closed", "wont-fix"]),
          priority: pick(["low", "medium", "high", "urgent"]),
          adminNotes: i % 3 === 0 ? "Triaged during demo prep" : null,
          resolvedAt: i % 4 === 0 ? daysAgo(randInt(1, 20)) : null,
        })),
      { ordered: true }
      ),
    ]);
    addCount("contactUs", contactUs.length);
    addCount("feedback", feedbacks.length);
    addCount("bugReports", bugReports.length);

    const deletionRequests = await AccountDeletionRequest.insertMany(
      [
        ...clients.slice(0, 6).map((client) => ({
          userId: client._id,
          reason: `${DEMO_TAG}: requested account cleanup for privacy preference.`,
          status: "pending",
          adminNotes: null,
          processedBy: null,
          processedAt: null,
        })),
        ...clients.slice(6, 10).map((client) => ({
          userId: client._id,
          reason: `${DEMO_TAG}: account merge with another profile.`,
          status: "approved",
          adminNotes: "Approved for processing queue",
          processedBy: admin._id,
          processedAt: daysAgo(randInt(1, 8)),
        })),
      ],
      { ordered: true }
    );
    addCount("accountDeletionRequests", deletionRequests.length);

    await Promise.all([
      ProductTemplate.updateMany({ tags: DEMO_TAG }, { $set: { usageCount: 5 } }),
      WorkoutTemplate.updateMany({ tags: DEMO_TAG }, { $set: { usageCount: 3 } }),
      DietTemplate.updateMany({ tags: DEMO_TAG }, { $set: { usageCount: 3 } }),
    ]);

    console.log("\n✅ Demo seeding completed successfully");
    console.log("\n📌 Demo login credentials");
    console.log(`   Admin: ${DEMO_ADMIN_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`   Coach sample: coach1@${DEMO_EMAIL_DOMAIN} / ${DEMO_PASSWORD}`);
    console.log(`   Client sample: client1_1@${DEMO_EMAIL_DOMAIN} / ${DEMO_PASSWORD}`);

    console.log("\n📊 Inserted records summary");
    Object.entries(summary)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([key, value]) => {
        console.log(`   - ${key}: ${value}`);
      });

    console.log("\nℹ️ Notes");
    console.log(`   - Demo users use email domain @${DEMO_EMAIL_DOMAIN}`);
    console.log(`   - Rerun safely: ${KEEP_EXISTING ? "append mode (--keep-existing)" : "replace prior demo data"}`);
    console.log(`   - Scale used: ${COACH_COUNT} coaches, ${CLIENTS_PER_COACH} clients per coach`);
  } finally {
    await mongoose.disconnect();
  }
}

seedDemoData().catch((error) => {
  console.error("❌ Demo seeding failed:", error);
  process.exit(1);
});
