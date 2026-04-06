// src/middlewares/upload.middleware.js
import multer from "multer";

// Memory storage — we stream buffer to Cloudinary, so no temp files on disk
const storage = multer.memoryStorage();

// Limits: file size (bytes). Adjust as desired.
// e.g., 5MB default for avatars, but the same middleware can be reused.
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB max file size; adjust if you want larger (e.g., product images)
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed (jpeg, png, webp)."));
  },
});

// Document upload middleware - supports PDFs and images up to 2MB
// Used for client health documents (bills, reports, etc.)
const documentUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB max for documents
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF or image files are allowed (pdf, jpeg, png, webp)."));
  },
});

// Animation upload middleware - supports GIFs and videos up to 10MB
const animationUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max for animations
  },
  fileFilter: (req, file, cb) => {
    // Accept images (including GIFs) and videos
    const allowedImages = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    const allowedVideos = ["video/mp4", "video/webm", "video/quicktime"];
    const allowed = [...allowedImages, ...allowedVideos];
    
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files (jpeg, png, webp, gif) or video files (mp4, webm) are allowed."));
  },
});

export default upload;
export { animationUpload, documentUpload };
