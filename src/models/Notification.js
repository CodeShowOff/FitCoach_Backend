// src/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    roleScope: { type: String, enum: ["all", "clients", "coaches", "admins", null], default: null },
    title: { type: String, trim: true, default: null },
    message: { type: String, trim: true, required: true },
    type: { type: String, enum: ["info", "order", "plan", "system"], default: "info", index: true },
    meta: { type: Object, default: {} },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
