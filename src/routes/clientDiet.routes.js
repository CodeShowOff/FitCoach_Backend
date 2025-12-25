// src/routes/clientDiet.routes.js
import express from "express";
import {
  getClientDietPlans,
  getClientDietPlanById,
  createDietLog,
  getClientDietLogs,
  getDietLogById,
  getDietLogByDate,
  updateDietLog,
  addMealToLog,
  deleteDietLog,
  getDietStats,
  getClientDietLogsForCoach,
  getClientDietStatsForCoach,
} from "../controllers/clientDiet.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { checkCoachSubscription } from "../middlewares/subscriptionCheck.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// =============================================
// CLIENT ROUTES
// =============================================
// Diet plans access
router.get("/plans", authorizeRoles("client"), getClientDietPlans);
router.get("/plans/:id", authorizeRoles("client"), getClientDietPlanById);

// Diet logs
router
  .route("/logs")
  .post(authorizeRoles("client"), createDietLog)
  .get(authorizeRoles("client"), getClientDietLogs);

// Stats - must come before :id route
router.get("/logs/stats/summary", authorizeRoles("client"), getDietStats);

// Get log by date - must come before :id route
router.get("/logs/date/:date", authorizeRoles("client"), getDietLogByDate);

router
  .route("/logs/:id")
  .get(authorizeRoles("client"), getDietLogById)
  .patch(authorizeRoles("client"), updateDietLog)
  .delete(authorizeRoles("client"), deleteDietLog);

router.post("/logs/:id/meals", authorizeRoles("client"), addMealToLog);

// =============================================
// COACH ROUTES (viewing client data)
// =============================================
router.get(
  "/coach/clients/:clientId/logs",
  authorizeRoles("coach"),
  checkCoachSubscription,
  getClientDietLogsForCoach
);

router.get(
  "/coach/clients/:clientId/stats",
  authorizeRoles("coach"),
  checkCoachSubscription,
  getClientDietStatsForCoach
);

export default router;
