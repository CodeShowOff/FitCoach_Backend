// src/controllers/waterIntake.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import mongoose from "mongoose";
import WaterIntake from "../models/WaterIntake.js";
import User from "../models/User.js";

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

  // Get coach ID and user's daily water goal
  const client = await User.findById(clientId).select("coachId dailyWaterGoal");
  if (!client) {
    res.status(404);
    throw new Error("User not found");
  }
  if (!client.coachId) {
    res.status(400);
    throw new Error("You must be assigned to a coach to track water intake");
  }

  const goal = client.dailyWaterGoal || 3.5;

  // Parse date string (format: YYYY-MM-DD) to create UTC date at midnight
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    res.status(400);
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Create new entry (multiple entries allowed per day)
  const waterIntake = await WaterIntake.create({
    clientId,
    coachId: client.coachId,
    date: startOfDay,
    amountLiters,
    notes: notes || null,
    goal: goal,
  });

  res.status(201).json({
    success: true,
    message: "Water intake logged successfully",
    data: waterIntake,
  });
});

// ------------------------------
// 📊 @desc Get water intake for current day
// @route GET /api/v1/water-intake/today
// @access Private (Client)
// ------------------------------
export const getTodayWaterIntake = asyncHandler(async (req, res) => {
  // Allow coach to view client's data via query param, otherwise use own ID
  let clientId = req.user.role === 'coach' && req.query.clientId 
    ? req.query.clientId 
    : req.user._id;
  
  // Ensure it's a valid ObjectId
  if (typeof clientId === 'string') {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      res.status(400);
      throw new Error("Invalid client ID");
    }
    clientId = new mongoose.Types.ObjectId(clientId);
  }
  
  // Allow optional date parameter, default to today
  let targetDate;
  if (req.query.date) {
    targetDate = new Date(req.query.date);
    if (isNaN(targetDate.getTime())) {
      res.status(400);
      throw new Error("Invalid date format");
    }
  } else {
    targetDate = new Date();
  }
  
  // Get the date in UTC to match stored dates
  const today = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));

  const endOfDay = new Date(today);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Get user's saved daily water goal
  const user = await User.findById(clientId).select("dailyWaterGoal");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const goal = user.dailyWaterGoal || 3.5;

  // Get all entries for today and sum them up
  const entries = await WaterIntake.find({
    clientId,
    date: { $gte: today, $lte: endOfDay },
  }).sort({ createdAt: 1 });

  const totalAmount = entries.reduce((sum, entry) => sum + entry.amountLiters, 0);

  res.json({
    success: true,
    data: {
      amountLiters: totalAmount,
      goal: goal,
      date: today,
      clientId,
      entries: entries.map(e => ({
        _id: e._id,
        amountLiters: e.amountLiters,
        notes: e.notes,
        createdAt: e.createdAt
      }))
    },
  });
});

