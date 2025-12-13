// src/routes/plans.routes.js
import express from "express";
import {
  createPlan,
  getPlansForCoach,
  getPlansForClient,
  getPlanForCoachById,
  getPlanForClientById,
  updatePlanStatus,
  updatePlan,
  deletePlan,
} from "../controllers/plans.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { checkCoachSubscription } from "../middlewares/subscriptionCheck.middleware.js";

const router = express.Router();

// Client routes (placed BEFORE dynamic :id route to avoid '/my' being captured as :id)
router.get("/my", protect, authorizeRoles("client"), getPlansForClient);
router.get("/view/:id", protect, authorizeRoles("client"), getPlanForClientById);

// Coach routes with subscription check
router.post("/", protect, authorizeRoles("coach"), checkCoachSubscription, createPlan);
router.get("/", protect, authorizeRoles("coach"), checkCoachSubscription, getPlansForCoach);
router.get(
  "/:id",
  protect,
  authorizeRoles("coach"),
  checkCoachSubscription,
  getPlanForCoachById
);
router.patch("/:id/status", protect, authorizeRoles("coach"), checkCoachSubscription, updatePlanStatus);

// Update & delete plan (coach-only) with subscription check
router.patch("/:id", protect, authorizeRoles("coach"), checkCoachSubscription, updatePlan);
router.delete("/:id", protect, authorizeRoles("coach"), checkCoachSubscription, deletePlan);

export default router;
