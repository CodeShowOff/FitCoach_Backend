// src/controllers/waterIntake.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import User from "../models/User.js";

// Helper function to get current date string in IST (YYYY-MM-DD)
const getISTDateString = (date = new Date()) => {
  const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get start of week (Sunday) in IST
const getWeekStart = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - dayOfWeek);
  return getISTDateString(startDate);
};

// Helper to clean old logs (keep only last 7 days)
const cleanOldLogs = (logs, currentDate) => {
  const sevenDaysAgo = new Date();
  const [year, month, day] = currentDate.split('-').map(Number);
  sevenDaysAgo.setFullYear(year, month - 1, day);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = getISTDateString(sevenDaysAgo);
  
  return logs.filter(log => log.date >= cutoffDate);
};

// Validation schema
const createWaterIntakeSchema = Joi.object({
  amountLiters: Joi.number().min(0.01).max(100).required().messages({
    'number.min': 'Amount must be greater than 0',
    'number.max': 'Amount cannot exceed 100 liters',
  }),
  date: Joi.string().required(),
  notes: Joi.string().max(500).optional().allow(null, ""),
});

// ------------------------------
// 💧 @desc Log water intake
// @route POST /api/v1/water-intake
// @access Private (Client)
// ------------------------------
export const logWaterIntake = asyncHandler(async (req, res) => {
  const { error, value } = createWaterIntakeSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { amountLiters, date, notes } = value;
  const clientId = req.user._id;

  // Validate user is a client and has a coach
  const user = await User.findById(clientId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.role !== 'client') {
    res.status(403);
    throw new Error("Only clients can log water intake");
  }
  if (!user.coachId) {
    res.status(400);
    throw new Error("You must be assigned to a coach to track water intake");
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400);
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  // Find existing log for this date
  let waterIntakeLogs = user.waterIntakeLogs || [];
  let dayLog = waterIntakeLogs.find(log => log.date === date);

  const newEntry = {
    amount: amountLiters,
    time: new Date(),
    notes: notes || undefined
  };

  if (dayLog) {
    // Add entry to existing day
    dayLog.entries.push(newEntry);
    dayLog.totalAmount = dayLog.entries.reduce((sum, e) => sum + e.amount, 0);
  } else {
    // Create new day log
    dayLog = {
      date: date,
      entries: [newEntry],
      totalAmount: amountLiters
    };
    waterIntakeLogs.push(dayLog);
  }

  // Clean old logs (keep only last 7 days)
  waterIntakeLogs = cleanOldLogs(waterIntakeLogs, date);
  
  // Sort by date descending
  waterIntakeLogs.sort((a, b) => b.date.localeCompare(a.date));

  // Update user
  user.waterIntakeLogs = waterIntakeLogs;
  await user.save();

  res.status(201).json({
    success: true,
    message: "Water intake logged successfully",
    data: {
      date: date,
      amount: amountLiters,
      totalForDay: dayLog.totalAmount,
      goal: user.dailyWaterGoal
    },
  });
});

// ------------------------------
// 📊 @desc Get water intake for current day
// @route GET /api/v1/water-intake/today
// @access Private (Client, Coach)
// ------------------------------
export const getTodayWaterIntake = asyncHandler(async (req, res) => {
  // Allow coach to view client's data via query param, otherwise use own ID
  let userId = req.user.role === 'coach' && req.query.clientId 
    ? req.query.clientId 
    : req.user._id;
  
  // Get today's date in IST
  const todayDate = req.query.date || getISTDateString();
  
  const user = await User.findById(userId).select('waterIntakeLogs dailyWaterGoal');
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const goal = user.dailyWaterGoal || 3.5;
  const logs = user.waterIntakeLogs || [];
  const todayLog = logs.find(log => log.date === todayDate);

  const amountLiters = todayLog ? todayLog.totalAmount : 0;
  const entries = todayLog ? todayLog.entries.map(e => ({
    _id: e._id,
    amountLiters: e.amount,
    notes: e.notes,
    createdAt: e.time
  })) : [];

  res.json({
    success: true,
    data: {
      amountLiters,
      goal,
      date: todayDate,
      clientId: userId,
      entries
    },
  });
});

