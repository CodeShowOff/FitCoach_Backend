// src/routes/waterIntake.routes.js
import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  logWaterIntake,
  getTodayWaterIntake,
  getWaterIntakeAnalytics,
  deleteWaterIntake,
  getWaterIntakeEntries,
  getWaterGoal,
  updateWaterGoal,
} from "../controllers/waterIntake.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Log water intake (only clients can log)
router.post("/", authorizeRoles("client"), logWaterIntake);

// Get today's water intake (clients and coaches)
router.get("/today", authorizeRoles("client", "coach"), getTodayWaterIntake);

// Get and update user's daily water goal (only clients)
router.get("/goal", authorizeRoles("client"), getWaterGoal);
router.put("/goal", authorizeRoles("client"), updateWaterGoal);

// Get analytics (clients and coaches) - must come before /entries
router.get("/analytics", authorizeRoles("client", "coach"), getWaterIntakeAnalytics);

// Get all entries with date range (clients and coaches) - must come before /:id
router.get("/entries", authorizeRoles("client", "coach"), getWaterIntakeEntries);

// Delete entry (only clients can delete their own entries) - parameterized route must be last
router.delete("/:id", authorizeRoles("client"), deleteWaterIntake);

export default router;
