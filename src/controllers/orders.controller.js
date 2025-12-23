// src/controllers/orders.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { validateAndConsumeVoucherForOrder } from "./voucher.controller.js";
import { createNotification } from "./notifications.controller.js";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
      })
    )
    .min(1)
    .required(),
  paymentMode: Joi.string().valid("cash", "manual_qr").required(),
  paymentProofUrl: Joi.string()
    .uri()
    .allow(null, "")
    .when("paymentMode", {
      is: "manual_qr",
      then: Joi.required().messages({ "any.required": "Payment proof is required for QR payments" }),
      otherwise: Joi.optional(),
    }),
  notes: Joi.string().max(500).optional(),
  voucherCode: Joi.string().trim().optional().allow(null, ""),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("approved", "fulfilled", "completed", "cancelled", "rejected")
    .required(),
});

// ------------------------------
// 🛒 @desc Place a new order (Client)
// @route POST /api/v1/orders
// @access Private (Client)
// ------------------------------
export const placeOrder = asyncHandler(async (req, res) => {
  const { error, value } = createOrderSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { items, paymentProofUrl = null, notes, voucherCode, paymentMode } = value;

  // Fetch product details
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  if (products.length !== items.length) {
    res.status(400);
    throw new Error("Some products are invalid or unavailable");
  }

  // All products must belong to the same coach
  const coachId = products[0].coachId.toString();
  const sameCoach = products.every((p) => p.coachId.toString() === coachId);
  if (!sameCoach) {
    res.status(400);
    throw new Error("All products in an order must belong to the same coach");
  }

  // Construct order items
  const orderItems = items.map((item) => {
    const product = products.find((p) => p._id.toString() === item.productId);
    return {
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    };
  });

  // Calculate total
  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Optional voucher application (compute discount on the fly)
  let discountAmount = 0;
  let finalAmount = totalAmount;
  let appliedVoucherCode = null;

  if (voucherCode) {
    const voucher = await validateAndConsumeVoucherForOrder(
      req.user._id,
      coachId,
      voucherCode
    );

    if (voucher && voucher.discountPercent > 0) {
      discountAmount = Math.round(
        (totalAmount * voucher.discountPercent) / 100
      );
      finalAmount = Math.max(0, totalAmount - discountAmount);
      appliedVoucherCode = voucher.code;
    }
  }

  // Create order
  const order = await Order.create({
    clientId: req.user._id,
    coachId,
    items: orderItems,
    totalAmount,
    discountAmount,
    finalAmount,
    voucherCode: appliedVoucherCode,
    paymentProofUrl: paymentProofUrl || null,
    paymentMode,
    notes,
  });

  // Notify the coach about a new order
  createNotification({
    recipientId: coachId,
    senderId: req.user._id,
    title: "New Order",
    message: `${req.user.fullName || "A client"} placed a new order (#${order._id.toString().slice(-6)})`,
    type: "order",
    meta: { orderId: order._id },
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully. Awaiting coach approval.",
    data: order,
  });
});

