// src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { xss } from "express-xss-sanitizer";
import { errorHandler } from "./middlewares/error.middleware.js";
import { sanitizePayload } from "./middlewares/sanitize.middleware.js";
import { generalLimiter } from "./middlewares/rateLimit.middleware.js";


const app = express();

// If the app is running behind a proxy/load balancer (e.g. Vercel, Render,
// Nginx, or a cloud provider), trust the first proxy so rate limiting and
// other IP-based features work correctly with X-Forwarded-* headers.
// In typical local development this is harmless.
app.set("trust proxy", 1);

const parseOrigins = (value) => {
  if (!value) {
    return [];
  }

  return [...new Set(
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  )];
};

const clientOrigins = parseOrigins(process.env.CLIENT_URL);

const helmetConfig = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", ...clientOrigins],
      fontSrc: ["'self'", "https:", "data:"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    },
  },
  crossOriginEmbedderPolicy: { policy: "credentialless" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "no-referrer" },
};

// ------------------------------
// 🛡️ Security & Utility Middleware
// ------------------------------
app.use(helmet(helmetConfig)); // Secure headers with CSP, COEP, CORP
app.use(
  cors({
    origin: clientOrigins.length ? clientOrigins : undefined,
    credentials: true,
  })
); // Allow frontend
app.use(express.json({ limit: "10mb" })); // Parse JSON
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xss());
app.use(sanitizePayload);

// Logging (development only)
if (process.env.NODE_ENV !== "production") {
  console.log("📝 Morgan HTTP logger enabled (development mode)");
  app.use(morgan("dev"));
} else {
  console.log("📝 Morgan HTTP logger disabled (production mode)");
}

// ------------------------------
// 🩹 Health Check Route (before rate limiter for uptime monitoring)
// ------------------------------
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend API is up and running!",
  });
});

// ------------------------------
// ⚙️ Rate Limiter
// ------------------------------
app.use("/api", generalLimiter);

// ------------------------------
// 🧩 Import Routes
// ------------------------------
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import plansRoutes from "./routes/plans.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import progressPhotoRoutes from "./routes/progressPhoto.routes.js";
import productsRoutes from "./routes/products.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import coachRoutes from "./routes/coach.routes.js";
import planRequestRoutes from "./routes/planRequest.routes.js";
import voucherRoutes from "./routes/voucher.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import contactRequestRoutes from "./routes/contactRequest.routes.js";
import contactUsRoutes from "./routes/contactUs.routes.js";
import bugReportRoutes from "./routes/bugReport.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import waterIntakeRoutes from "./routes/waterIntake.routes.js";
import platformSubscriptionRoutes from "./routes/platformSubscription.routes.js";
import chatRoutes from "./routes/chat.routes.js";


// ------------------------------
// 🚀 Mount Routes
// ------------------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/plans", plansRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/progress-photos", progressPhotoRoutes);
app.use("/api/v1/products", productsRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/platform-subscription", platformSubscriptionRoutes);
app.use("/api/v1/plan-requests", planRequestRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/orders", ordersRoutes);
app.use("/api/v1/coach", coachRoutes);
app.use("/api/v1/water-intake", waterIntakeRoutes);
app.use("/api/v1/vouchers", voucherRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/contact-requests", contactRequestRoutes);
app.use("/api/v1/contact-us", contactUsRoutes);
app.use("/api/v1/bug-reports", bugReportRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/chat", chatRoutes);

// ------------------------------
// ❌ 404 Handler (Express 5)
// ------------------------------
// Use a catch-all middleware after all routes to return 404 for unknown paths.
app.use((req, res) => {
  try {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`,
    });
  } catch (error) {
    console.error("Error in 404 handler:", error);
    res.status(404).json({
      success: false,
      message: "Not found",
    });
  }
});

// ------------------------------
// ⚠️ Global Error Middleware
// ------------------------------
app.use(errorHandler);

export default app;
