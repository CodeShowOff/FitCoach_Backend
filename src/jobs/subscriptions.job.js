import mongoose from "mongoose";
import dotenv from "dotenv";
import Subscription from "../models/Subscription.js";

dotenv.config({ quiet: true });

/**
 * Job to expire subscriptions that have passed their end date
 * This ensures clients automatically revert to default plans after subscription ends
 */
export const expireCompletedSubscriptions = async () => {
  try {
    const now = new Date();

    // Find all approved subscriptions that have passed their end date
    const result = await Subscription.updateMany(
      {
        status: "approved",
        endDate: { $lt: now },
      },
      {
        $set: { status: "expired" },
      }
    );

    return {
      matched: result.matchedCount ?? 0,
      modified: result.modifiedCount ?? 0,
    };
  } catch (error) {
    console.error("❌ Error in expireCompletedSubscriptions:", error);
    return {
      matched: 0,
      modified: 0,
    };
  }
};

// Allow running this file directly: `node src/jobs/subscriptions.job.js`
if (process.argv[1] && process.argv[1].includes("subscriptions.job.js")) {
  (async () => {
    try {
      if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is required to run subscription expiry job");
        process.exit(1);
      }

      await mongoose.connect(process.env.MONGO_URI);
      const result = await expireCompletedSubscriptions();
      console.log(`Subscription Expiry Job: ${result.modified} subscriptions expired (${result.matched} matched)`);
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("Failed to run subscription expiry job", err);
      process.exit(1);
    }
  })();
}