// ------------------------------
// 📤 @desc Upload payment proof image (Client pre-order)
// @route POST /api/v1/orders/upload-proof
// @access Private (Client)
// ------------------------------
export const uploadOrderPaymentProof = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  // Lazy import to avoid circular dependency
  const { default: cloudinary } = await import("../config/cloudinary.js");
  const streamifier = (await import("streamifier")).default;

  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";
  const userId = req.user._id;

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/${userId}/payment_proofs`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 1200, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
          { flags: "force_strip" }
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  res.json({
    success: true,
    message: "Payment proof uploaded successfully",
    data: {
      url: uploadResult.secure_url || uploadResult.url,
      publicId: uploadResult.public_id,
    },
  });
});

// ------------------------------
// 📦 @desc Get all orders for logged-in client
// @route GET /api/v1/orders/my
// @access Private (Client)
// ------------------------------
export const getMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  // **Important**: filter by clientId for client's own orders
  const filter = { clientId: req.user._id };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  });
});

// ------------------------------
// 🧑‍🏫 @desc Get all orders for coach (their clients)
// @route GET /api/v1/orders/coach
// @access Private (Coach)
// ------------------------------
export const getCoachOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 10;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const filter = { coachId: req.user._id };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("clientId", "fullName email phone whatsappNumber address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  });
});

// ------------------------------
// 🚚 @desc Update order status (Coach/Admin)
// @route PATCH /api/v1/orders/:id/status
// @access Private (Coach/Admin)
// ------------------------------
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { error, value } = updateStatusSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isAdmin = req.user.role === "admin";
  const isCoach = req.user.role === "coach";
  const isClient = req.user.role === "client";

  if (isClient) {
    if (order.clientId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Access denied — cannot update another client's order");
    }
    const allowedClientStatuses = ["cancelled"];
    if (!allowedClientStatuses.includes(value.status)) {
      res.status(403);
      throw new Error("Clients can only cancel their own orders");
    }
    const immutableStatuses = ["completed", "cancelled", "rejected"];
    if (immutableStatuses.includes(order.status)) {
      res.status(400);
      throw new Error("This order can no longer be modified");
    }
  } else if (isCoach) {
    if (order.coachId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Access denied — cannot update another coach's order");
    }
    const immutableStatuses = ["completed", "cancelled", "rejected"];
    if (immutableStatuses.includes(order.status)) {
      res.status(400);
      throw new Error("This order can no longer be modified");
    }
  } else if (!isAdmin) {
    res.status(403);
    throw new Error("Access denied");
  }

  order.status = value.status;
  await order.save();

  res.json({
    success: true,
    message: `Order marked as ${value.status}`,
    data: order,
  });
});

// ------------------------------
// 📄 @desc Generate PDF invoice for an order
// @route GET /api/v1/orders/:id/invoice
// @access Private (Client/Coach/Admin)
// ------------------------------
export const generateInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("clientId", "fullName email phone address")
    .populate("coachId", "fullName email phone");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Authorization check
  const isClient = req.user.role === "client" && order.clientId._id.toString() === req.user._id.toString();
  const isCoach = req.user.role === "coach" && order.coachId._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isClient && !isCoach && !isAdmin) {
    res.status(403);
    throw new Error("Access denied - cannot view this invoice");
  }

  // Create PDF document
  const doc = new PDFDocument({ margin: 50 });

  // Set response headers for PDF download
  const filename = `invoice-${order._id}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // Pipe PDF to response
  doc.pipe(res);

  // Add PulseLedger logo and branding at the top
  const logoPath = path.join(__dirname, "../utils/logo.png");
  
  // Check if logo exists and add it
  if (fs.existsSync(logoPath)) {
    try {
      // Add logo centered at the top
      doc.image(logoPath, {
        fit: [80, 80],
        align: "center",
        valign: "top"
      });
      doc.moveDown(0.3);
    } catch (err) {
      console.error("Error adding logo to invoice:", err);
    }
  }

  // PulseLedger branding text
  doc.fontSize(20).font("Helvetica-Bold").fillColor("#2563eb").text("PulseLedger", { align: "center" });
  doc.fontSize(10).font("Helvetica").fillColor("#6b7280").text("Health Management Portal", { align: "center" });
  doc.moveDown(1);

  // Invoice header
  doc.fontSize(24).font("Helvetica-Bold").fillColor("#000000").text("INVOICE", { align: "center" });
  doc.moveDown(2);

  // Order details
  doc.fontSize(12).font("Helvetica-Bold").text("Order Information");
  doc.fontSize(10).font("Helvetica");
  doc.text(`Order ID: ${order._id}`);
  doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}`);
  doc.text(`Status: ${order.status.toUpperCase()}`);
  doc.text(`Payment Mode: ${order.paymentMode === "cash" ? "Cash on Delivery" : "QR/UPI Payment"}`);
  doc.moveDown(1.5);

  // Client details
  doc.fontSize(12).font("Helvetica-Bold").text("Bill To:");
  doc.fontSize(10).font("Helvetica");
  doc.text(order.clientId.fullName);
  doc.text(order.clientId.email);
  if (order.clientId.phone) {
    doc.text(`Phone: ${order.clientId.phone}`);
  }
  if (order.clientId.address?.line1) {
    doc.text(order.clientId.address.line1);
    if (order.clientId.address.line2) doc.text(order.clientId.address.line2);
    const cityState = [
      order.clientId.address.city,
      order.clientId.address.state,
      order.clientId.address.postalCode,
    ]
      .filter(Boolean)
      .join(", ");
    if (cityState) doc.text(cityState);
  }
  doc.moveDown(1.5);

  // Coach details
  doc.fontSize(12).font("Helvetica-Bold").text("From:");
  doc.fontSize(10).font("Helvetica");
  doc.text(order.coachId.fullName);
  doc.text(order.coachId.email);
  if (order.coachId.phone) {
    doc.text(`Phone: ${order.coachId.phone}`);
  }
  doc.moveDown(2);

  // Items table header
  const tableTop = doc.y;
  const itemCol = 50;
  const qtyCol = 300;
  const priceCol = 380;
  const amountCol = 460;

  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Item", itemCol, tableTop);
  doc.text("Qty", qtyCol, tableTop);
  doc.text("Price", priceCol, tableTop);
  doc.text("Amount", amountCol, tableTop);

  // Draw line under header
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  // Items
  let yPosition = tableTop + 25;
  doc.font("Helvetica").fontSize(9);

  order.items.forEach((item) => {
    const itemAmount = item.price * item.quantity;
    
    doc.text(item.name, itemCol, yPosition, { width: 240 });
    doc.text(item.quantity.toString(), qtyCol, yPosition);
    doc.text(`Rs. ${item.price.toFixed(2)}`, priceCol, yPosition);
    doc.text(`Rs. ${itemAmount.toFixed(2)}`, amountCol, yPosition);
    
    yPosition += 20;
  });

  // Draw line before total
  doc.moveTo(50, yPosition + 5).lineTo(550, yPosition + 5).stroke();
  yPosition += 20;

  // Discount if any
  if (order.discountAmount && order.discountAmount > 0) {
    doc.fontSize(10).font("Helvetica");
    doc.text("Subtotal:", 380, yPosition);
    doc.text(`Rs. ${(order.totalAmount + order.discountAmount).toFixed(2)}`, amountCol, yPosition);
    yPosition += 20;

    doc.text("Discount:", 380, yPosition);
    doc.text(`-Rs. ${order.discountAmount.toFixed(2)}`, amountCol, yPosition);
    yPosition += 20;
  }

  // Total
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("Total Amount:", 380, yPosition);
  doc.text(`Rs. ${order.totalAmount.toFixed(2)}`, amountCol, yPosition);

  // Notes if any
  if (order.notes) {
    doc.moveDown(2);
    doc.fontSize(10).font("Helvetica-Bold").text("Notes:");
    doc.fontSize(9).font("Helvetica").text(order.notes, { width: 500 });
  }

  // Footer
  const bottomY = doc.page.height - 100;
  doc.fontSize(8).font("Helvetica").text(
    "Thank you for your business!",
    50,
    bottomY,
    { align: "center", width: 500 }
  );
  doc.text(
    "For any queries, please contact your coach.",
    50,
    bottomY + 15,
    { align: "center", width: 500 }
  );

  // Finalize PDF
  doc.end();
});
