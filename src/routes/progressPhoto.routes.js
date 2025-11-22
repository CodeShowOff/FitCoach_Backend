// src/routes/progressPhoto.routes.js
import express from "express";
import {
  uploadProgressPhoto,
  getMyProgressPhotos,
  getClientProgressPhotos,
  deleteProgressPhoto,
} from "../controllers/progressPhoto.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

// Configure multer for progress photos with larger file size limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed (jpeg, png, webp)."));
  },
});

// ------------------------------
// 👤 Client Routes
// ------------------------------

// @route   POST /api/v1/progress-photos
// @desc    Upload a progress photo
// @access  Private (Client only)
router.post(
  "/",
  protect,
  authorizeRoles("client"),
  upload.single("photo"),
  uploadProgressPhoto
);

// @route   GET /api/v1/progress-photos/my
// @desc    Get logged-in client's progress photos (paginated)
// @access  Private (Client only)
router.get("/my", protect, authorizeRoles("client"), getMyProgressPhotos);

// @route   DELETE /api/v1/progress-photos/:photoId
// @desc    Delete a progress photo
// @access  Private (Client only - own photos)
router.delete("/:photoId", protect, authorizeRoles("client"), deleteProgressPhoto);

// ------------------------------
// 🧑‍🏫 Coach Routes
// ------------------------------

// @route   GET /api/v1/progress-photos/client/:clientId
// @desc    Get progress photos for a specific client (with pagination)
// @access  Private (Coach and Admin)
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles("coach", "admin"),
  getClientProgressPhotos
);

export default router;
