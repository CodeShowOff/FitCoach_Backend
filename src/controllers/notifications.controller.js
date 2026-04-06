// src/controllers/notifications.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser } from "../socket/socketServer.js";

const createSchema = Joi.object({
  title: Joi.string().allow(null, "").max(120),
  message: Joi.string().min(1).max(1000).required(),
  type: Joi.string().valid("info", "order", "plan", "system").default("info"),
  target: Joi.object({
    mode: Joi.string().valid("all", "role", "coachClients", "specific").required(),
    role: Joi.string().valid("client", "coach", "admin").optional(),
    coachId: Joi.string().optional(),
    userIds: Joi.array().items(Joi.string()).optional(),
  }).required(),
  meta: Joi.object().optional(),
});

const toIdString = (value) => (value ? value.toString() : null);

const serializeNotification = (notification) => ({
  _id: toIdString(notification?._id),
  recipientId: toIdString(notification?.recipientId),
  senderId: toIdString(notification?.senderId),
  title: notification?.title ?? null,
  message: notification?.message ?? "",
  type: notification?.type ?? "info",
  meta: notification?.meta ?? {},
  readAt: notification?.readAt ?? null,
  createdAt: notification?.createdAt ?? new Date().toISOString(),
});

const emitNotificationCreated = (notification) => {
  const recipientId = toIdString(notification?.recipientId);
  if (!recipientId) return;

  emitToUser(recipientId, "notification:new", {
    notification: serializeNotification(notification),
  });
};

const emitNotificationUnreadCount = async (recipientId) => {
  const normalizedRecipientId = toIdString(recipientId);
  if (!normalizedRecipientId) return;

  const count = await Notification.countDocuments({ recipientId: normalizedRecipientId, readAt: null });
  emitToUser(normalizedRecipientId, "notification:unread-count", { count });
};

export const listMyNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const requestedLimit = parseInt(req.query.limit) || 20;
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const [rows, total, unread] = await Promise.all([
    Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipientId: req.user._id }),
    Notification.countDocuments({ recipientId: req.user._id, readAt: null }),
  ]);

  res.json({ success: true, data: rows, pagination: { total, page, totalPages: Math.ceil(total / limit) }, unread });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ recipientId: req.user._id, readAt: null });
  res.json({ success: true, count });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await Notification.findOneAndUpdate(
    { _id: id, recipientId: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!updated) {
    res.status(404);
    throw new Error("Notification not found or already read");
  }

  await emitNotificationUnreadCount(req.user._id);
  res.json({ success: true, data: updated });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ recipientId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  await emitNotificationUnreadCount(req.user._id);
  res.json({ success: true, updated: result.modifiedCount });
});

// Admin can notify all; coach can notify their clients or specific users
export const createBroadcast = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const isAdmin = req.user.role === "admin";
  const isCoach = req.user.role === "coach";

  const { title, message, type, target, meta } = value;

  let recipientsFilter = null;
  if (target.mode === "all") {
    if (!isAdmin) {
      res.status(403);
      throw new Error("Only admins can notify everyone");
    }
    recipientsFilter = { isActive: true };
  } else if (target.mode === "role") {
    if (!isAdmin) {
      res.status(403);
      throw new Error("Only admins can notify by role");
    }
    recipientsFilter = { role: target.role, isActive: true };
  } else if (target.mode === "coachClients") {
    if (!isCoach) {
      res.status(403);
      throw new Error("Only coaches can notify their clients");
    }
    const coachId = target.coachId || req.user._id.toString();
    recipientsFilter = { coachId, role: "client", isActive: true };
  } else if (target.mode === "specific") {
    const ids = (target.userIds || []).filter(Boolean);
    if (!ids.length) {
      res.status(400);
      throw new Error("Provide at least one user id");
    }
    // Coach can send to own clients; admin can send to anyone
    if (isCoach) {
      const count = await User.countDocuments({ _id: { $in: ids }, coachId: req.user._id });
      if (count !== ids.length) {
        res.status(403);
        throw new Error("Coaches can only message their clients");
      }
    } else if (!isAdmin) {
      res.status(403);
      throw new Error("Not allowed");
    }
    recipientsFilter = { _id: { $in: ids } };
  }

  const recipients = await User.find(recipientsFilter).select("_id").lean();
  if (!recipients.length) {
    res.status(400);
    throw new Error("No recipients found");
  }

  const docs = recipients.map((u) => ({
    recipientId: u._id,
    senderId: req.user._id,
    title: title || null,
    message,
    type,
    meta: meta || {},
  }));

  const inserted = await Notification.insertMany(docs);
  inserted.forEach((notification) => emitNotificationCreated(notification));
  res.status(201).json({ success: true, inserted: docs.length });
});

// Helper to create a single notification (internal use by other controllers)
export async function createNotification({ recipientId, userId = null, senderId = null, title = null, message, type = "info", meta = {} }) {
  try {
    const resolvedRecipientId = recipientId || userId;
    if (!resolvedRecipientId) {
      throw new Error("recipientId is required");
    }

    const notification = await Notification.create({
      recipientId: resolvedRecipientId,
      senderId,
      title,
      message,
      type,
      meta,
    });

    emitNotificationCreated(notification);
    return notification;
  } catch (e) {
    console.error("Failed to create notification:", e.message);
    return null;
  }
}