// ------------------------------
// 📈 @desc Get water intake analytics (day/month/year)
// @route GET /api/v1/water-intake/analytics
// @access Private (Client)
// @query period: 'day', 'week', 'month', 'year'
// @query date: date to analyze (defaults to today)
// ------------------------------
export const getWaterIntakeAnalytics = asyncHandler(async (req, res) => {
  // Allow coach to view client's data via query param, otherwise use own ID
  let clientId = req.user.role === 'coach' && req.query.clientId 
    ? req.query.clientId 
    : req.user._id;
  
  // Ensure it's a valid ObjectId
  if (typeof clientId === 'string') {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      res.status(400);
      throw new Error("Invalid client ID");
    }
    clientId = new mongoose.Types.ObjectId(clientId);
  }
  
  const period = req.query.period || "month";
  
  // Validate period
  if (!['day', 'week', 'month', 'year'].includes(period)) {
    res.status(400);
    throw new Error("Invalid period. Must be 'day', 'week', 'month', or 'year'");
  }
  
  const dateParam = req.query.date ? new Date(req.query.date) : new Date();
  
  // Validate date
  if (isNaN(dateParam.getTime())) {
    res.status(400);
    throw new Error("Invalid date format");
  }
  
  dateParam.setHours(0, 0, 0, 0);

  let startDate, endDate;

  if (period === "day") {
    startDate = new Date(Date.UTC(dateParam.getFullYear(), dateParam.getMonth(), dateParam.getDate(), 0, 0, 0, 0));
    endDate = new Date(startDate);
    endDate.setUTCHours(23, 59, 59, 999);
  } else if (period === "week") {
    // Start of week (Sunday)
    startDate = new Date(Date.UTC(dateParam.getFullYear(), dateParam.getMonth(), dateParam.getDate(), 0, 0, 0, 0));
    startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay());
    // End of week (Saturday)
    endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
  } else if (period === "month") {
    startDate = new Date(Date.UTC(dateParam.getFullYear(), dateParam.getMonth(), 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(dateParam.getFullYear(), dateParam.getMonth() + 1, 0, 23, 59, 59, 999));
  } else if (period === "year") {
    startDate = new Date(Date.UTC(dateParam.getFullYear(), 0, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(dateParam.getFullYear(), 11, 31, 23, 59, 59, 999));
  }

  // Aggregate based on period
  let pipeline;

  if (period === "day") {
    // Get all entries for the day
    const entries = await WaterIntake.find({
      clientId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: 1 });

    const total = entries.reduce((sum, e) => sum + e.amountLiters, 0);
    const goal = entries.length > 0 ? entries[0].goal : 3.5;

    // Return consistent format with other periods
    return res.json({
      success: true,
      period: "day",
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      summary: {
        totalAmount: total.toFixed(2),
        averageGoal: goal.toFixed(2),
        daysTracked: entries.length > 0 ? 1 : 0,
        averagePerDay: total.toFixed(2),
      },
      data: [{
        date: dateParam.toISOString().split("T")[0],
        amount: total.toFixed(2),
        goal: goal.toFixed(2),
        percentage: goal > 0 ? ((total / goal) * 100).toFixed(1) : '0.0',
        entries: entries.map((e) => ({
          _id: e._id,
          time: e.createdAt,
          amount: e.amountLiters,
          notes: e.notes,
        })),
      }],
    });
  } else if (period === "week") {
    // Get daily summaries for the week
    pipeline = [
      {
        $match: {
          clientId: new mongoose.Types.ObjectId(clientId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          total: { $sum: "$amountLiters" },
          goal: { $first: "$goal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
  } else if (period === "month") {
    // Get daily summaries for the month
    pipeline = [
      {
        $match: {
          clientId: new mongoose.Types.ObjectId(clientId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          total: { $sum: "$amountLiters" },
          goal: { $first: "$goal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
  } else if (period === "year") {
    // Get monthly summaries for the year
    pipeline = [
      {
        $match: {
          clientId: new mongoose.Types.ObjectId(clientId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$date" },
          },
          total: { $sum: "$amountLiters" },
          goal: { $avg: "$goal" },
          count: { $sum: 1 },
          days: {
            $addToSet: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];
  }

  const data = await WaterIntake.aggregate(pipeline);

  // Calculate summary statistics
  const totalAmount = data.reduce((sum, d) => sum + (d.total || 0), 0);
  const avgGoal = data.length > 0 
    ? (data.reduce((sum, d) => sum + (d.goal || 3.5), 0) / data.length).toFixed(2)
    : "3.50";

  // Calculate unique days tracked based on period
  let daysTracked = 0;
  if (period === "day") {
    daysTracked = data.length > 0 ? 1 : 0;
  } else if (period === "week" || period === "month") {
    // For week/month, data.length already represents unique days
    daysTracked = data.length;
  } else if (period === "year") {
    // For year, sum up the unique days from each month
    daysTracked = data.reduce((sum, d) => sum + (d.days ? d.days.length : 0), 0);
  }

  // Fill in missing days for week and month views
  let filledData = data;
  if (period === "week" || period === "month") {
    const dataMap = new Map(data.map(d => [d._id, d]));
    filledData = [];
    
    const currentDate = new Date(startDate);
    const endDateCopy = new Date(endDate);
    
    while (currentDate <= endDateCopy) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existing = dataMap.get(dateStr);
      
      if (existing) {
        filledData.push(existing);
      } else {
        // Add placeholder for missing day
        filledData.push({
          _id: dateStr,
          total: 0,
          goal: parseFloat(avgGoal) || 3.5,
          count: 0,
        });
      }
      
      // Use UTC methods to match UTC dates
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  res.json({
    success: true,
    period,
    dateRange: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    summary: {
      totalAmount: totalAmount.toFixed(2),
      averageGoal: avgGoal,
      daysTracked: daysTracked,
      averagePerDay: daysTracked > 0 ? (totalAmount / daysTracked).toFixed(2) : "0.00",
    },
    data: filledData.map((d) => {
      const amount = typeof d.total === 'number' ? d.total : 0;
      const goal = typeof d.goal === 'number' ? d.goal : 3.5;
      return {
        date: d._id || d.month,
        amount: amount.toFixed(2),
        goal: goal.toFixed(2),
        percentage: goal > 0 ? ((amount / goal) * 100).toFixed(1) : '0.0',
        ...(period === "year" && d.days ? { daysInMonth: d.days.length } : {}),
      };
    }),
  });
});

// ------------------------------
// 🗑️ @desc Delete water intake entry
// @route DELETE /api/v1/water-intake/:id
// @access Private (Client, Coach)
// ------------------------------
export const deleteWaterIntake = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid water intake entry ID");
  }

  const waterIntake = await WaterIntake.findById(id);
  if (!waterIntake) {
    res.status(404);
    throw new Error("Water intake entry not found");
  }

  // Check authorization - only the client who created it can delete
  // Coaches can view but should not delete client entries
  const isClient = waterIntake.clientId.toString() === userId.toString();
  const isCoach = req.user.role === 'coach' && waterIntake.coachId.toString() === userId.toString();
  
  if (!isClient && !isCoach) {
    res.status(403);
    throw new Error("Not authorized to delete this entry");
  }
  
  // Additional check: if user is coach, they should not be allowed to delete
  // Only the client themselves can delete their own entries
  if (req.user.role === 'coach') {
    res.status(403);
    throw new Error("Coaches cannot delete client water intake entries");
  }

  await WaterIntake.findByIdAndDelete(id);

  res.json({
    success: true,
    message: "Water intake entry deleted successfully",
  });
});

// ------------------------------
// 📋 @desc Get all water intake entries for a date range
// @route GET /api/v1/water-intake
// @access Private (Client)
// @query startDate, endDate
// ------------------------------
export const getWaterIntakeEntries = asyncHandler(async (req, res) => {
  // Allow coach to view client's data via query param, otherwise use own ID
  let clientId = req.user.role === 'coach' && req.query.clientId 
    ? req.query.clientId 
    : req.user._id;
  
  // Ensure it's a valid ObjectId
  if (typeof clientId === 'string') {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      res.status(400);
      throw new Error("Invalid client ID");
    }
    clientId = new mongoose.Types.ObjectId(clientId);
  }
  
  const { startDate, endDate, limit = 100, page = 1 } = req.query;

  // Validate pagination parameters
  const validLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  const validPage = Math.max(parseInt(page) || 1, 1);

  const filter = { clientId };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400);
        throw new Error("Invalid start date format");
      }
      filter.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        res.status(400);
        throw new Error("Invalid end date format");
      }
      end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  const skip = (validPage - 1) * validLimit;

  const entries = await WaterIntake.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(validLimit);

  const total = await WaterIntake.countDocuments(filter);

  res.json({
    success: true,
    data: entries,
    pagination: {
      total,
      page: validPage,
      limit: validLimit,
      totalPages: Math.ceil(total / validLimit),
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
