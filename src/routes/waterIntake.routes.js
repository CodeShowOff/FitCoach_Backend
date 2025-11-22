// src/routes/waterIntake.routes.js
import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  logWaterIntake,
  getTodayWaterIntake,
  getWaterIntakeAnalytics,
  deleteWaterIntake,
  getWaterIntakeEntries,
} from "../controllers/waterIntake.controller.js";

const router = express.Router();

// All routes require authentication and client role
router.use(protect, authorizeRoles("client", "coach"));

// Log water intake (only clients can log)
router.post("/", protect, authorizeRoles("client"), logWaterIntake);

// Get today's water intake
router.get("/today", getTodayWaterIntake);

// Get analytics (day/week/month/year)
router.get("/analytics", getWaterIntakeAnalytics);

// Get all entries with date range
router.get("/entries", getWaterIntakeEntries);

// Delete entry
router.delete("/:id", deleteWaterIntake);

export default router;
