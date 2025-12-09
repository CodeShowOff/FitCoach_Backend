import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/db.js";
import { initializeScheduledJobs } from "./config/scheduler.js";
import app from "./app.js";
import { initializeSocketServer } from "./socket/socketServer.js";

// Load environment variables
dotenv.config();

console.log("🔧 Environment Configuration:");
console.log("   NODE_ENV:", process.env.NODE_ENV || "undefined (defaulting to development)");
console.log("   PORT:", process.env.PORT || 5000);

// Validate essential environment variables
const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Parse CORS origins for Socket.IO
const parseOrigins = (value) => {
  if (!value) return [];
  return [...new Set(
    value.split(",").map((origin) => origin.trim()).filter(Boolean)
  )];
};

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error("Failed to connect to DB:", error);
    process.exit(1);
  }

  if (NODE_ENV === "production" && !process.env.CLIENT_URL) {
    console.error("❌ CLIENT_URL environment variable is required in production for strict CORS.");
    process.exit(1);
  }

  // Create HTTP server from Express app
  const httpServer = http.createServer(app);

  // Initialize Socket.IO with the HTTP server
  const clientOrigins = parseOrigins(process.env.CLIENT_URL);
  initializeSocketServer(httpServer, clientOrigins);

  httpServer.listen(PORT, (error) => {
    if (error) {
      console.error("Failed to start the server:", error);
      process.exit(1);
    }
    console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
    console.log(`🔌 Socket.IO enabled for real-time chat`);
    
    // Initialize scheduled jobs (cron tasks)
    try {
      initializeScheduledJobs();
    } catch (error) {
      console.error("❌ SCHEDULER ERROR: Failed to initialize scheduled jobs");
      console.error("   Details:", error.message || error);
      console.error("⚠️  NOTE: Server is running normally, but automated tasks (subscription checks, etc.) may not execute");
      console.error("   Action: Check the error above and restart the server to retry");
    }
  });
};

startServer();

// Handle unhandled rejections & exceptions
process.on("unhandledRejection", (err) => {
  console.error("\n💥 CRITICAL: Unhandled Promise Rejection Detected");
  console.error("   Error:", err?.message || err);
  console.error("   Stack:", err?.stack);
  if (NODE_ENV === "production") {
    // In production, log the error but keep the server running
    console.error("⚠️  PRODUCTION MODE: Server continues running (error logged for review)");
    console.error("   Action: Review this error and fix the underlying issue\n");
  } else {
    // In development, exit to alert developer immediately
    console.error("🛑 DEVELOPMENT MODE: Server shutting down to alert developer");
    console.error("   Action: Fix the error above and restart the server\n");
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.error("\n💥 CRITICAL: Uncaught Exception Detected");
  console.error("   Error:", err?.message || err);
  console.error("   Stack:", err?.stack);
  if (NODE_ENV === "production") {
    // In production, log the error but keep the server running
    console.error("⚠️  PRODUCTION MODE: Server continues running (error logged for review)");
    console.error("   Action: Review this error and fix the underlying issue\n");
  } else {
    // In development, exit to alert developer immediately
    console.error("🛑 DEVELOPMENT MODE: Server shutting down to alert developer");
    console.error("   Action: Fix the error above and restart the server\n");
    process.exit(1);
  }
});