
// src/controllers/products.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const productSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).optional(),
  mrp: Joi.number().min(0).required(),
  price: Joi.number().min(0).required(),
  category: Joi.string().max(50).optional(),
  imageUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional(),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  mrp: Joi.number().min(0).optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().max(50).optional(),
  imageUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional(),
});

// ------------------------------
// ➕ @desc Create a new product
// @route POST /api/v1/products
// @access Private (Coach only)
// ------------------------------
export const createProduct = asyncHandler(async (req, res) => {
  const { error, value } = productSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const product = await Product.create({
    coachId: req.user._id,
    ...value,
  });

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
});

// ------------------------------
// 🧾 @desc Get all products
// @route GET /api/v1/products
// @access Private (Admin/Coach/Client)
// - Admin: can see all products
// - Coach: can see only own products
// - Client: can see products only from their assigned coach
// ------------------------------
export const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const { search, category } = req.query;
  const query = { isActive: true };

  if (category) query.category = category;

  // Role-based visibility
  if (req.user?.role === "coach") {
    // Coach sees only own products
    query.coachId = req.user._id;
  } else if (req.user?.role === "client") {
    // Client sees only products from their assigned coach
    if (!req.user.coachId) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page,
          totalPages: 0,
        },
      });
    }
    query.coachId = req.user.coachId;
  }
  // Admin can see all products (no coachId filter)

  // 🔍 Consistent case-insensitive regex search on name/description
  if (search && search.trim().length > 0) {
    const term = search.trim();
    query.$or = [
      { name: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ------------------------------
// 🔍 @desc Get a single product by ID
// @route GET /api/v1/products/:id
// @access Private (Admin/Coach/Client)
// - Admin: can access any active product
// - Coach: can access only own products
// - Client: can access products only from their assigned coach
// ------------------------------
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found or inactive");
  }

  if (req.user?.role === "coach") {
    if (product.coachId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Access denied — cannot view another coach’s product");
    }
  } else if (req.user?.role === "client") {
    if (!req.user.coachId || product.coachId.toString() !== req.user.coachId.toString()) {
      res.status(403);
      throw new Error("Access denied — you can only view your coach’s products");
    }
  }
  // Admin can view any active product

  res.json({
    success: true,
    data: product,
  });
});

// ------------------------------
// ✏️ @desc Update product details (coach only)
// @route PUT /api/v1/products/:id
// @access Private (Coach only)
// ------------------------------
export const updateProduct = asyncHandler(async (req, res) => {
  const { error, value } = updateProductSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.coachId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied — cannot modify another coach’s product");
  }

  Object.assign(product, value);
  await product.save();

  res.json({
    success: true,
    message: "Product updated successfully",
    data: product,
  });
});

// ------------------------------
// ❌ @desc Delete a product (coach only)
// @route DELETE /api/v1/products/:id
// @access Private (Coach only)
// ------------------------------
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.coachId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied — cannot delete another coach’s product");
  }

  await product.deleteOne();

  res.json({
    success: true,
    message: "Product deleted successfully",
  });
});

// ------------------------------
// @desc Upload product image (coach only)
// @route POST /api/v1/products/upload-image
// @access Private (Coach only)
// ------------------------------
export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  // folder prefix
  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/${req.user.id}/products`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 1000, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
          { flags: "force_strip" }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  // Optionally: store public_id somewhere — product creation route will accept imageUrl & imagePublicId
  res.status(201).json({
    success: true,
    message: "Image uploaded",
    data: {
      imageUrl: uploadResult.secure_url || uploadResult.url,
      imagePublicId: uploadResult.public_id,
    },
  });
});
