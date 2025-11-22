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

export default upload;
