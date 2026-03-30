import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { documentUpload } from "../middlewares/upload.middleware.js";
import { uploadMyDocument, listMyDocuments, streamMyDocumentFile, deleteMyDocument } from "../controllers/documents.controller.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("client"), listMyDocuments);

router.get("/:id/file", protect, authorizeRoles("client"), streamMyDocumentFile);

router.delete("/:id", protect, authorizeRoles("client"), deleteMyDocument);

router.post(
  "/",
  protect,
  authorizeRoles("client"),
  documentUpload.single("file"),
  uploadMyDocument
);

export default router;
