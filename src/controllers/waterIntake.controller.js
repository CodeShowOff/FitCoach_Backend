// src/controllers/waterIntake.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import mongoose from "mongoose";
import WaterIntake from "../models/WaterIntake.js";
import User from "../models/User.js";

// Validation schema
const createWaterIntakeSchema = Joi.object({
  amountLiters: Joi.number().min(0).max(100).required(),
  date: Joi.date().max("now").required(),
  notes: Joi.string().max(500).optional().allow(null, ""),
  goal: Joi.number().min(0).max(100).optional(),
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

  const { amountLiters, date, notes, goal } = value;
  const clientId = req.user._id;

  // Get coach ID
  const client = await User.findById(clientId).select("coachId");
  if (!client || !client.coachId) {
    res.status(400);
    throw new Error("You must be assigned to a coach to track water intake");
  }

  // Normalize date to start of day for consistency
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  // Create new entry (multiple entries allowed per day)
  const waterIntake = await WaterIntake.create({
    clientId,
    coachId: client.coachId,
    date: startOfDay,
    amountLiters,
    notes,
    goal: goal || 3.5,
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
  const clientId = req.user._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all entries for today and sum them up
  const entries = await WaterIntake.find({
    clientId,
    date: { $gte: today, $lte: endOfDay },
  });

  const totalAmount = entries.reduce((sum, entry) => sum + entry.amountLiters, 0);
  const goal = entries.length > 0 ? entries[0].goal : 3.5;

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
  const clientId = req.user._id;
  const period = req.query.period || "month"; // day, week, month, year
  const dateParam = req.query.date ? new Date(req.query.date) : new Date();
  dateParam.setHours(0, 0, 0, 0);

  let startDate, endDate;

  if (period === "day") {
    startDate = new Date(dateParam);
    endDate = new Date(dateParam);
    endDate.setDate(endDate.getDate() + 1);
  } else if (period === "week") {
    startDate = new Date(dateParam);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  } else if (period === "month") {
    startDate = new Date(dateParam.getFullYear(), dateParam.getMonth(), 1);
    endDate = new Date(dateParam.getFullYear(), dateParam.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "year") {
    startDate = new Date(dateParam.getFullYear(), 0, 1);
    endDate = new Date(dateParam.getFullYear(), 11, 31);
    endDate.setHours(23, 59, 59, 999);
  }

  // Aggregate based on period
  let pipeline;

  if (period === "day") {
    // Get all entries for the day
    const entries = await WaterIntake.find({
      clientId,
      date: { $gte: startDate, $lt: endDate },
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
        percentage: ((total / goal) * 100).toFixed(1),
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
          date: { $gte: startDate, $lt: endDate },
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
    : 3.5;

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
      averagePerDay: period === "day" ? "-" : (totalAmount / (daysTracked || 1)).toFixed(2),
    },
    data: data.map((d) => ({
      date: d._id || d.month,
      amount: d.total.toFixed(2),
      goal: typeof d.goal === "number" ? d.goal.toFixed(2) : d.goal,
      percentage: ((d.total / (d.goal || 3.5)) * 100).toFixed(1),
      ...(period === "year" && d.days ? { daysInMonth: d.days.length } : {}),
    })),
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

  const waterIntake = await WaterIntake.findById(id);
  if (!waterIntake) {
    res.status(404);
    throw new Error("Water intake entry not found");
  }

  // Check authorization
  if (
    waterIntake.clientId.toString() !== userId.toString() &&
    waterIntake.coachId.toString() !== userId.toString()
  ) {
    res.status(403);
    throw new Error("Not authorized to delete this entry");
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
  const clientId = req.user._id;
  const { startDate, endDate, limit = 100, page = 1 } = req.query;

  const filter = { clientId };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  const skip = (page - 1) * limit;

  const entries = await WaterIntake.find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  const total = await WaterIntake.countDocuments(filter);

  res.json({
    success: true,
    data: entries,
    pagination: {
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    },
  });
});
