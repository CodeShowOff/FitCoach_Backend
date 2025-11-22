// src/controllers/contactUs.controller.js
import asyncHandler from "express-async-handler";
import ContactUs from "../models/ContactUs.js";

// ------------------------------
// 📧 @desc Submit a contact us form (Public)
// @route POST /api/v1/contact-us/submit
// @access Public
// ------------------------------
export const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  // Validation
  if (!name || !email || !message) {
    res.status(400);
    throw new Error("Name, email, and message are required");
  }

  // Create new contact submission
  const contactSubmission = await ContactUs.create({
    name,
    email,
    message,
  });

  res.status(201).json({
    success: true,
    message: "Thank you for contacting us! We'll get back to you soon.",
    data: {
      _id: contactSubmission._id,
      name: contactSubmission.name,
      email: contactSubmission.email,
      createdAt: contactSubmission.createdAt,
    },
  });
});

// ------------------------------
// 📋 @desc Get all contact us submissions (Admin only)
// @route GET /api/v1/contact-us
// @access Private (Admin only)
// ------------------------------
export const getContactSubmissions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const status = req.query.status || null;

  // Build filter
  const filter = {};
  if (status && ["unread", "read", "responded"].includes(status)) {
    filter.status = status;
  }

  // Optional search by name or email
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
    ];
  }

  const [submissions, total] = await Promise.all([
    ContactUs.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactUs.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: submissions,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// ✏️ @desc Update contact submission status (Admin only)
// @route PATCH /api/v1/contact-us/:id/status
// @access Private (Admin only)
// ------------------------------
export const updateContactStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;

  if (!status || !["unread", "read", "responded"].includes(status)) {
    res.status(400);
    throw new Error("Valid status is required (unread, read, or responded)");
  }

  const submission = await ContactUs.findById(req.params.id);

  if (!submission) {
    res.status(404);
    throw new Error("Contact submission not found");
  }

  submission.status = status;
  if (adminNotes !== undefined) {
    submission.adminNotes = adminNotes;
  }

  await submission.save();

  res.json({
    success: true,
    message: "Contact submission updated successfully",
    data: submission,
  });
});

// ------------------------------
// 🗑️ @desc Delete contact submission (Admin only)
// @route DELETE /api/v1/contact-us/:id
// @access Private (Admin only)
// ------------------------------
export const deleteContactSubmission = asyncHandler(async (req, res) => {
  const submission = await ContactUs.findById(req.params.id);

  if (!submission) {
    res.status(404);
    throw new Error("Contact submission not found");
  }

  await submission.deleteOne();

  res.json({
    success: true,
    message: "Contact submission deleted successfully",
  });
});
