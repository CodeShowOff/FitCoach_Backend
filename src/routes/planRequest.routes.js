// src/routes/planRequest.routes.js
import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createPlanRequest,
  getMyPlanRequests,
  getCoachPendingPlanRequests,
  approvePlanRequest,
  declinePlanRequest,
  getClientPlanRequestsForCoach,
} from "../controllers/planRequest.controller.js";

const router = express.Router();

// Client creates a request & views own requests
router.post("/", protect, authorizeRoles("client"), createPlanRequest);
router.get("/my", protect, authorizeRoles("client"), getMyPlanRequests);

// Coach views pending requests & client history
router.get(
  "/coach/pending",
  protect,
  authorizeRoles("coach"),
  getCoachPendingPlanRequests
);
router.get(
  "/coach/client/:clientId",
  protect,
  authorizeRoles("coach"),
  getClientPlanRequestsForCoach
);

// Coach actions
router.patch(
  "/:id/approve",
  protect,
  authorizeRoles("coach"),
  approvePlanRequest
);
router.patch(
  "/:id/decline",
  protect,
  authorizeRoles("coach"),
  declinePlanRequest
);

export default router;