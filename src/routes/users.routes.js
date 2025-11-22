import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { 
  uploadAvatar, 
  requestAccountDeletion, 
  getMyDeletionRequest,
  uploadPaymentQr 
} from "../controllers/users.controller.js";
import {
  getProfile,
  updateProfile,
  getClientsForCoach,
  getClientById,
  getAssignedCoach,
} from "../controllers/users.controller.js";
import {
  uploadAward,
  deleteAward,
  uploadTransformation,
  deleteTransformation,
} from "../controllers/gallery.controller.js";

const router = express.Router();

// Unify "/me" to return the enriched profile (with plan summaries)
router.get("/me", protect, authorizeRoles("client", "coach", "admin"), getProfile);
router.get("/profile", protect, authorizeRoles("client", "coach", "admin"), getProfile);
router.put("/profile", protect, authorizeRoles("client", "coach", "admin"), updateProfile);
router.get("/my-coach", protect, authorizeRoles("client"), getAssignedCoach);
router.get("/clients", protect, authorizeRoles("coach"), getClientsForCoach);
router.get(
  "/clients/:id",
  protect,
  authorizeRoles("coach"),
  getClientById
);
router.post(
  "/upload-avatar",
  protect,
  authorizeRoles("client", "coach", "admin"),
  upload.single("image"), // expects 'image' field
  uploadAvatar
);

// Account deletion request
router.post(
  "/request-deletion",
  protect,
  authorizeRoles("client", "coach"),
  requestAccountDeletion
);

router.get(
  "/my-deletion-request",
  protect,
  authorizeRoles("client", "coach"),
  getMyDeletionRequest
);

// Upload payment QR (coach/admin)
router.post(
  "/upload-payment-qr",
  protect,
  authorizeRoles("coach", "admin"),
  upload.single("image"),
  uploadPaymentQr
);

// Gallery uploads for coaches
router.post(
  "/upload-award",
  protect,
  authorizeRoles("coach"),
  upload.single("image"),
  uploadAward
);

router.delete(
  "/awards/:publicId",
  protect,
  authorizeRoles("coach"),
  deleteAward
);

router.post(
  "/upload-transformation",
  protect,
  authorizeRoles("coach"),
  upload.single("image"),
  uploadTransformation
);

router.delete(
  "/transformations/:publicId",
  protect,
  authorizeRoles("coach"),
  deleteTransformation
);


export default router;
