import cron from "node-cron";
import { expireCompletedSubscriptions } from "../jobs/subscriptions.job.js";
import { initializeSubscriptionChecks } from "../jobs/subscriptionCheck.job.js";
import { cleanupOldMessages } from "../jobs/chatCleanup.job.js";

/**
 * Initialize all scheduled jobs
 * This keeps the server.js clean and centralizes job scheduling
 */
export const initializeScheduledJobs = () => {
  // Schedule subscription expiration check - runs every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const result = await expireCompletedSubscriptions();
      if (result.modified > 0) {
        console.log(`⏰ Cron: ${result.modified} subscription(s) expired`);
      }
    } catch (error) {
      console.error("❌ Subscription expiry cron job failed:", error);
    }
  });

  // Schedule chat message cleanup - runs daily at 3 AM
  cron.schedule("0 3 * * *", async () => {
    try {
      const result = await cleanupOldMessages();
      if (result.deleted > 0) {
        console.log(`🧹 Cron: ${result.deleted} old message(s) cleaned up`);
      }
    } catch (error) {
      console.error("❌ Chat cleanup cron job failed:", error);
    }
  });

  // Run once on startup to catch any missed expirations
  expireCompletedSubscriptions()
    .then((result) => {
      if (result.modified > 0) {
        console.log(`✅ Startup: ${result.modified} subscription(s) expired`);
      }
    })
    .catch((error) => {
      console.error("❌ STARTUP ERROR: Initial subscription expiry check failed");
      console.error("   Details:", error.message || error);
      console.error("⚠️  NOTE: This is non-critical. Hourly cron job will handle it");
    });

  // Initialize platform subscription checks (daily at midnight)
  try {
    initializeSubscriptionChecks();
  } catch (error) {
    console.error("❌ SCHEDULER ERROR: Failed to initialize daily subscription checks");
    console.error("   Details:", error.message || error);
    console.error("⚠️  IMPACT: Daily notifications for expiring subscriptions will not be sent");
    console.error("   Action: Check the error and restart the server\n");
  }

  console.log("📅 Scheduled jobs initialized");
};
