// src/controllers/documents.controller.js
import asyncHandler from "express-async-handler";
import streamifier from "streamifier";
import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import Document from "../models/Document.js";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function toClientDocumentPayload(doc) {
  return {
    _id: String(doc._id),
    userId: String(doc.userId),
    publicId: doc.publicId,
    resourceType: doc.resourceType,
    mimeType: doc.mimeType,
    originalName: doc.originalName,
    name: doc.name ?? null,
    bytes: doc.bytes ?? 0,
    format: doc.format ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    // Frontend should use this instead of the Cloudinary URL
    viewUrl: `/api/v1/documents/${String(doc._id)}/file`,
  };
}

// ------------------------------
// @desc Upload a health document (PDF/image) for current client
// @route POST /api/v1/documents
// @access Private (client)
// ------------------------------
export const uploadMyDocument = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";
  const isImage = IMAGE_MIME_TYPES.has(req.file.mimetype);

  const uploadOptions = {
    folder: `${folderPrefix}/${req.user.id}/documents`,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    resource_type: isImage ? "image" : "raw",
  };

  // Reduce size for images before storing (Cloudinary transformations)
  // Note: Cloudinary has limited server-side "compression" knobs for PDFs (raw uploads).
  if (isImage) {
    uploadOptions.transformation = [
      { width: 2000, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
      { flags: "force_strip" },
    ];
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  const providedNameRaw = typeof req.body?.name === "string" ? req.body.name : "";
  const providedName = providedNameRaw.trim();
  const fallbackName = req.file.originalname;

  const doc = await Document.create({
    userId: req.user._id,
    url: uploadResult.secure_url || uploadResult.url,
    publicId: uploadResult.public_id,
    resourceType: uploadResult.resource_type || (isImage ? "image" : "raw"),
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
    name: providedName || fallbackName,
    bytes: uploadResult.bytes || req.file.size || 0,
    format: uploadResult.format || null,
  });

  res.status(201).json({
    success: true,
    message: "Document uploaded successfully",
    data: toClientDocumentPayload(doc.toObject ? doc.toObject() : doc),
  });
});

// ------------------------------
// @desc List documents uploaded by current client
// @route GET /api/v1/documents
// @access Private (client)
// ------------------------------
export const listMyDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: docs.map(toClientDocumentPayload),
  });
});

// ------------------------------
// @desc Stream a document file for current client (no Cloudinary URL exposure)
// @route GET /api/v1/documents/:id/file
// @access Private (client)
// ------------------------------
export const streamMyDocumentFile = asyncHandler(async (req, res) => {
  const docId = req.params.id;

  const doc = await Document.findOne({ _id: docId, userId: req.user._id }).lean();
  if (!doc) {
    res.status(404);
    throw new Error("Document not found");
  }

  const upstream = await fetch(doc.url);
  if (!upstream.ok || !upstream.body) {
    res.status(502);
    throw new Error("Failed to fetch document");
  }

  const contentType = doc.mimeType || upstream.headers.get("content-type") || "application/octet-stream";
  const contentLength = upstream.headers.get("content-length");

  res.setHeader("Content-Type", contentType);
  if (contentLength) res.setHeader("Content-Length", contentLength);

  // Prevent caching of sensitive medical documents
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const filename = String(doc.originalName || doc.name || "document").replace(/[\r\n"]/g, "");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

  Readable.fromWeb(upstream.body).pipe(res);
});
