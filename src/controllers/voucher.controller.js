import asyncHandler from "express-async-handler";
import Joi from "joi";
import Voucher from "../models/Voucher.js";

const createVoucherSchema = Joi.object({
  code: Joi.string().trim().min(2).max(50).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  discountPercent: Joi.number().min(1).max(100).required(),
  appliesToAllClients: Joi.boolean().required(),
  clientIds: Joi.array().items(Joi.string()).default([]),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional(),
});

const updateVoucherSchema = Joi.object({
  isActive: Joi.boolean().optional(),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional(),
});

export const createVoucher = asyncHandler(async (req, res) => {
  const { error, value } = createVoucherSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { code, name, discountPercent, appliesToAllClients, clientIds, validFrom, validTo } =
    value;

  if (!appliesToAllClients && (!clientIds || clientIds.length === 0)) {
    res.status(400);
    throw new Error("You must select at least one client or choose appliesToAllClients");
  }

  const existing = await Voucher.findOne({ coachId: req.user._id, code });
  if (existing) {
    res.status(400);
    throw new Error("A voucher with this code already exists for this coach");
  }

  const voucher = await Voucher.create({
    coachId: req.user._id,
    code,
    name,
    discountPercent,
    appliesToAllClients,
    clientIds: appliesToAllClients ? [] : clientIds,
    validFrom,
    validTo,
  });

  res.status(201).json({ success: true, message: "Voucher created", data: voucher });
});

export const getCoachVouchers = asyncHandler(async (req, res) => {
  const vouchers = await Voucher.find({ coachId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: vouchers });
});

export const updateVoucher = asyncHandler(async (req, res) => {
  const { error, value } = updateVoucherSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const voucher = await Voucher.findOne({ _id: req.params.id, coachId: req.user._id });
  if (!voucher) {
    res.status(404);
    throw new Error("Voucher not found or access denied");
  }

  Object.assign(voucher, value);
  await voucher.save();

  res.json({ success: true, message: "Voucher updated", data: voucher });
});

export const deleteVoucher = asyncHandler(async (req, res) => {
  const voucher = await Voucher.findOne({ _id: req.params.id, coachId: req.user._id });
  if (!voucher) {
    res.status(404);
    throw new Error("Voucher not found or access denied");
  }

  await voucher.deleteOne();

  res.json({ success: true, message: "Voucher deleted" });
});

export const getAvailableVouchersForClient = asyncHandler(async (req, res) => {
  const clientId = req.user._id;
  const coachId = req.user.coachId;

  if (!coachId) {
    return res.json({ success: true, data: [] });
  }

  const now = new Date();

  const vouchers = await Voucher.find({
    coachId,
    isActive: true,
    $or: [{ appliesToAllClients: true }, { clientIds: clientId }],
    $and: [
      {
        $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }],
      },
      {
        $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }],
      },
    ],
    redeemedBy: { $ne: clientId },
  })
    .select("code name discountPercent")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: vouchers });
});

export const validateAndConsumeVoucherForOrder = async (clientId, coachId, voucherCode) => {
  if (!voucherCode) return null;

  const now = new Date();

  const voucher = await Voucher.findOne({
    code: voucherCode,
    coachId,
    isActive: true,
    $or: [{ appliesToAllClients: true }, { clientIds: clientId }],
    $and: [
      {
        $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }],
      },
      {
        $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }],
      },
    ],
    redeemedBy: { $ne: clientId },
  });

  if (!voucher) {
    const err = new Error("Invalid or expired voucher");
    err.statusCode = 400;
    throw err;
  }

  voucher.redeemedBy.push(clientId);
  await voucher.save();

  return voucher;
};
