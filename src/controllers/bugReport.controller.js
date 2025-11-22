// src/controllers/bugReport.controller.js
import asyncHandler from "express-async-handler";
import BugReport from "../models/BugReport.js";

// ------------------------------
// 🐛 @desc Submit a bug report (Public)
// @route POST /api/v1/bug-reports/submit
// @access Public
// ------------------------------
export const submitBugReport = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    title,
    description,
    stepsToReproduce,
    severity,
    category,
    browserInfo,
    deviceInfo,
    pageUrl,
  } = req.body;

  // Validation
  if (!name || !email || !title || !description || !stepsToReproduce) {
    res.status(400);
    throw new Error("Name, email, title, description, and steps to reproduce are required");
  }

  // Create new bug report
  const bugReport = await BugReport.create({
    name,
    email,
    title,
    description,
    stepsToReproduce,
    severity: severity || "medium",
    category: category || "other",
    browserInfo,
    deviceInfo,
    pageUrl,
  });

  res.status(201).json({
    success: true,
    message: "Thank you for reporting this bug! Our team will investigate it.",
    data: {
      _id: bugReport._id,
      title: bugReport.title,
      severity: bugReport.severity,
      status: bugReport.status,
      createdAt: bugReport.createdAt,
    },
  });
});

// ------------------------------
// 📋 @desc Get all bug reports (Admin only)
// @route GET /api/v1/bug-reports
// @access Private (Admin only)
// ------------------------------
export const getBugReports = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const status = req.query.status || null;
  const severity = req.query.severity || null;
  const priority = req.query.priority || null;

  // Build filter
  const filter = {};
  if (status && ["open", "in-progress", "resolved", "closed", "wont-fix"].includes(status)) {
    filter.status = status;
  }
  if (severity && ["low", "medium", "high", "critical"].includes(severity)) {
    filter.severity = severity;
  }
  if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
    filter.priority = priority;
  }

  // Optional search by title, email, or description
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { title: searchRegex },
      { email: searchRegex },
      { description: searchRegex },
    ];
  }

  const [reports, total] = await Promise.all([
    BugReport.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BugReport.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: reports,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// ✏️ @desc Update bug report status (Admin only)
// @route PATCH /api/v1/bug-reports/:id/status
// @access Private (Admin only)
// ------------------------------
export const updateBugStatus = asyncHandler(async (req, res) => {
  const { status, priority, adminNotes } = req.body;

  if (!status || !["open", "in-progress", "resolved", "closed", "wont-fix"].includes(status)) {
    res.status(400);
    throw new Error(
      "Valid status is required (open, in-progress, resolved, closed, or wont-fix)"
    );
  }

  const report = await BugReport.findById(req.params.id);

  if (!report) {
    res.status(404);
    throw new Error("Bug report not found");
  }

  report.status = status;

  if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
    report.priority = priority;
  }

  if (adminNotes !== undefined) {
    report.adminNotes = adminNotes;
  }

  // Set resolvedAt when status changes to resolved
  if (status === "resolved" && !report.resolvedAt) {
    report.resolvedAt = new Date();
  }

  await report.save();

  res.json({
    success: true,
    message: "Bug report updated successfully",
    data: report,
  });
});

// ------------------------------
// 🗑️ @desc Delete bug report (Admin only)
// @route DELETE /api/v1/bug-reports/:id
// @access Private (Admin only)
// ------------------------------
export const deleteBugReport = asyncHandler(async (req, res) => {
  const report = await BugReport.findById(req.params.id);

  if (!report) {
    res.status(404);
    throw new Error("Bug report not found");
  }

  await report.deleteOne();

  res.json({
    success: true,
    message: "Bug report deleted successfully",
  });
});
