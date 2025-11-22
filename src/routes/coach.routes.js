import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { checkCoachSubscription } from "../middlewares/subscriptionCheck.middleware.js";
import {
  getCoachStats,
  getCoachProgressTrend,
  getCoachClients,
  getPublicCoachProfile,
  getPublicCoachProgress,
  getCoachEarnings,
} from "../controllers/coach.controller.js";

import { getClientById } from "../controllers/users.controller.js";

const router = express.Router();

// Public route: coach profile card by referral code
router.get("/public-profile/:referralCode", getPublicCoachProfile);
router.get("/public-profile/:referralCode/progress", getPublicCoachProgress);

// Protected coach routes with subscription check
router.use(protect, authorizeRoles("coach"), checkCoachSubscription);

router.get("/stats", getCoachStats);
router.get("/client-progress", getCoachProgressTrend);
router.get("/earnings", getCoachEarnings);
router.get("/clients", getCoachClients);
router.get("/clients/:id", getClientById);

export default router;
