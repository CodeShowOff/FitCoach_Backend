
// src/controllers/products.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import Product from "../models/Product.js";
import ProductTemplate from "../models/ProductTemplate.js";
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

const createFromTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional().allow("", null),
  mrp: Joi.number().min(0).optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().max(50).optional().allow("", null),
  imageUrl: Joi.string().uri().optional().allow("", null),
  isActive: Joi.boolean().optional(),
  allowDuplicate: Joi.boolean().default(false),
});

const createFromTemplatesBulkSchema = Joi.object({
  templateIds: Joi.array()
    .items(Joi.string().trim().length(24).hex().required())
    .min(1)
    .max(100)
    .required(),
  allowDuplicate: Joi.boolean().default(false),
});

const deriveProductDataFromTemplate = (template, overrides = {}) => {
  const name = overrides.name || template.name;
  const description =
    overrides.description !== undefined
      ? overrides.description || undefined
      : template.description;
  const mrp = overrides.mrp ?? template.mrp;
  const price = overrides.price ?? template.price;
  const category =
    overrides.category !== undefined
      ? overrides.category || undefined
      : template.category;
  const imageUrl =
    overrides.imageUrl !== undefined
      ? overrides.imageUrl || undefined
      : template.imageUrl;

  return {
    name,
    description,
    mrp,
    price,
    category,
    imageUrl,
    imagePublicId:
      overrides.imageUrl !== undefined ? null : template.imagePublicId || null,
    isActive: overrides.isActive ?? true,
  };
};

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

  if (value.price > value.mrp) {
    res.status(400);
    throw new Error("Product price cannot exceed product MRP");
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
// 📥 @desc Create a coach product from product template
// @route POST /api/v1/products/from-template/:templateId
// @access Private (Coach only)
// ------------------------------
export const createProductFromTemplate = asyncHandler(async (req, res) => {
  const { error, value } = createFromTemplateSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const template = await ProductTemplate.findOne({
    _id: req.params.templateId,
    isActive: true,
  });

  if (!template) {
    res.status(404);
    throw new Error("Product template not found");
  }

  const productData = deriveProductDataFromTemplate(template, value);

  if (productData.price > productData.mrp) {
    res.status(400);
    throw new Error("Product price cannot exceed product MRP");
  }

  if (!value.allowDuplicate) {
    const existing = await Product.findOne({
      coachId: req.user._id,
      templateId: template._id,
      name: productData.name,
      isActive: true,
    }).select("_id");

    if (existing) {
      res.status(409);
      throw new Error("You already adopted this template with the same product name");
    }
  }

  const product = await Product.create({
    coachId: req.user._id,
    templateId: template._id,
    ...productData,
  });

  await ProductTemplate.findByIdAndUpdate(template._id, {
    $inc: { usageCount: 1 },
  });

  res.status(201).json({
    success: true,
    message: "Product created from template successfully",
    data: product,
  });
});

// ------------------------------
// 📥 @desc Create multiple coach products from product templates
// @route POST /api/v1/products/from-templates/bulk
// @access Private (Coach only)
// ------------------------------
export const createProductsFromTemplatesBulk = asyncHandler(async (req, res) => {
  const { error, value } = createFromTemplatesBulkSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const templateIds = [...new Set(value.templateIds.map((id) => id.trim()))];

  const templates = await ProductTemplate.find({
    _id: { $in: templateIds },
    isActive: true,
  });

  const templateMap = new Map(templates.map((template) => [template._id.toString(), template]));

  const createdProducts = [];
  const skipped = [];

  for (const templateId of templateIds) {
    const template = templateMap.get(templateId);

    if (!template) {
      skipped.push({
        templateId,
        reason: "Product template not found or inactive",
      });
      continue;
    }

    const productData = deriveProductDataFromTemplate(template);

    if (productData.price > productData.mrp) {
      skipped.push({
        templateId,
        templateName: template.name,
        reason: "Template price cannot exceed template MRP",
      });
      continue;
    }

    if (!value.allowDuplicate) {
      const existing = await Product.findOne({
        coachId: req.user._id,
        templateId: template._id,
        name: productData.name,
        isActive: true,
      }).select("_id");

      if (existing) {
        skipped.push({
          templateId,
          templateName: template.name,
          reason: "Template already adopted with the same product name",
        });
        continue;
      }
    }

    const product = await Product.create({
      coachId: req.user._id,
      templateId: template._id,
      ...productData,
    });

    createdProducts.push(product);
  }

  if (createdProducts.length > 0) {
    const usageOps = createdProducts.map((product) => ({
      updateOne: {
        filter: { _id: product.templateId },
        update: { $inc: { usageCount: 1 } },
      },
    }));

    await ProductTemplate.bulkWrite(usageOps);
  }

  res.status(createdProducts.length > 0 ? 201 : 200).json({
    success: true,
    message:
      createdProducts.length > 0
        ? `Created ${createdProducts.length} product${createdProducts.length > 1 ? "s" : ""}${
            skipped.length > 0 ? `, skipped ${skipped.length}` : ""
          }`
        : `No products created${skipped.length > 0 ? `, skipped ${skipped.length}` : ""}`,
    data: {
      createdProducts,
      createdCount: createdProducts.length,
      skipped,
      skippedCount: skipped.length,
    },
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

  // 🔍 Use text index for efficient search on name, description, and category
  if (search && search.trim().length > 0) {
    const term = search.trim();
    query.$text = { $search: term };
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

  const nextMrp = value.mrp ?? product.mrp;
  const nextPrice = value.price ?? product.price;
  if (nextPrice > nextMrp) {
    res.status(400);
    throw new Error("Product price cannot exceed product MRP");
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
