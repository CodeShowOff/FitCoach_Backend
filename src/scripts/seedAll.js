// src/scripts/seedAll.js
/**
 * Master seed script - runs all seed scripts in sequence
 * Run: node src/scripts/seedAll.js
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const scripts = [
  { name: "Exercises", file: "seedExercises.js" },
  { name: "Food Items", file: "seedFoodItems.js" },
  { name: "Indian Foods", file: "seedIndianFoods.js" },
];

async function runScript(scriptPath, name) {
  return new Promise((resolve, reject) => {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🚀 Seeding ${name}...`);
    console.log("=".repeat(50));

    const child = spawn("node", [scriptPath], {
      stdio: "inherit",
      cwd: path.join(__dirname, "../.."),
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${name} seed failed with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function seedAll() {
  console.log("🌱 Starting database seeding...\n");

  for (const script of scripts) {
    try {
      await runScript(path.join(__dirname, script.file), script.name);
    } catch (error) {
      console.error(`❌ Error seeding ${script.name}:`, error.message);
      process.exit(1);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ All seeding complete!");
  console.log("=".repeat(50));
}

seedAll();
