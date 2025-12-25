// src/routes/coachDietPlan.routes.js
import express from "express";
import {
  createCoachDietPlan,
  getCoachDietPlans,
  getCoachDietPlanById,
  updateCoachDietPlan,
  deleteCoachDietPlan,
  createFromTemplate,
  assignToSubscriptionPlan,
  unassignFromSubscriptionPlan,
} from "../controllers/coachDietPlan.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { checkCoachSubscription } from "../middlewares/subscriptionCheck.middleware.js";

const router = express.Router();

// All routes require authentication, coach role, and active subscription
router.use(protect);
router.use(authorizeRoles("coach"));
router.use(checkCoachSubscription);

// CRUD routes
router.route("/").post(createCoachDietPlan).get(getCoachDietPlans);

router
  .route("/:id")
  .get(getCoachDietPlanById)
  .patch(updateCoachDietPlan)
  .delete(deleteCoachDietPlan);

// Create from template
router.post("/from-template/:templateId", createFromTemplate);

// Assignment routes
router
  .route("/:id/assign/:subscriptionPlanId")
  .post(assignToSubscriptionPlan)
  .delete(unassignFromSubscriptionPlan);

export default router;
