// src/scripts/uploadExerciseAnimations.js
/**
 * Bulk upload exercise animations script
 * 
 * Usage:
 * 1. Create a folder with animation files named after exercise IDs or names
 * 2. Run: node src/scripts/uploadExerciseAnimations.js <folder_path>
 * 
 * File naming conventions:
 * - By ID: 507f1f77bcf86cd799439011.gif
 * - By name: push-ups.gif, barbell-bench-press.mp4
 * 
 * Supported formats: GIF, MP4, WebM, JPEG, PNG, WebP
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Exercise from "../models/Exercise.js";
import cloudinary from "../config/cloudinary.js";

dotenv.config();

// Animation URLs for common exercises (using placeholder URLs - replace with your own)
// You can use free exercise GIFs from sources like:
// - Create your own using Canva, Adobe, etc.
// - Use Lottie animations from lottiefiles.com
const SAMPLE_ANIMATION_URLS = {
  // Chest exercises
  "barbell bench press": null,
  "dumbbell bench press": null,
  "push-ups": null,
  "incline dumbbell press": null,
  "cable chest fly": null,
  
  // Back exercises
  "pull-ups": null,
  "lat pulldown": null,
  "barbell row": null,
  "seated cable row": null,
  "deadlift": null,
  
  // Shoulder exercises
  "overhead press": null,
  "lateral raises": null,
  "front raises": null,
  "face pulls": null,
  
  // Arm exercises
  "barbell curl": null,
  "dumbbell curl": null,
  "tricep pushdown": null,
  "tricep dips": null,
  
  // Leg exercises
  "barbell squat": null,
  "leg press": null,
  "lunges": null,
  "leg curl": null,
  "leg extension": null,
  "calf raises": null,
  
  // Core exercises
  "plank": null,
  "crunches": null,
  "russian twist": null,
  "leg raises": null,
  
  // Cardio
  "jumping jacks": null,
  "burpees": null,
  "mountain climbers": null,
  "high knees": null,
};

async function uploadFromFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`);
    process.exit(1);
  }

  const files = fs.readdirSync(folderPath).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return [".gif", ".mp4", ".webm", ".jpg", ".jpeg", ".png", ".webp"].includes(ext);
  });

  console.log(`📁 Found ${files.length} animation files in ${folderPath}`);

  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const baseName = path.basename(file, path.extname(file));
    const ext = path.extname(file).toLowerCase();

    try {
      // Try to find exercise by ID first, then by name
      let exercise;
      if (mongoose.Types.ObjectId.isValid(baseName)) {
        exercise = await Exercise.findById(baseName);
      }
      
      if (!exercise) {
        // Convert filename to exercise name (e.g., "barbell-bench-press" -> "Barbell Bench Press")
        const exerciseName = baseName
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        
        exercise = await Exercise.findOne({
          name: { $regex: new RegExp(`^${exerciseName}$`, "i") }
        });
      }

      if (!exercise) {
        console.log(`⚠️  Exercise not found for file: ${file}`);
        failed++;
        continue;
      }

      // Determine resource type
      const isVideo = [".mp4", ".webm"].includes(ext);

      // Upload to Cloudinary
      console.log(`📤 Uploading: ${file} -> ${exercise.name}`);
      
      const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        folder: `${folderPrefix}/exercises/animations`,
        public_id: `exercise_${exercise._id}_${Date.now()}`,
        resource_type: isVideo ? "video" : "image",
        overwrite: true,
        ...(isVideo ? {
          eager: [{ width: 200, height: 200, crop: "fill", format: "jpg" }],
          eager_async: false,
        } : {}),
      });

      // Update exercise
      exercise.animationUrl = uploadResult.secure_url;
      exercise.animationPublicId = uploadResult.public_id;
      
      if (isVideo && uploadResult.eager && uploadResult.eager[0]) {
        exercise.thumbnailUrl = uploadResult.eager[0].secure_url;
      } else {
        exercise.thumbnailUrl = uploadResult.secure_url;
      }
      
      await exercise.save();
      
      console.log(`✅ Uploaded: ${exercise.name}`);
      uploaded++;

    } catch (error) {
      console.error(`❌ Failed to upload ${file}:`, error.message);
      failed++;
    }
  }

  return { uploaded, failed };
}

async function updateFromURLs() {
  console.log("\n📋 Updating exercises with predefined URLs...\n");
  
  let updated = 0;
  let skipped = 0;

  for (const [exerciseName, animationUrl] of Object.entries(SAMPLE_ANIMATION_URLS)) {
    if (!animationUrl) {
      skipped++;
      continue;
    }

    try {
      const exercise = await Exercise.findOne({
        name: { $regex: new RegExp(`^${exerciseName}$`, "i") }
      });

      if (!exercise) {
        console.log(`⚠️  Exercise not found: ${exerciseName}`);
        continue;
      }

      exercise.animationUrl = animationUrl;
      exercise.thumbnailUrl = animationUrl;
      await exercise.save();
      
      console.log(`✅ Updated: ${exercise.name}`);
      updated++;

    } catch (error) {
      console.error(`❌ Failed to update ${exerciseName}:`, error.message);
    }
  }

  return { updated, skipped };
}

async function listExercisesWithoutAnimations() {
  const exercises = await Exercise.find({
    $or: [
      { animationUrl: { $exists: false } },
      { animationUrl: null },
      { animationUrl: "" }
    ],
    isActive: true
  }).select("name category").sort({ category: 1, name: 1 });

  console.log("\n📋 Exercises without animations:\n");
  
  let currentCategory = "";
  for (const ex of exercises) {
    if (ex.category !== currentCategory) {
      currentCategory = ex.category;
      console.log(`\n[${currentCategory.toUpperCase()}]`);
    }
    console.log(`  - ${ex.name} (${ex._id})`);
  }

  console.log(`\nTotal: ${exercises.length} exercises without animations`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    if (command === "list") {
      await listExercisesWithoutAnimations();
    } else if (command === "urls") {
      const result = await updateFromURLs();
      console.log(`\n📊 Summary: ${result.updated} updated, ${result.skipped} skipped (no URL)`);
    } else if (command && fs.existsSync(command)) {
      const result = await uploadFromFolder(command);
      console.log(`\n📊 Summary: ${result.uploaded} uploaded, ${result.failed} failed`);
    } else {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║         Exercise Animation Upload Script                   ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Usage:                                                    ║
║                                                            ║
║  1. Upload from folder:                                    ║
║     node src/scripts/uploadExerciseAnimations.js <folder>  ║
║                                                            ║
║     File naming conventions:                               ║
║     - By ID: 507f1f77bcf86cd799439011.gif                  ║
║     - By name: push-ups.gif, barbell-bench-press.mp4       ║
║                                                            ║
║  2. Update from predefined URLs:                           ║
║     node src/scripts/uploadExerciseAnimations.js urls      ║
║                                                            ║
║  3. List exercises without animations:                     ║
║     node src/scripts/uploadExerciseAnimations.js list      ║
║                                                            ║
║  Supported formats: GIF, MP4, WebM, JPEG, PNG, WebP        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

main();
