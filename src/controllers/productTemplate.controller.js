// src/controllers/productTemplate.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import ProductTemplate from "../models/ProductTemplate.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const suggestedCategories = [
  "supplement",
  "protein",
  "pre_workout",
  "post_workout",
  "vitamins",
  "fat_loss",
  "mass_gainer",
  "hydration",
  "accessories",
  "other",
];

const createTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).optional().allow("", null),
  mrp: Joi.number().min(0).required(),
  price: Joi.number().min(0).required(),
  category: Joi.string().max(50).optional().allow("", null),
  companyName: Joi.string().max(100).optional().allow("", null),
  imageUrl: Joi.string().uri().optional().allow("", null),
  imagePublicId: Joi.string().optional().allow("", null),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional().allow("", null),
  mrp: Joi.number().min(0).optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().max(50).optional().allow("", null),
  companyName: Joi.string().max(100).optional().allow("", null),
  imageUrl: Joi.string().uri().optional().allow("", null),
  imagePublicId: Joi.string().optional().allow("", null),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  isActive: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
});

// ------------------------------
// ➕ @desc Create a new product template
// @route POST /api/v1/product-templates
// @access Private (Admin only)
// ------------------------------
export const createProductTemplate = asyncHandler(async (req, res) => {
  const { error, value } = createTemplateSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  if (value.price > value.mrp) {
    res.status(400);
    throw new Error("Template price cannot exceed template MRP");
  }

  const template = await ProductTemplate.create({
    ...value,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Product template created successfully",
    data: template,
  });
});

// ------------------------------
// 📋 @desc Get all product templates
// @route GET /api/v1/product-templates
// @access Private (Admin, Coach)
// ------------------------------
export const getProductTemplates = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { search, category, companyName, isFeatured, isActive } = req.query;

  const query = {};

  // Only admins can view inactive templates
  if (req.user?.role !== "admin") {
    query.isActive = true;
  } else if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  if (category && category.trim().length > 0) {
    query.category = category.trim();
  }

  if (companyName && companyName.trim().length > 0) {
    query.companyName = companyName.trim();
  }

  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured === "true";
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query.$or = [
      { name: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
      { category: { $regex: term, $options: "i" } },
      { companyName: { $regex: term, $options: "i" } },
      { tags: { $regex: term, $options: "i" } },
    ];
  }

  const [templates, total] = await Promise.all([
    ProductTemplate.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ isFeatured: -1, usageCount: -1, createdAt: -1 }),
    ProductTemplate.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: templates,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// 🔍 @desc Get product template by ID
// @route GET /api/v1/product-templates/:id
// @access Private (Admin, Coach)
// ------------------------------
export const getProductTemplateById = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (req.user?.role !== "admin") {
    query.isActive = true;
  }

  const template = await ProductTemplate.findOne(query);
  if (!template) {
    res.status(404);
    throw new Error("Product template not found");
  }

  res.json({
    success: true,
    data: template,
  });
});

// ------------------------------
// ✏️ @desc Update product template
// @route PATCH /api/v1/product-templates/:id
// @access Private (Admin only)
// ------------------------------
export const updateProductTemplate = asyncHandler(async (req, res) => {
  const { error, value } = updateTemplateSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const template = await ProductTemplate.findById(req.params.id);
  if (!template) {
    res.status(404);
    throw new Error("Product template not found");
  }

  const nextMrp = value.mrp ?? template.mrp;
  const nextPrice = value.price ?? template.price;
  if (nextPrice > nextMrp) {
    res.status(400);
    throw new Error("Template price cannot exceed template MRP");
  }

  Object.assign(template, value);
  await template.save();

  res.json({
    success: true,
    message: "Product template updated successfully",
    data: template,
  });
});

// ------------------------------
// 🗑️ @desc Delete product template (soft delete)
// @route DELETE /api/v1/product-templates/:id
// @access Private (Admin only)
// ------------------------------
export const deleteProductTemplate = asyncHandler(async (req, res) => {
  const template = await ProductTemplate.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!template) {
    res.status(404);
    throw new Error("Product template not found");
  }

  res.json({
    success: true,
    message: "Product template deleted successfully",
  });
});

// ------------------------------
// 📊 @desc Get product template metadata
// @route GET /api/v1/product-templates/metadata
// @access Private (Admin, Coach)
// ------------------------------
export const getProductTemplateMetadata = asyncHandler(async (req, res) => {
  const baseFilter = req.user?.role === "admin" ? {} : { isActive: true };

  const [categories, companies] = await Promise.all([
    ProductTemplate.distinct("category", baseFilter),
    ProductTemplate.distinct("companyName", baseFilter),
  ]);

  const normalizedCategories = categories
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const normalizedCompanies = companies
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  res.json({
    success: true,
    data: {
      categories: normalizedCategories,
      companies: normalizedCompanies,
      suggestedCategories,
    },
  });
});
