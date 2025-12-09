/**
 * Migration Script: Add Existing Subscribers to Chat Conversations
 * 
 * This script finds all active/approved subscriptions and ensures
 * the clients are added to:
 * 1. Their coach's global broadcast conversation
 * 2. Their plan-specific group conversation
 * 3. A direct conversation with their coach
 * 
 * Run this once after deploying the chat system to include pre-existing members.
 * 
 * Usage: node src/scripts/migrateExistingMembersToChat.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import Plan from "../models/Plan.js";
import { 
  initializeClientChat, 
  addClientToPlanGroup,
  getOrCreateDirectConversation 
} from "../services/chat.service.js";

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const migrateExistingMembers = async () => {
  console.log("\n🚀 Starting chat migration for existing members...\n");
  
  const stats = {
    totalSubscriptions: 0,
    successfulMigrations: 0,
    alreadyMigrated: 0,
    errors: [],
  };

  try {
    // Find all active/approved subscriptions
    const activeSubscriptions = await Subscription.find({
      status: { $in: ["approved", "active"] },
      endDate: { $gte: new Date() }, // Not expired
    })
      .populate("clientId", "name email")
      .populate("coachId", "name email")
      .populate("planId", "title");

    stats.totalSubscriptions = activeSubscriptions.length;
    console.log(`📋 Found ${activeSubscriptions.length} active subscriptions\n`);

    if (activeSubscriptions.length === 0) {
      console.log("ℹ️  No active subscriptions found. Nothing to migrate.");
      return stats;
    }

    // Process each subscription
    for (const subscription of activeSubscriptions) {
      const clientId = subscription.clientId?._id?.toString();
      const coachId = subscription.coachId?._id?.toString();
      const planId = subscription.planId?._id?.toString();
      const planTitle = subscription.planId?.title || subscription.planTitle || "Unknown Plan";
      const clientName = subscription.clientId?.name || "Unknown Client";
      const coachName = subscription.coachId?.name || "Unknown Coach";

      if (!clientId || !coachId) {
        stats.errors.push({
          subscriptionId: subscription._id.toString(),
          error: "Missing clientId or coachId",
        });
        continue;
      }

      console.log(`👤 Processing: ${clientName} -> Coach: ${coachName}`);

      try {
        // 1. Add to global broadcast + create direct conversation
        await initializeClientChat(clientId, coachId);
        console.log(`   ✓ Added to global broadcast & direct chat`);

        // 2. Add to plan group if planId exists
        if (planId) {
          await addClientToPlanGroup(planId, coachId, clientId, planTitle);
          console.log(`   ✓ Added to plan group: ${planTitle}`);
        }

        stats.successfulMigrations++;
      } catch (error) {
        // Check if it's a "already exists" type error (not really an error)
        if (error.message?.includes("already") || error.code === 11000) {
          stats.alreadyMigrated++;
          console.log(`   ℹ️  Already migrated (skipped)`);
        } else {
          stats.errors.push({
            subscriptionId: subscription._id.toString(),
            clientName,
            coachName,
            error: error.message,
          });
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }

    return stats;
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
};

// Main execution
const main = async () => {
  console.log("═".repeat(60));
  console.log("  CHAT MIGRATION - Add Existing Members to Conversations");
  console.log("═".repeat(60));

  await connectDB();

  try {
    const stats = await migrateExistingMembers();

    console.log("\n" + "═".repeat(60));
    console.log("  MIGRATION SUMMARY");
    console.log("═".repeat(60));
    console.log(`  📊 Total Active Subscriptions: ${stats.totalSubscriptions}`);
    console.log(`  ✅ Successfully Migrated:      ${stats.successfulMigrations}`);
    console.log(`  ⏭️  Already Migrated (Skipped): ${stats.alreadyMigrated}`);
    console.log(`  ❌ Errors:                     ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log("\n  Error Details:");
      stats.errors.forEach((err, i) => {
        console.log(`    ${i + 1}. ${err.clientName || err.subscriptionId}: ${err.error}`);
      });
    }
    
    console.log("═".repeat(60));
    console.log("\n✨ Migration completed!\n");
  } catch (error) {
    console.error("\n❌ Migration failed with error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Database disconnected");
  }
};

main();
