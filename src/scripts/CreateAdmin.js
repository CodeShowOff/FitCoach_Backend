// scripts/createAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
dotenv.config({ quiet: true });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log("Usage: node src/scripts/CreateAdmin.js admin@example.com StrongPass123!");
    console.log("Or via npm script: npm run create-admin -- admin@example.com StrongPass123!");
    process.exit(1);
  }

  const exists = await User.findOne({ email });
  if (exists) {
    console.log("User already exists:", email);
    process.exit(0);
  }

  const user = new User({
    fullName: "Administrator",
    email,
    password,
    role: "admin",
    isActive: true,
  });

  await user.save();
  console.log("Admin created:", user._id.toString());
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
