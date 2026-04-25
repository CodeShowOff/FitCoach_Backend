import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

import User from "../models/User.js";

dotenv.config({ quiet: true });

const firstNames = [
  "Aditi",
  "Rahul",
  "Pooja",
  "Kunal",
  "Meera",
  "Sahil",
  "Ishita",
  "Yash",
  "Nidhi",
  "Aditya",
  "Kavya",
  "Varun",
  "Simran",
  "Dev",
  "Ritika",
  "Manav",
  "Tanvi",
  "Harsh",
  "Sanya",
  "Nikhil",
];

const lastNames = [
  "Sharma",
  "Patel",
  "Verma",
  "Gupta",
  "Yadav",
  "Nair",
  "Reddy",
  "Khan",
  "Joshi",
  "Chopra",
  "Mishra",
  "Kulkarni",
  "Bansal",
  "Saxena",
  "Pillai",
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getArg(index, fallback = "") {
  return process.argv[index] || fallback;
}

async function run() {
  const coachCode = getArg(2).trim();
  const addCount = Number.parseInt(getArg(3, "49"), 10);

  if (!coachCode) {
    console.error("❌ Missing coach code.");
    console.error("Usage: node src/scripts/addClientsToCoachByCode.js <coachCode> [count]");
    process.exit(1);
  }

  if (!Number.isFinite(addCount) || addCount <= 0) {
    console.error("❌ Count must be a positive integer.");
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/fitcoach";
  await mongoose.connect(mongoUri);

  try {
    const coach = await User.findOne({
      role: "coach",
      $or: [{ coachCode }, { referralCode: coachCode }],
    }).select("_id fullName coachCode referralCode");

    if (!coach) {
      console.error(`❌ Coach not found for code: ${coachCode}`);
      process.exit(1);
    }

    const beforeCount = await User.countDocuments({
      role: "client",
      coachId: coach._id,
    });

    const safeCode = coachCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const emailPattern = new RegExp(
      `^${escapeRegex(safeCode)}-extra-client-\\d+@demo\\.fitcoach\\.local$`,
      "i"
    );

    const existingPatternCount = await User.countDocuments({ email: emailPattern });
    const passwordHash = await bcrypt.hash(
      process.env.DEMO_SEED_PASSWORD || "DemoPass123!",
      10
    );

    const docs = [];
    for (let i = 1; i <= addCount; i += 1) {
      const serial = existingPatternCount + i;
      const first = firstNames[(serial - 1) % firstNames.length];
      const last = lastNames[(serial * 2 - 1) % lastNames.length];

      docs.push({
        fullName: `${first} ${last}`,
        email: `${safeCode}-extra-client-${serial}@demo.fitcoach.local`,
        password: passwordHash,
        role: "client",
        coachId: coach._id,
        coachCode,
        phone: `811${String(3000000 + serial).padStart(7, "0")}`,
        whatsappNumber: `811${String(3000000 + serial).padStart(7, "0")}`,
        emailVerified: true,
        isActive: true,
      });
    }

    const inserted = await User.insertMany(docs, { ordered: true });

    const afterCount = await User.countDocuments({
      role: "client",
      coachId: coach._id,
    });

    console.log("✅ Clients added successfully");
    console.log(`Coach: ${coach.fullName}`);
    console.log(`Coach Code: ${coachCode}`);
    console.log(`Inserted now: ${inserted.length}`);
    console.log(`Before: ${beforeCount}`);
    console.log(`After: ${afterCount}`);
    console.log(
      `Sample login: ${docs[0].email} / ${process.env.DEMO_SEED_PASSWORD || "DemoPass123!"}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("❌ Failed to add clients:", error?.message || error);
  process.exit(1);
});
