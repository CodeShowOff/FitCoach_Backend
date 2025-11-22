import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Plan from "../models/Plan.js";
import Product from "../models/Product.js";
import Subscription from "../models/Subscription.js";
import Order from "../models/Order.js";
import { getPlanSummariesForClients } from "../services/planSummary.service.js";

// ------------------------------
// 📊 @desc Get coach dashboard stats
// @route GET /api/v1/coach/stats
// @access Private (coach only)
// ------------------------------
export const getCoachStats = asyncHandler(async (req, res) => {
  const coachId = req.user._id;

  // Parallel queries for performance
  const [clientsCount, plansCount, productsCount] = await Promise.all([
    User.countDocuments({ coachId: coachId, role: "client" }),
    Plan.countDocuments({ coachId }),
    Product.countDocuments({ coachId }),
  ]);

  res.json({
    success: true,
    clients: clientsCount,
    plans: plansCount,
    products: productsCount,
  });
});

// ------------------------------
// 📈 @desc Get average BMI trend (for chart)
// @route GET /api/v1/coach/client-progress
// @access Private (coach only)
// ------------------------------
export const getCoachProgressTrend = asyncHandler(async (req, res) => {
  const coachId = req.user._id;

  // Fetch all clients and their BMI history
  const clients = await User.find({ coachId, role: "client" })
    .select("bmiHistory")
    .lean();

  // Collect all BMI entries with dates
  const allBmiEntries = [];
  clients.forEach(client => {
    if (client.bmiHistory && client.bmiHistory.length > 0) {
      client.bmiHistory.forEach(entry => {
        if (entry.value != null && entry.date) {
          allBmiEntries.push({
            bmi: entry.value,
            date: new Date(entry.date),
          });
        }
      });
    }
  });

  // Group by week and calculate average BMI
  const weekMap = {};
  allBmiEntries.forEach(entry => {
    const year = entry.date.getFullYear();
    // Get ISO week number
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((entry.date - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    const weekKey = `${year}-W${week}`;
    
    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { sum: 0, count: 0, year, week };
    }
    weekMap[weekKey].sum += entry.bmi;
    weekMap[weekKey].count += 1;
  });

  // Convert to array and calculate averages
  const progressData = Object.entries(weekMap)
    .map(([week, data]) => ({
      week,
      avgBMI: Math.round((data.sum / data.count) * 10) / 10,
      year: data.year,
      weekNum: data.week,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNum - b.weekNum;
    })
    .map(({ week, avgBMI }) => ({ week, avgBMI }));

  res.json(progressData);
});

// GET /api/v1/coach/clients
export const getCoachClients = asyncHandler(async (req, res) => {
  const coachId = req.user._id;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const requestedLimit = parseInt(req.query.limit, 10) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const baseFilter = { coachId, role: "client" };
  const queryFilter = { ...baseFilter };

  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");
    queryFilter.$or = [
      { fullName: regex },
      { email: regex },
      { phone: regex },
      { whatsappNumber: regex },
    ];
  }

  const clients = await User.find(queryFilter)
    .select("fullName email phone whatsappNumber createdAt weightHistory heightHistory bmiHistory")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Extract latest progress from each client's history arrays
  const { summaries } = await getPlanSummariesForClients(coachId, clients.map((c) => c._id));

  const clientsWithProgress = clients.map((c) => {
    const latestWeight = c.weightHistory?.length > 0 
      ? c.weightHistory[c.weightHistory.length - 1] 
      : null;
    const latestHeight = c.heightHistory?.length > 0 
      ? c.heightHistory[c.heightHistory.length - 1] 
      : null;
    const latestBmi = c.bmiHistory?.length > 0 
      ? c.bmiHistory[c.bmiHistory.length - 1] 
      : null;

    // Determine the most recent date across all metrics
    const dates = [
      latestWeight?.date,
      latestHeight?.date,
      latestBmi?.date,
    ].filter(Boolean);
    const mostRecentDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : null;

    return {
      ...c,
      weight: latestWeight?.value ?? null,
      bmi: latestBmi?.value ?? null,
      height: latestHeight?.value ?? null,
      latestProgress: (latestWeight || latestHeight || latestBmi)
        ? {
          weight: latestWeight?.value ?? null,
          height: latestHeight?.value ?? null,
          bmi: latestBmi?.value ?? null,
          date: mostRecentDate,
        }
        : null,
      planSummary: summaries[c._id.toString()] || {
        current: null,
        pending: [],
        defaultPlan: null,
      },
    };
  });

  const total = await User.countDocuments(queryFilter);

  res.json({
    success: true,
    data: clientsWithProgress,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  });
});

// ------------------------------
// 🧾 @desc Public coach profile by referral code
// @route GET /api/v1/coach/public-profile/:referralCode
// @access Public
// ------------------------------
export const getPublicCoachProfile = asyncHandler(async (req, res) => {
  const { referralCode } = req.params;

  const coach = await User.findOne({ referralCode, role: "coach", isActive: true })
    .select("fullName email phone avatarUrl specialization experienceYears bio description socialMedia awards transformations address createdAt")
    .lean();

  if (!coach) {
    return res.status(404).json({ success: false, message: "Coach not found" });
  }

  const coachId = coach._id;

  const [clientsCount, plansCount, productsCount, publicPlans] = await Promise.all([
    User.countDocuments({ coachId, role: "client" }),
    Plan.countDocuments({ coachId }),
    Product.countDocuments({ coachId }),
    Plan.find({ coachId, isActive: true })
      .select("title description durationWeeks price createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Fetch recent progress from clients' history arrays
  const recentClients = await User.find({ coachId, role: "client" })
    .select("fullName weightHistory heightHistory bmiHistory waterIntakeHistory notesHistory")
    .lean();

  // Compile latest progress entries (limit 10 most recent across all clients)
  const allProgressEntries = [];
  recentClients.forEach(client => {
    const entries = [];
    
    // Collect all entries with dates
    if (client.weightHistory) {
      client.weightHistory.forEach(entry => {
        entries.push({ type: 'weight', value: entry.value, date: entry.date });
      });
    }
    if (client.heightHistory) {
      client.heightHistory.forEach(entry => {
        entries.push({ type: 'height', value: entry.value, date: entry.date });
      });
    }
    if (client.bmiHistory) {
      client.bmiHistory.forEach(entry => {
        entries.push({ type: 'bmi', value: entry.value, date: entry.date });
      });
    }
    if (client.waterIntakeHistory) {
      client.waterIntakeHistory.forEach(entry => {
        entries.push({ type: 'waterIntake', value: entry.value, date: entry.date });
      });
    }
    if (client.notesHistory) {
      client.notesHistory.forEach(entry => {
        entries.push({ type: 'notes', text: entry.text, date: entry.date });
      });
    }

    // Group by date to create combined entries
    const dateMap = {};
    entries.forEach(entry => {
      const dateKey = new Date(entry.date).toISOString();
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: entry.date, clientName: client.fullName };
      }
      if (entry.type === 'weight') dateMap[dateKey].weight = entry.value;
      if (entry.type === 'height') dateMap[dateKey].height = entry.value;
      if (entry.type === 'bmi') dateMap[dateKey].bmi = entry.value;
      if (entry.type === 'waterIntake') dateMap[dateKey].waterIntakeLiters = entry.value;
      if (entry.type === 'notes') dateMap[dateKey].notes = entry.text;
    });

    allProgressEntries.push(...Object.values(dateMap));
  });

  // Sort by date and take the 10 most recent
  const latestProgress = allProgressEntries
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  // Extract only city and state from address for privacy
  const publicAddress = coach.address
    ? {
        city: coach.address.city || null,
        state: coach.address.state || null,
      }
    : null;

  res.json({
    success: true,
    data: {
      coach: {
        id: coachId,
        fullName: coach.fullName,
        email: coach.email,
        phone: coach.phone,
        avatarUrl: coach.avatarUrl,
        specialization: coach.specialization,
        experienceYears: coach.experienceYears,
        bio: coach.bio,
        description: coach.description,
        socialMedia: coach.socialMedia || null,
        awards: coach.awards || [],
        transformations: coach.transformations || [],
        address: publicAddress,
        memberSince: coach.createdAt,
        referralCode,
      },
      stats: {
        clientsCount,
        plansCount,
        productsCount,
      },
      plans: publicPlans,
      latestProgress,
    },
  });
});

// ------------------------------
// 📈 @desc Public coach progress chart (average BMI trend)
// @route GET /api/v1/coach/public-profile/:referralCode/progress
// @access Public
// ------------------------------
export const getPublicCoachProgress = asyncHandler(async (req, res) => {
  const { referralCode } = req.params;

  const coach = await User.findOne({ referralCode, role: "coach", isActive: true })
    .select("_id")
    .lean();

  if (!coach) {
    return res.status(404).json({ success: false, message: "Coach not found" });
  }

  const coachId = coach._id;

  // Fetch all clients and their BMI history
  const clients = await User.find({ coachId, role: "client" })
    .select("bmiHistory")
    .lean();

  // Collect all BMI entries with dates
  const allBmiEntries = [];
  clients.forEach(client => {
    if (client.bmiHistory && client.bmiHistory.length > 0) {
      client.bmiHistory.forEach(entry => {
        if (entry.value != null && entry.date) {
          allBmiEntries.push({
            bmi: entry.value,
            date: new Date(entry.date),
          });
        }
      });
    }
  });

  // Group by week and calculate average BMI
  const weekMap = {};
  allBmiEntries.forEach(entry => {
    const year = entry.date.getFullYear();
    // Get ISO week number
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((entry.date - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    const weekKey = `${year}-W${week}`;
    
    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { sum: 0, count: 0, year, week };
    }
    weekMap[weekKey].sum += entry.bmi;
    weekMap[weekKey].count += 1;
  });

  // Convert to array and calculate averages
  const progressData = Object.entries(weekMap)
    .map(([week, data]) => ({
      week,
      avgBMI: Math.round((data.sum / data.count) * 10) / 10,
      year: data.year,
      weekNum: data.week,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNum - b.weekNum;
    })
    .map(({ week, avgBMI }) => ({ week, avgBMI }));

  res.json(progressData);
});

// ------------------------------
// 💰 @desc Get coach earnings from subscriptions and orders
// @route GET /api/v1/coach/earnings
// @access Private (coach only)
// ------------------------------
export const getCoachEarnings = asyncHandler(async (req, res) => {
  const coachId = req.user._id;

  // Fetch approved subscriptions
  const subscriptions = await Subscription.find({
    coachId,
    status: "approved",
  }).lean();

  // Fetch approved/completed orders
  const orders = await Order.find({
    coachId,
    status: { $in: ["approved", "fulfilled", "completed"] },
  }).lean();

  // Calculate subscription earnings
  const subscriptionEarnings = subscriptions.reduce(
    (total, sub) => total + (sub.amount || 0),
    0
  );
  const subscriptionCount = subscriptions.length;

  // Calculate order earnings
  const orderEarnings = orders.reduce(
    (total, order) => total + (order.totalAmount || 0),
    0
  );
  const orderCount = orders.length;

  // Total earnings
  const totalEarnings = subscriptionEarnings + orderEarnings;

  // Group orders and subscriptions by month for trend
  const earningsByMonth = {};

  // Add subscriptions
  subscriptions.forEach((sub) => {
    const date = new Date(sub.startDate || sub.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    if (!earningsByMonth[monthKey]) {
      earningsByMonth[monthKey] = {
        month: monthKey,
        subscriptionEarnings: 0,
        orderEarnings: 0,
        subscriptionCount: 0,
        orderCount: 0,
      };
    }
    earningsByMonth[monthKey].subscriptionEarnings += sub.amount || 0;
    earningsByMonth[monthKey].subscriptionCount += 1;
  });

  // Add orders
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    if (!earningsByMonth[monthKey]) {
      earningsByMonth[monthKey] = {
        month: monthKey,
        subscriptionEarnings: 0,
        orderEarnings: 0,
        subscriptionCount: 0,
        orderCount: 0,
      };
    }
    earningsByMonth[monthKey].orderEarnings += order.totalAmount || 0;
    earningsByMonth[monthKey].orderCount += 1;
  });

  // Convert to sorted array
  const trendData = Object.values(earningsByMonth)
    .map((item) => ({
      ...item,
      totalEarnings: item.subscriptionEarnings + item.orderEarnings,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  res.json({
    success: true,
    summary: {
      totalEarnings,
      subscriptionEarnings,
      orderEarnings,
      subscriptionCount,
      orderCount,
    },
    trend: trendData,
    subscriptions,
    orders,
  });
});