// ------------------------------
// 📈 @desc Get water intake analytics for week
// @route GET /api/v1/water-intake/analytics
// @access Private (Client, Coach)
// ------------------------------
export const getWaterIntakeAnalytics = asyncHandler(async (req, res) => {
  // Allow coach to view client's data via query param, otherwise use own ID
  let userId = req.user.role === 'coach' && req.query.clientId 
    ? req.query.clientId 
    : req.user._id;
  
  const dateParam = req.query.date || getISTDateString();
  
  const user = await User.findById(userId).select('waterIntakeLogs dailyWaterGoal');
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const currentGoal = user.dailyWaterGoal || 3.5;
  const logs = user.waterIntakeLogs || [];
  
  // Get week start (Sunday)
  const weekStart = getWeekStart(dateParam);
  const [year, month, day] = weekStart.split('-').map(Number);
  
  // Generate all 7 days of the week
  const weekData = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(year, month - 1, day + i);
    const dateStr = getISTDateString(currentDate);
    
    const dayLog = logs.find(log => log.date === dateStr);
    const amount = dayLog ? dayLog.totalAmount : 0;
    
    weekData.push({
      date: dateStr,
      amount: amount.toFixed(2),
      goal: currentGoal.toFixed(2),
      percentage: currentGoal > 0 ? ((amount / currentGoal) * 100).toFixed(1) : '0.0',
    });
  }

  // Calculate summary
  const totalAmount = weekData.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const daysTracked = weekData.filter(d => parseFloat(d.amount) > 0).length;

  res.json({
    success: true,
    period: "week",
    dateRange: {
      start: weekData[0].date,
      end: weekData[6].date,
    },
    summary: {
      totalAmount: totalAmount.toFixed(2),
      averageGoal: currentGoal.toFixed(2),
      daysTracked,
      averagePerDay: daysTracked > 0 ? (totalAmount / daysTracked).toFixed(2) : "0.00",
    },
    data: weekData,
  });
});

// ------------------------------
// 🗑️ @desc Delete water intake entry
// @route DELETE /api/v1/water-intake/:id
// @access Private (Client only - coaches cannot delete)
// ------------------------------
export const deleteWaterIntake = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Only clients can delete their own entries
  if (req.user.role !== 'client') {
    res.status(403);
    throw new Error("Only clients can delete their water intake entries");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  let found = false;
  const logs = user.waterIntakeLogs || [];
  
  for (let dayLog of logs) {
    const entryIndex = dayLog.entries.findIndex(e => e._id.toString() === id);
    if (entryIndex !== -1) {
      dayLog.entries.splice(entryIndex, 1);
      
      if (dayLog.entries.length === 0) {
        // Remove day log if no entries left
        user.waterIntakeLogs = logs.filter(log => log.date !== dayLog.date);
      } else {
        // Recalculate total
        dayLog.totalAmount = dayLog.entries.reduce((sum, e) => sum + e.amount, 0);
      }
      
      found = true;
      break;
    }
  }

  if (!found) {
    res.status(404);
    throw new Error("Water intake entry not found");
  }

  await user.save();

  res.json({
    success: true,
    message: "Water intake entry deleted successfully",
  });
});

// ------------------------------
// 📋 @desc Get all water intake entries
// @route GET /api/v1/water-intake/entries
// @access Private (Client, Coach)
// ------------------------------
export const getWaterIntakeEntries = asyncHandler(async (req, res) => {
  // Allow coach to view client's data via query param, otherwise use own ID
  let userId = req.user.role === 'coach' && req.query.clientId 
    ? req.query.clientId 
    : req.user._id;
  
  const user = await User.findById(userId).select('waterIntakeLogs');
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const logs = user.waterIntakeLogs || [];
  
  // Flatten all entries
  const allEntries = [];
  for (let dayLog of logs) {
    for (let entry of dayLog.entries) {
      allEntries.push({
        _id: entry._id,
        date: dayLog.date,
        amountLiters: entry.amount,
        notes: entry.notes,
        createdAt: entry.time,
      });
    }
  }

  // Sort by date descending
  allEntries.sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json({
    success: true,
    data: allEntries,
    pagination: {
      total: allEntries.length,
      page: 1,
      limit: allEntries.length,
      totalPages: 1,
    },
  });
});

// ------------------------------
// 🎯 @desc Get user's daily water goal
// @route GET /api/v1/water-intake/goal
// @access Private (Client)
// ------------------------------
export const getWaterGoal = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("dailyWaterGoal");
  
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  
  res.json({
    success: true,
    data: {
      goal: user.dailyWaterGoal || 3.5,
    },
  });
});

// ------------------------------
// 🎯 @desc Update user's daily water goal
// @route PUT /api/v1/water-intake/goal
// @access Private (Client)
// ------------------------------
export const updateWaterGoal = asyncHandler(async (req, res) => {
  const { goal } = req.body;

  if (goal === undefined || goal === null) {
    res.status(400);
    throw new Error("Goal is required");
  }

  if (typeof goal !== 'number' || isNaN(goal) || goal < 0.5 || goal > 20) {
    res.status(400);
    throw new Error("Goal must be a number between 0.5 and 20 liters");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { dailyWaterGoal: goal },
    { new: true, runValidators: true }
  ).select("dailyWaterGoal");
  
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    success: true,
    message: "Daily water goal updated successfully",
    data: {
      goal: user.dailyWaterGoal,
    },
  });
});
