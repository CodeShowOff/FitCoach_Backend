
// src/controllers/progress.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import User from "../models/User.js";

// ------------------------------
// 🧩 Helper Functions
// ------------------------------
/**
 * Calculate age from date of birth
 * @param {Date} dateOfBirth - The date of birth
 * @returns {number|null} - The calculated age or null if no DOB
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// ------------------------------
// 🧩 Validation Schema
// ------------------------------
const progressSchema = Joi.object({
  weight: Joi.number().min(0).max(500).optional(),
  height: Joi.number().min(0).max(300).optional(),
  notes: Joi.string().max(500).optional().allow(""),
  
  // Basic Info (non-tracking)
  dateOfBirth: Joi.date().max('now').optional(),
  gender: Joi.string().valid("Male", "Female", "Other").optional(),
  
  // Smart Scale Measurements (tracking)
  bodyFatPercentage: Joi.number().min(0).max(100).optional(),
  visceralFatLevel: Joi.number().min(0).max(50).optional(),
  muscleMass: Joi.number().min(0).max(200).optional(),
  metabolicAge: Joi.number().min(10).max(120).optional(),
  bodyWaterPercentage: Joi.number().min(0).max(100).optional(),
  boneMass: Joi.number().min(0).max(20).optional(),
  
  // Lifestyle & Habits (non-tracking)
  dailyActivityLevel: Joi.string().valid("None", "Sedentary", "Lightly active", "Moderately active", "Very active", "Highly active / athlete").optional(),
  hydrationHabits: Joi.string().valid("None", "< 1 liter/day", "1–2 liters/day", "2–3 liters/day", "> 3 liters/day").optional(),
  personalGoals: Joi.string().max(500).optional().allow(""),
  
  // Health History (non-tracking)
  healthConditions: Joi.string().max(1000).optional().allow(""),
  allergies: Joi.string().max(1000).optional().allow(""),
  medications: Joi.string().max(1000).optional().allow(""),
  pastWeightChanges: Joi.string().max(500).optional().allow(""),
  
  // Vitals (tracking)
  bloodSugarFasting: Joi.number().min(0).max(600).optional(),
  bloodSugarRandom: Joi.number().min(0).max(600).optional(),
  bloodPressureSystolic: Joi.number().min(40).max(250).optional(),
  bloodPressureDiastolic: Joi.number().min(20).max(200).optional(),
});

// ------------------------------
// 🩺 @desc Add new progress entry (Client only)
// @route POST /api/v1/progress
// @access Private (Client)
// ------------------------------
export const addProgressLog = asyncHandler(async (req, res) => {
  // Normalize hydrationHabits to match allowed enum values,
  // accounting for sanitization stripping angle brackets or spaces.
  if (typeof req.body?.hydrationHabits === "string") {
    const rawOriginal = req.body.hydrationHabits;
    const raw = rawOriginal.trim().toLowerCase();

    // Direct match for already-correct values
    const directAllowed = [
      "none",
      "< 1 liter/day",
      "1–2 liters/day",
      "2–3 liters/day",
      "> 3 liters/day",
    ];
    if (directAllowed.includes(rawOriginal)) {
      // Already in the correct canonical form
      // (matches Joi enum exactly), so skip further normalization.
    } else {
      // Fuzzy normalization for common variants and sanitised strings
      const contains = (needle) => raw.includes(needle);

      if (contains("none")) {
        req.body.hydrationHabits = "None";
      } else if (contains("1") && contains("liter") && contains("day") && !contains("2") && raw.startsWith("<")) {
        // Variants like "<1 liter/day", "< 1 liter/day"
        req.body.hydrationHabits = "< 1 liter/day";
      } else if (contains("1") && contains("liter") && contains("day") && !contains("2")) {
        // Fallback: anything mentioning 1 liter/day without 2
        req.body.hydrationHabits = "< 1 liter/day";
      } else if ((contains("1–2") || contains("1-2")) && contains("liter")) {
        req.body.hydrationHabits = "1–2 liters/day";
      } else if ((contains("2–3") || contains("2-3")) && contains("liter")) {
        req.body.hydrationHabits = "2–3 liters/day";
      } else if (contains("3") && contains("liter") && (contains(">") || contains("more than"))) {
        req.body.hydrationHabits = "> 3 liters/day";
      }
    }
  }

  const { error, value } = progressSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { 
    weight, height, notes,
    dateOfBirth, gender,
    bodyFatPercentage, visceralFatLevel, muscleMass, metabolicAge, bodyWaterPercentage, boneMass,
    dailyActivityLevel, hydrationHabits, personalGoals,
    healthConditions, allergies, medications, pastWeightChanges,
    bloodSugarFasting, bloodSugarRandom, bloodPressureSystolic, bloodPressureDiastolic
  } = value;

  // Get the user
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const now = new Date();
  const updates = {};

  // Update non-tracking fields (basic info)
  if (dateOfBirth !== undefined) {
    user.dateOfBirth = dateOfBirth;
    updates.dateOfBirth = dateOfBirth;
  }
  if (gender !== undefined) {
    user.gender = gender;
    updates.gender = gender;
  }
  
  // Update non-tracking lifestyle fields
  if (dailyActivityLevel !== undefined) {
    user.dailyActivityLevel = dailyActivityLevel;
    updates.dailyActivityLevel = dailyActivityLevel;
  }
  if (hydrationHabits !== undefined) {
    user.hydrationHabits = hydrationHabits;
    updates.hydrationHabits = hydrationHabits;
  }
  if (personalGoals !== undefined) {
    user.personalGoals = personalGoals;
    updates.personalGoals = personalGoals;
  }
  
  // Update non-tracking health history fields
  if (healthConditions !== undefined) {
    user.healthConditions = healthConditions;
    updates.healthConditions = healthConditions;
  }
  if (allergies !== undefined) {
    user.allergies = allergies;
    updates.allergies = allergies;
  }
  if (medications !== undefined) {
    user.medications = medications;
    updates.medications = medications;
  }
  if (pastWeightChanges !== undefined) {
    user.pastWeightChanges = pastWeightChanges;
    updates.pastWeightChanges = pastWeightChanges;
  }

  // Push weight to weightHistory
  if (weight !== undefined) {
    user.weightHistory.push({ value: weight, date: now });
    updates.weightHistory = user.weightHistory;
  }

  // Push height to heightHistory
  if (height !== undefined) {
    user.heightHistory.push({ value: height, date: now });
    updates.heightHistory = user.heightHistory;
  }

  // Calculate and push BMI if both weight and height are provided
  if (weight !== undefined && height !== undefined) {
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    user.bmiHistory.push({ value: parseFloat(bmi.toFixed(1)), date: now });
    updates.bmiHistory = user.bmiHistory;
  } else if (weight !== undefined && user.heightHistory.length > 0) {
    // Use latest height if only weight is provided
    const latestHeight = user.heightHistory[user.heightHistory.length - 1].value;
    const heightM = latestHeight / 100;
    const bmi = weight / (heightM * heightM);
    user.bmiHistory.push({ value: parseFloat(bmi.toFixed(1)), date: now });
    updates.bmiHistory = user.bmiHistory;
  } else if (height !== undefined && user.weightHistory.length > 0) {
    // Use latest weight if only height is provided
    const latestWeight = user.weightHistory[user.weightHistory.length - 1].value;
    const heightM = height / 100;
    const bmi = latestWeight / (heightM * heightM);
    user.bmiHistory.push({ value: parseFloat(bmi.toFixed(1)), date: now });
    updates.bmiHistory = user.bmiHistory;
  }

  // Push notes to notesHistory
  if (notes) {
    user.notesHistory.push({ text: notes, date: now });
    updates.notesHistory = user.notesHistory;
  }
  
  // Smart Scale Measurements (tracking)
  if (bodyFatPercentage !== undefined) {
    user.bodyFatPercentageHistory.push({ value: bodyFatPercentage, date: now });
    updates.bodyFatPercentageHistory = user.bodyFatPercentageHistory;
  }
  if (visceralFatLevel !== undefined) {
    user.visceralFatLevelHistory.push({ value: visceralFatLevel, date: now });
    updates.visceralFatLevelHistory = user.visceralFatLevelHistory;
  }
  if (muscleMass !== undefined) {
    user.muscleMassHistory.push({ value: muscleMass, date: now });
    updates.muscleMassHistory = user.muscleMassHistory;
  }
  if (metabolicAge !== undefined) {
    user.metabolicAgeHistory.push({ value: metabolicAge, date: now });
    updates.metabolicAgeHistory = user.metabolicAgeHistory;
  }
  if (bodyWaterPercentage !== undefined) {
    user.bodyWaterPercentageHistory.push({ value: bodyWaterPercentage, date: now });
    updates.bodyWaterPercentageHistory = user.bodyWaterPercentageHistory;
  }
  if (boneMass !== undefined) {
    user.boneMassHistory.push({ value: boneMass, date: now });
    updates.boneMassHistory = user.boneMassHistory;
  }
  
  // Vitals (tracking)
  if (bloodSugarFasting !== undefined) {
    user.bloodSugarFastingHistory.push({ value: bloodSugarFasting, date: now });
    updates.bloodSugarFastingHistory = user.bloodSugarFastingHistory;
  }
  if (bloodSugarRandom !== undefined) {
    user.bloodSugarRandomHistory.push({ value: bloodSugarRandom, date: now });
    updates.bloodSugarRandomHistory = user.bloodSugarRandomHistory;
  }
  if (bloodPressureSystolic !== undefined) {
    user.bloodPressureSystolicHistory.push({ value: bloodPressureSystolic, date: now });
    updates.bloodPressureSystolicHistory = user.bloodPressureSystolicHistory;
  }
  if (bloodPressureDiastolic !== undefined) {
    user.bloodPressureDiastolicHistory.push({ value: bloodPressureDiastolic, date: now });
    updates.bloodPressureDiastolicHistory = user.bloodPressureDiastolicHistory;
  }

  // Save user with updated arrays
  await user.save();

  res.status(201).json({
    success: true,
    message: "Progress updated successfully",
    data: updates,
  });
});

// ------------------------------
// 📊 @desc Get all progress history for logged-in client
// @route GET /api/v1/progress/my
// @access Private (Client)
// ------------------------------
export const getMyProgressLogs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "weightHistory heightHistory bmiHistory notesHistory " +
    "dateOfBirth gender " +
    "bodyFatPercentageHistory visceralFatLevelHistory muscleMassHistory metabolicAgeHistory bodyWaterPercentageHistory boneMassHistory " +
    "dailyActivityLevel hydrationHabits personalGoals " +
    "healthConditions allergies medications pastWeightChanges " +
    "bloodSugarFastingHistory bloodSugarRandomHistory bloodPressureSystolicHistory bloodPressureDiastolicHistory"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Combine all histories into a unified timeline
  const dateMap = new Map();

  // Process each history type
  user.weightHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).weight = entry.value;
  });

  user.heightHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).height = entry.value;
  });

  user.bmiHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bmi = entry.value;
  });

  user.notesHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).notes = entry.text;
  });
  
  // Smart Scale Measurements
  user.bodyFatPercentageHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bodyFatPercentage = entry.value;
  });
  
  user.visceralFatLevelHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).visceralFatLevel = entry.value;
  });
  
  user.muscleMassHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).muscleMass = entry.value;
  });
  
  user.metabolicAgeHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).metabolicAge = entry.value;
  });
  
  user.bodyWaterPercentageHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bodyWaterPercentage = entry.value;
  });
  
  user.boneMassHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).boneMass = entry.value;
  });
  
  // Vitals
  user.bloodSugarFastingHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bloodSugarFasting = entry.value;
  });
  
  user.bloodSugarRandomHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bloodSugarRandom = entry.value;
  });
  
  user.bloodPressureSystolicHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bloodPressureSystolic = entry.value;
  });
  
  user.bloodPressureDiastolicHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bloodPressureDiastolic = entry.value;
  });

  // Convert map to array and sort by date (newest first)
  const history = Array.from(dateMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  res.json({
    success: true,
    data: history,
    // Include non-tracking fields
    profile: {
      age: calculateAge(user.dateOfBirth),
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      dailyActivityLevel: user.dailyActivityLevel,
      hydrationHabits: user.hydrationHabits,
      personalGoals: user.personalGoals,
      healthConditions: user.healthConditions,
      allergies: user.allergies,
      medications: user.medications,
      pastWeightChanges: user.pastWeightChanges,
    },
    pagination: {
      total: history.length,
      page: 1,
      totalPages: 1,
    },
  });
});

// ------------------------------
// 🧑‍🏫 @desc Get progress history for a specific client (Coach only)
// @route GET /api/v1/progress/client/:clientId
// @access Private (Coach)
// ------------------------------
export const getClientProgressLogs = asyncHandler(async (req, res) => {
  const clientId = req.params.clientId;
  const requesterRole = req.user.role;

  let client;

  if (requesterRole === "coach") {
    client = await User.findOne({
      _id: clientId,
      coachId: req.user._id,
      role: "client",
    }).select(
      "weightHistory heightHistory bmiHistory notesHistory fullName " +
      "age gender " +
      "bodyFatPercentageHistory visceralFatLevelHistory muscleMassHistory metabolicAgeHistory bodyWaterPercentageHistory boneMassHistory " +
      "dailyActivityLevel hydrationHabits personalGoals " +
      "healthConditions allergies medications pastWeightChanges " +
      "bloodSugarFastingHistory bloodSugarRandomHistory bloodPressureSystolicHistory bloodPressureDiastolicHistory"
    );

    if (!client) {
      res.status(404);
      throw new Error("Client not found or not assigned to this coach");
    }
  } else if (requesterRole === "admin") {
    client = await User.findOne({ 
      _id: clientId, 
      role: "client" 
    }).select(
      "weightHistory heightHistory bmiHistory notesHistory fullName " +
      "age gender " +
      "bodyFatPercentageHistory visceralFatLevelHistory muscleMassHistory metabolicAgeHistory bodyWaterPercentageHistory boneMassHistory " +
      "dailyActivityLevel hydrationHabits personalGoals " +
      "healthConditions allergies medications pastWeightChanges " +
      "bloodSugarFastingHistory bloodSugarRandomHistory bloodPressureSystolicHistory bloodPressureDiastolicHistory"
    );

    if (!client) {
      res.status(404);
      throw new Error("Client not found");
    }
  } else {
    res.status(403);
    throw new Error("Forbidden");
  }

  // Combine all histories into a unified timeline
  const dateMap = new Map();

  // Process each history type
  client.weightHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).weight = entry.value;
  });

  client.heightHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).height = entry.value;
  });

  client.bmiHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bmi = entry.value;
  });

  client.notesHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).notes = entry.text;
  });
  
  // Smart Scale Measurements
  client.bodyFatPercentageHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bodyFatPercentage = entry.value;
  });
  
  client.visceralFatLevelHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).visceralFatLevel = entry.value;
  });
  
  client.muscleMassHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).muscleMass = entry.value;
  });
  
  client.metabolicAgeHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).metabolicAge = entry.value;
  });
  
  client.bodyWaterPercentageHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bodyWaterPercentage = entry.value;
  });
  
  client.boneMassHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).boneMass = entry.value;
  });
  
  // Vitals
  client.bloodSugarFastingHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bloodSugarFasting = entry.value;
  });
  
  client.bloodSugarRandomHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bloodSugarRandom = entry.value;
  });
  
  client.bloodPressureSystolicHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bloodPressureSystolic = entry.value;
  });
  
  client.bloodPressureDiastolicHistory?.forEach(entry => {
    const dateStr = entry.date.toISOString();
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: entry.date });
    }
    dateMap.get(dateStr).bloodPressureDiastolic = entry.value;
  });

  // Convert map to array and sort by date (newest first)
  const history = Array.from(dateMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  res.json({
    success: true,
    data: history,
    // Include non-tracking fields
    profile: {
      age: calculateAge(client.dateOfBirth),
      dateOfBirth: client.dateOfBirth,
      gender: client.gender,
      dailyActivityLevel: client.dailyActivityLevel,
      hydrationHabits: client.hydrationHabits,
      personalGoals: client.personalGoals,
      healthConditions: client.healthConditions,
      allergies: client.allergies,
      medications: client.medications,
      pastWeightChanges: client.pastWeightChanges,
    },
    pagination: {
      total: history.length,
      page: 1,
      totalPages: 1,
    },
  });
});

// ------------------------------
// 🎯 @desc Get client's goal weight
// @route GET /api/v1/progress/goal-weight
// @access Private (Client)
// ------------------------------
export const getGoalWeight = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    success: true,
    goalWeight: user.goalWeight || null,
    startWeight: user.startWeight || null,
  });
});

// ------------------------------
// 🎯 @desc Update client's goal weight
// @route PUT /api/v1/progress/goal-weight
// @access Private (Client)
// ------------------------------
export const updateGoalWeight = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    goalWeight: Joi.number().min(1).max(500),
    startWeight: Joi.number().min(1).max(500).allow(null),
  }).or("goalWeight", "startWeight");

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (value.goalWeight !== undefined) {
    user.goalWeight = value.goalWeight;
  }

  if (value.startWeight !== undefined) {
    user.startWeight = value.startWeight;
  }
  await user.save();

  res.json({
    success: true,
    message: "Goal weight updated successfully",
    goalWeight: user.goalWeight,
    startWeight: user.startWeight || null,
  });
});

