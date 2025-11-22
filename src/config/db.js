// src/config/db.js
import mongoose from "mongoose";

/**
 * Connect to MongoDB with performance and security best practices.
 */
const connectDB = async () => {
  try {
    // Validate MONGO_URI is present
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is required but not set");
    }

    mongoose.set("strictQuery", true); // Avoid unintentional queries
    // Enable autoIndex locally to ensure indexes like text indexes are created
    const isProd = process.env.NODE_ENV === "production";
    mongoose.set("autoIndex", !isProd);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20, // maintain up to 20 socket connections
      serverSelectionTimeoutMS: 5000, // timeout after 5s instead of hanging
      socketTimeoutMS: 45000, // close sockets after 45 seconds of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Connection events (for production monitoring)
    mongoose.connection.on("connected", () => {
      try {
        console.log("📡 Mongoose connected to DB");
      } catch (err) {
        console.error("Error in connected handler:", err);
      }
    });

    mongoose.connection.on("error", (err) => {
      try {
        console.error(`❌ Mongoose connection error: ${err?.message || err}`);
      } catch (handlerErr) {
        console.error("Error in error handler:", handlerErr);
      }
    });

    mongoose.connection.on("disconnected", () => {
      try {
        console.warn("⚠️ Mongoose disconnected");
      } catch (err) {
        console.error("Error in disconnected handler:", err);
      }
    });

    // Handle graceful shutdown (important in cloud deployments)
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        console.log("🧹 MongoDB connection closed through app termination (SIGINT)");
      } catch (err) {
        console.error("Error closing MongoDB connection (SIGINT):", err);
      } finally {
        process.exit(0);
      }
    });

    process.on("SIGTERM", async () => {
      try {
        await mongoose.connection.close();
        console.log("🧹 MongoDB connection closed through app termination (SIGTERM)");
      } catch (err) {
        console.error("Error closing MongoDB connection (SIGTERM):", err);
      } finally {
        process.exit(0);
      }
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
