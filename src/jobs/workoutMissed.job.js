import mongoose from "mongoose";
import dotenv from "dotenv";
import ClientWorkoutLog from "../models/ClientWorkoutLog.js";

dotenv.config({ quiet: true });

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTStartOfDayUtc(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const istMidnightAsUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0, 0);
  return new Date(istMidnightAsUtc - IST_OFFSET_MS);
}

/**
 * Mark overdue workout logs as missed.
 * Overdue means scheduled/in_progress logs strictly before today's IST boundary.
 */
export const markOverdueWorkoutsAsMissed = async () => {
  const cutoff = getISTStartOfDayUtc();

  try {
    const result = await ClientWorkoutLog.updateMany(
      {
        status: { $in: ["scheduled", "in_progress"] },
        scheduledDate: { $lt: cutoff },
      },
      {
        $set: { status: "missed" },
      }
    );

    return {
      cutoff,
      matched: result.matchedCount ?? 0,
      modified: result.modifiedCount ?? 0,
    };
  } catch (error) {
    console.error("❌ Error in markOverdueWorkoutsAsMissed:", error);
    return {
      cutoff,
      matched: 0,
      modified: 0,
    };
  }
};

// Allow running this file directly: `node src/jobs/workoutMissed.job.js`
if (process.argv[1] && process.argv[1].includes("workoutMissed.job.js")) {
  (async () => {
    try {
      if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is required to run workout missed job");
        process.exit(1);
      }

      await mongoose.connect(process.env.MONGO_URI);
      const result = await markOverdueWorkoutsAsMissed();
      console.log(
        `Workout Missed Job: ${result.modified} workout(s) auto-marked missed (${result.matched} matched)`
      );
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("Failed to run workout missed job", err);
      process.exit(1);
    }
  })();
}
