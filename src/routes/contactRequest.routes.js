import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createContactRequest,
  getCoachContactRequests,
  updateContactRequestStatus,
} from "../controllers/contactRequest.controller.js";

const router = express.Router();

// Public route - anyone can submit a contact request
router.post("/", createContactRequest);

// Coach routes - protected
router.get(
  "/coach/requests",
  protect,
  authorizeRoles("coach"),
  getCoachContactRequests
);

router.put(
  "/coach/requests/:id",
  protect,
  authorizeRoles("coach"),
  updateContactRequestStatus
);

export default router;
