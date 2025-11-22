import asyncHandler from "express-async-handler";
import ContactRequest from "../models/ContactRequest.js";
import User from "../models/User.js";
import Joi from "joi";
import { createNotification } from "./notifications.controller.js";

// ------------------------------
// Validation Schema
// ------------------------------
const createContactRequestSchema = Joi.object({
  firstName: Joi.string().required().trim().max(50),
  lastName: Joi.string().required().trim().max(50),
  email: Joi.string().email().allow(null, "").trim(),
  phone: Joi.string().required().trim(),
  height: Joi.number().min(50).max(300).allow(null),
  weight: Joi.number().min(20).max(500).allow(null),
  age: Joi.number().required().min(10).max(120),
  gender: Joi.string().required().valid("male", "female", "other"),
  message: Joi.string().required().trim().max(1000),
  referralCode: Joi.string().required().trim(),
});

// ------------------------------
// @desc Create a new contact request
// @route POST /api/v1/contact-requests
// @access Public
// ------------------------------
export const createContactRequest = asyncHandler(async (req, res) => {
  const { error, value } = createContactRequestSchema.validate(req.body);
  
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Find coach by referral code
  const coach = await User.findOne({
    referralCode: value.referralCode,
    role: "coach",
    isActive: true,
  });

  if (!coach) {
    res.status(404);
    throw new Error("Coach not found");
  }

  // Create contact request
  const contactRequest = await ContactRequest.create({
    firstName: value.firstName,
    lastName: value.lastName,
    email: value.email || null,
    phone: value.phone,
    height: value.height || null,
    weight: value.weight || null,
    age: value.age,
    gender: value.gender,
    message: value.message,
    coachId: coach._id,
    referralCode: value.referralCode,
    status: "pending",
  });

  // Create notification for the coach
  await createNotification({
    recipientId: coach._id,
    title: "New Contact Request",
    message: `${value.firstName} ${value.lastName} has sent you a contact request. Age: ${value.age}, Gender: ${value.gender}`,
    type: "info",
    meta: {
      contactRequestId: contactRequest._id,
      firstName: value.firstName,
      lastName: value.lastName,
      phone: value.phone,
    },
  });

  res.status(201).json({
    success: true,
    message: "Contact request submitted successfully. The coach will reach out to you soon!",
    data: contactRequest,
  });
});

// ------------------------------
// @desc Get all contact requests for a coach
// @route GET /api/v1/coach/contact-requests
// @access Private (coach only)
// ------------------------------
export const getCoachContactRequests = asyncHandler(async (req, res) => {
  const coachId = req.user._id;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const requestedLimit = parseInt(req.query.limit, 10) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const status = req.query.status;
  const filter = { coachId };

  if (status && ["pending", "contacted", "converted", "rejected"].includes(status)) {
    filter.status = status;
  }

  const [requests, total] = await Promise.all([
    ContactRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactRequest.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: requests,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// @desc Update contact request status
// @route PUT /api/v1/coach/contact-requests/:id
// @access Private (coach only)
// ------------------------------
export const updateContactRequestStatus = asyncHandler(async (req, res) => {
  const coachId = req.user._id;
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!["pending", "contacted", "converted", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const contactRequest = await ContactRequest.findOne({
    _id: id,
    coachId,
  });

  if (!contactRequest) {
    res.status(404);
    throw new Error("Contact request not found");
  }

  contactRequest.status = status;
  if (notes !== undefined) {
    contactRequest.notes = notes || null;
  }

  await contactRequest.save();

  res.json({
    success: true,
    message: "Contact request updated successfully",
    data: contactRequest,
  });
});
