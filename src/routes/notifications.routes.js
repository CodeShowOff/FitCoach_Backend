// src/routes/notifications.routes.js
import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  listMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createBroadcast,
} from "../controllers/notifications.controller.js";

const router = express.Router();

router.use(protect);

// Current user notifications
router.get("/me", listMyNotifications);
router.get("/me/unread-count", getUnreadCount);
router.patch("/me/:id/read", markAsRead);
router.patch("/me/read-all", markAllAsRead);

// Broadcast: admin or coach (with constraints enforced in controller)
router.post("/broadcast", authorizeRoles("admin", "coach"), createBroadcast);

export default router;
