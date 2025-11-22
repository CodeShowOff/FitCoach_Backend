import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config({ quiet: true });

// This job can be invoked manually via a script or scheduler
// to remove stale, unverified accounts whose email verification
// code has expired and that never became active.

const DEFAULT_TTL_MINUTES = 60; // safety margin beyond OTP expiry

export const purgeStaleUnverifiedUsers = async (options = {}) => {
	try {
		const ttlMinutes = Number(options.ttlMinutes ?? DEFAULT_TTL_MINUTES);

		const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);

		const filter = {
			emailVerified: false,
			isActive: false,
			emailVerificationOtpExpire: { $lt: cutoff },
		};

		const result = await User.deleteMany(filter);
		return result?.deletedCount ?? 0;
	} catch (error) {
		console.error("❌ Error in purgeStaleUnverifiedUsers:", error);
		return 0;
	}
};

// Optional: allow running this file directly: `node src/jobs/reminders.job.js`
if (process.argv[1] && process.argv[1].includes("reminders.job.js")) {
	(async () => {
		try {
			if (!process.env.MONGO_URI) {
				console.error("MONGO_URI is required to run purge job");
				process.exit(1);
			}

			await mongoose.connect(process.env.MONGO_URI);
			const deleted = await purgeStaleUnverifiedUsers();
			console.log(`Purged ${deleted} stale unverified users`);
			await mongoose.disconnect();
			process.exit(0);
		} catch (err) {
			console.error("Failed to run purge job", err);
			process.exit(1);
		}
	})();
}

 