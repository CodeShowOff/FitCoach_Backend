// src/scripts/seedExercises.js
/**
 * Seed script to populate the Exercise collection with a comprehensive library
 * Run: node src/scripts/seedExercises.js
 * 
 * NOTE: Animation URLs are optional. In production, upload exercise animations
 * via the admin panel (Admin > Exercises > Edit > Animation Demo section).
 * 
 * Supported formats:
 * - GIF files (recommended for looping demos)
 * - MP4/WebM videos (will auto-generate thumbnails)
 * - Lottie JSON files (for vector animations)
 * 
 * You can find free exercise animations at:
 * - https://www.musclewiki.com (reference only)
 * - Create your own using tools like Canva, Adobe Animate, or Lottie
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Exercise from "../models/Exercise.js";

dotenv.config();

const exercises = [
  // ============================================
  // CHEST EXERCISES
  // ============================================
  {
    name: "Barbell Bench Press",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Lie flat on a bench with your feet on the ground",
      "Grip the barbell slightly wider than shoulder-width",
      "Unrack the bar and lower it to your mid-chest",
      "Press the bar back up to the starting position",
      "Keep your back slightly arched and shoulder blades squeezed"
    ],
    tips: [
      "Don't bounce the bar off your chest",
      "Keep your wrists straight",
      "Breathe in on the way down, out on the way up"
    ],
    isActive: true
  },
  {
    name: "Dumbbell Bench Press",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Lie on a flat bench holding dumbbells at chest level",
      "Press the dumbbells up until arms are extended",
      "Lower the weights back to chest level with control",
      "Keep your feet flat on the floor"
    ],
    tips: [
      "Keep dumbbells in line with your mid-chest",
      "Don't lock out elbows completely at the top"
    ],
    isActive: true
  },
  {
    name: "Incline Dumbbell Press",
    category: "strength",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    instructions: [
      "Set bench to 30-45 degree incline",
      "Hold dumbbells at shoulder level",
      "Press up and slightly together",
      "Lower with control to starting position"
    ],
    tips: [
      "Focus on upper chest contraction",
      "Don't set incline too steep"
    ],
    isActive: true
  },
  {
    name: "Push-ups",
    category: "strength",
    muscleGroups: ["chest", "triceps", "shoulders", "core"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Start in a high plank position with hands slightly wider than shoulders",
      "Lower your body until chest nearly touches the floor",
      "Push back up to starting position",
      "Keep your body in a straight line throughout"
    ],
    tips: [
      "Engage your core throughout",
      "Don't let hips sag or pike up",
      "Modify on knees if needed"
    ],
    isActive: true
  },
  {
    name: "Cable Chest Fly",
    category: "strength",
    muscleGroups: ["chest"],
    equipment: "cable_machine",
    difficulty: "intermediate",
    instructions: [
      "Set cables at chest height",
      "Grab handles and step forward",
      "With slight bend in elbows, bring hands together in front",
      "Slowly return to starting position"
    ],
    tips: [
      "Focus on squeezing chest at the center",
      "Control the movement, don't use momentum"
    ],
    isActive: true
  },
  {
    name: "Dumbbell Chest Fly",
    category: "strength",
    muscleGroups: ["chest"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    instructions: [
      "Lie on flat bench with dumbbells extended above chest",
      "Lower arms out to sides with slight elbow bend",
      "Feel stretch in chest, then bring weights back together",
      "Keep movement controlled throughout"
    ],
    tips: [
      "Don't go too deep - stop when you feel a stretch",
      "Keep slight bend in elbows throughout"
    ],
    isActive: true
  },
  {
    name: "Decline Bench Press",
    category: "strength",
    muscleGroups: ["chest", "triceps"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Lie on decline bench with feet secured",
      "Grip barbell slightly wider than shoulder-width",
      "Lower bar to lower chest",
      "Press back up to starting position"
    ],
    tips: [
      "Great for targeting lower chest",
      "Use a spotter for safety"
    ],
    isActive: true
  },

  // ============================================
  // BACK EXERCISES
  // ============================================
  {
    name: "Barbell Deadlift",
    category: "strength",
    muscleGroups: ["back", "glutes", "hamstrings", "core"],
    equipment: "barbell",
    difficulty: "advanced",
    instructions: [
      "Stand with feet hip-width apart, bar over mid-foot",
      "Bend at hips and knees to grip the bar",
      "Keep chest up and back flat",
      "Drive through heels to stand up with the bar",
      "Lower the bar with control by hinging at hips"
    ],
    tips: [
      "Keep the bar close to your body",
      "Don't round your lower back",
      "Engage lats before lifting"
    ],
    isActive: true
  },
  {
    name: "Pull-ups",
    category: "strength",
    muscleGroups: ["back", "biceps", "shoulders"],
    equipment: "pull_up_bar",
    difficulty: "intermediate",
    instructions: [
      "Hang from bar with overhand grip, hands wider than shoulders",
      "Pull yourself up until chin is over the bar",
      "Lower yourself with control",
      "Avoid swinging or kipping"
    ],
    tips: [
      "Start with assisted pull-ups if needed",
      "Focus on pulling with your back, not just arms"
    ],
    isActive: true
  },
  {
    name: "Lat Pulldown",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: "cable_machine",
    difficulty: "beginner",
    instructions: [
      "Sit at lat pulldown machine with thighs secured",
      "Grip bar wider than shoulder-width",
      "Pull bar down to upper chest",
      "Slowly return to starting position"
    ],
    tips: [
      "Don't lean back excessively",
      "Squeeze shoulder blades together at bottom"
    ],
    isActive: true
  },
  {
    name: "Barbell Bent Over Row",
    category: "strength",
    muscleGroups: ["back", "biceps", "shoulders"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Hold barbell with overhand grip",
      "Hinge at hips until torso is nearly parallel to floor",
      "Pull bar to lower chest/upper abs",
      "Lower with control"
    ],
    tips: [
      "Keep core tight and back flat",
      "Don't use momentum to swing the weight"
    ],
    isActive: true
  },
  {
    name: "Dumbbell Single Arm Row",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Place one knee and hand on bench for support",
      "Hold dumbbell in opposite hand, arm extended",
      "Pull dumbbell up to hip level",
      "Lower with control and repeat"
    ],
    tips: [
      "Keep back flat and parallel to ground",
      "Drive elbow up and back"
    ],
    isActive: true
  },
  {
    name: "Seated Cable Row",
    category: "strength",
    muscleGroups: ["back", "biceps"],
    equipment: "cable_machine",
    difficulty: "beginner",
    instructions: [
      "Sit at cable row station with feet on platform",
      "Grab handle with both hands",
      "Pull handle to lower chest/upper abs",
      "Extend arms back with control"
    ],
    tips: [
      "Keep chest up throughout movement",
      "Don't round your lower back"
    ],
    isActive: true
  },
  {
    name: "T-Bar Row",
    category: "strength",
    muscleGroups: ["back", "biceps", "shoulders"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Straddle the T-bar with feet shoulder-width apart",
      "Bend at hips and grab handles",
      "Pull weight up toward chest",
      "Lower with control"
    ],
    tips: [
      "Keep back flat throughout",
      "Great for building back thickness"
    ],
    isActive: true
  },
  {
    name: "Face Pulls",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: "cable_machine",
    difficulty: "beginner",
    instructions: [
      "Set cable at face height with rope attachment",
      "Pull rope toward face, separating hands",
      "Squeeze shoulder blades together",
      "Return with control"
    ],
    tips: [
      "Great for shoulder health and posture",
      "Keep elbows high throughout"
    ],
    isActive: true
  },

  // ============================================
  // SHOULDER EXERCISES
  // ============================================
  {
    name: "Overhead Press",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Stand with feet shoulder-width apart",
      "Hold barbell at shoulder height, grip slightly wider than shoulders",
      "Press bar overhead until arms are fully extended",
      "Lower bar back to shoulders with control"
    ],
    tips: [
      "Keep core tight to protect lower back",
      "Don't lean back excessively"
    ],
    isActive: true
  },
  {
    name: "Dumbbell Shoulder Press",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Sit or stand holding dumbbells at shoulder height",
      "Press dumbbells overhead",
      "Lower back to starting position"
    ],
    tips: [
      "Keep wrists straight",
      "Don't lock elbows at the top"
    ],
    isActive: true
  },
  {
    name: "Lateral Raises",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Stand with dumbbells at your sides",
      "Raise arms out to sides until parallel with floor",
      "Lower with control",
      "Keep slight bend in elbows"
    ],
    tips: [
      "Don't swing the weights",
      "Lead with elbows, not hands"
    ],
    isActive: true
  },
  {
    name: "Front Raises",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Stand with dumbbells in front of thighs",
      "Raise one or both arms in front to shoulder height",
      "Lower with control",
      "Alternate arms or do both together"
    ],
    tips: [
      "Don't use momentum",
      "Keep core engaged"
    ],
    isActive: true
  },
  {
    name: "Rear Delt Fly",
    category: "strength",
    muscleGroups: ["shoulders", "back"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    instructions: [
      "Bend over at hips with dumbbells hanging down",
      "Raise arms out to sides, squeezing shoulder blades",
      "Lower with control",
      "Keep slight bend in elbows"
    ],
    tips: [
      "Focus on rear deltoids",
      "Don't use too heavy weight"
    ],
    isActive: true
  },
  {
    name: "Arnold Press",
    category: "strength",
    muscleGroups: ["shoulders", "triceps"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    instructions: [
      "Start with dumbbells at shoulder height, palms facing you",
      "Press up while rotating palms to face forward",
      "Reverse the movement on the way down"
    ],
    tips: [
      "Great for full shoulder development",
      "Control the rotation throughout"
    ],
    isActive: true
  },
  {
    name: "Upright Row",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Hold barbell with narrow grip in front of thighs",
      "Pull bar up to chin level, leading with elbows",
      "Lower with control"
    ],
    tips: [
      "Keep bar close to body",
      "Don't go too heavy - can stress shoulders"
    ],
    isActive: true
  },
  {
    name: "Shrugs",
    category: "strength",
    muscleGroups: ["shoulders"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Stand holding dumbbells at sides",
      "Raise shoulders toward ears",
      "Hold briefly at top",
      "Lower with control"
    ],
    tips: [
      "Don't roll shoulders",
      "Focus on straight up and down movement"
    ],
    isActive: true
  },

  // ============================================
  // ARM EXERCISES
  // ============================================
  {
    name: "Barbell Bicep Curl",
    category: "strength",
    muscleGroups: ["biceps"],
    equipment: "barbell",
    difficulty: "beginner",
    instructions: [
      "Stand with barbell, arms extended, palms facing forward",
      "Curl bar up toward shoulders",
      "Squeeze biceps at top",
      "Lower with control"
    ],
    tips: [
      "Keep elbows at sides",
      "Don't swing the weight"
    ],
    isActive: true
  },
  {
    name: "Dumbbell Bicep Curl",
    category: "strength",
    muscleGroups: ["biceps"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Stand with dumbbells at sides, palms facing forward",
      "Curl weights up toward shoulders",
      "Lower with control"
    ],
    tips: [
      "Can alternate arms or do both together",
      "Keep upper arms stationary"
    ],
    isActive: true
  },
  {
    name: "Hammer Curls",
    category: "strength",
    muscleGroups: ["biceps", "forearms"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Stand with dumbbells at sides, palms facing each other",
      "Curl weights up keeping neutral grip",
      "Lower with control"
    ],
    tips: [
      "Great for brachialis and forearms",
      "Keep elbows at sides"
    ],
    isActive: true
  },
  {
    name: "Preacher Curl",
    category: "strength",
    muscleGroups: ["biceps"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Sit at preacher bench with arms over pad",
      "Curl bar up toward shoulders",
      "Lower with control, fully extending arms"
    ],
    tips: [
      "Great for bicep isolation",
      "Don't swing or use momentum"
    ],
    isActive: true
  },
  {
    name: "Tricep Pushdown",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: "cable_machine",
    difficulty: "beginner",
    instructions: [
      "Stand at cable machine with rope or bar attachment",
      "Keep elbows at sides and push down",
      "Squeeze triceps at bottom",
      "Return with control"
    ],
    tips: [
      "Keep upper arms stationary",
      "Don't lean forward excessively"
    ],
    isActive: true
  },
  {
    name: "Tricep Dips",
    category: "strength",
    muscleGroups: ["triceps", "chest", "shoulders"],
    equipment: "bench",
    difficulty: "intermediate",
    instructions: [
      "Grip parallel bars and lift yourself up",
      "Lower body by bending elbows to 90 degrees",
      "Push back up to starting position"
    ],
    tips: [
      "Keep body upright to target triceps",
      "Lean forward slightly to target chest more"
    ],
    isActive: true
  },
  {
    name: "Overhead Tricep Extension",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Hold dumbbell overhead with both hands",
      "Lower weight behind head by bending elbows",
      "Extend arms back up"
    ],
    tips: [
      "Keep elbows pointing forward",
      "Control the weight throughout"
    ],
    isActive: true
  },
  {
    name: "Skull Crushers",
    category: "strength",
    muscleGroups: ["triceps"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Lie on bench with EZ bar extended above chest",
      "Lower bar toward forehead by bending elbows",
      "Extend arms back to starting position"
    ],
    tips: [
      "Keep upper arms stationary",
      "Don't flare elbows out"
    ],
    isActive: true
  },
  {
    name: "Close Grip Bench Press",
    category: "strength",
    muscleGroups: ["triceps", "chest"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Lie on bench and grip bar with hands close together",
      "Lower bar to chest keeping elbows tucked",
      "Press back up"
    ],
    tips: [
      "Great compound movement for triceps",
      "Keep elbows close to body"
    ],
    isActive: true
  },

  // ============================================
  // LEG EXERCISES
  // ============================================
  {
    name: "Barbell Back Squat",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Position bar on upper back/traps",
      "Stand with feet shoulder-width apart",
      "Squat down until thighs are parallel to floor",
      "Drive through heels to stand back up"
    ],
    tips: [
      "Keep chest up and core tight",
      "Don't let knees cave inward",
      "Go as deep as mobility allows"
    ],
    isActive: true
  },
  {
    name: "Front Squat",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "core"],
    equipment: "barbell",
    difficulty: "advanced",
    instructions: [
      "Position bar on front of shoulders",
      "Keep elbows high and chest up",
      "Squat down keeping torso upright",
      "Drive up through heels"
    ],
    tips: [
      "More quad-dominant than back squat",
      "Requires good wrist and shoulder mobility"
    ],
    isActive: true
  },
  {
    name: "Goblet Squat",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: "dumbbell",
    difficulty: "beginner",
    instructions: [
      "Hold dumbbell vertically at chest",
      "Squat down between legs",
      "Keep chest up throughout",
      "Stand back up"
    ],
    tips: [
      "Great for learning squat form",
      "Can go deep with this variation"
    ],
    isActive: true
  },
  {
    name: "Leg Press",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: "none",
    difficulty: "beginner",
    instructions: [
      "Sit in leg press with feet shoulder-width on platform",
      "Lower weight by bending knees toward chest",
      "Press back up without locking knees"
    ],
    tips: [
      "Don't let lower back round off pad",
      "Keep feet flat on platform"
    ],
    isActive: true
  },
  {
    name: "Lunges",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand with feet together",
      "Step forward and lower back knee toward ground",
      "Push through front heel to return",
      "Alternate legs"
    ],
    tips: [
      "Keep torso upright",
      "Don't let front knee go past toes"
    ],
    isActive: true
  },
  {
    name: "Bulgarian Split Squat",
    category: "strength",
    muscleGroups: ["quadriceps", "glutes"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    instructions: [
      "Place rear foot on bench behind you",
      "Lower until back knee nearly touches ground",
      "Drive through front heel to stand",
      "Complete all reps then switch legs"
    ],
    tips: [
      "Great for addressing leg imbalances",
      "Keep torso relatively upright"
    ],
    isActive: true
  },
  {
    name: "Romanian Deadlift",
    category: "strength",
    muscleGroups: ["hamstrings", "glutes", "lower_back"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Hold barbell at hip level with slight knee bend",
      "Hinge at hips, pushing butt back",
      "Lower bar along legs until you feel hamstring stretch",
      "Drive hips forward to stand"
    ],
    tips: [
      "Keep bar close to legs",
      "Don't round your back"
    ],
    isActive: true
  },
  {
    name: "Leg Curl",
    category: "strength",
    muscleGroups: ["hamstrings"],
    equipment: "none",
    difficulty: "beginner",
    instructions: [
      "Lie face down on leg curl machine",
      "Curl heels toward glutes",
      "Squeeze hamstrings at top",
      "Lower with control"
    ],
    tips: [
      "Don't lift hips off pad",
      "Control the negative"
    ],
    isActive: true
  },
  {
    name: "Leg Extension",
    category: "strength",
    muscleGroups: ["quadriceps"],
    equipment: "none",
    difficulty: "beginner",
    instructions: [
      "Sit in machine with pad on lower shins",
      "Extend legs until straight",
      "Squeeze quads at top",
      "Lower with control"
    ],
    tips: [
      "Don't use momentum",
      "Great for quad isolation"
    ],
    isActive: true
  },
  {
    name: "Calf Raises",
    category: "strength",
    muscleGroups: ["calves"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand on edge of step with heels hanging off",
      "Rise up onto toes as high as possible",
      "Lower heels below step level",
      "Repeat"
    ],
    tips: [
      "Pause at top for better contraction",
      "Can add weight for progression"
    ],
    isActive: true
  },
  {
    name: "Hip Thrust",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings"],
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Sit with upper back against bench, barbell over hips",
      "Drive through heels to lift hips",
      "Squeeze glutes at top",
      "Lower with control"
    ],
    tips: [
      "Keep chin tucked",
      "Drive through heels, not toes"
    ],
    isActive: true
  },
  {
    name: "Glute Bridge",
    category: "strength",
    muscleGroups: ["glutes", "hamstrings"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Lie on back with knees bent, feet flat",
      "Drive through heels to lift hips",
      "Squeeze glutes at top",
      "Lower with control"
    ],
    tips: [
      "Great warm-up exercise",
      "Don't hyperextend lower back"
    ],
    isActive: true
  },

  // ============================================
  // CORE EXERCISES
  // ============================================
  {
    name: "Plank",
    category: "strength",
    muscleGroups: ["core", "shoulders"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Start in push-up position on forearms",
      "Keep body in straight line from head to heels",
      "Hold position, engaging core throughout",
      "Don't let hips sag or pike up"
    ],
    tips: [
      "Squeeze glutes to help maintain position",
      "Breathe normally throughout"
    ],
    isActive: true
  },
  {
    name: "Dead Bug",
    category: "strength",
    muscleGroups: ["core"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Lie on back with arms extended up, knees bent 90 degrees",
      "Lower opposite arm and leg toward floor",
      "Keep lower back pressed into ground",
      "Return and repeat other side"
    ],
    tips: [
      "Great for core stability",
      "Move slowly and controlled"
    ],
    isActive: true
  },
  {
    name: "Crunches",
    category: "strength",
    muscleGroups: ["core"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Lie on back with knees bent",
      "Place hands behind head or across chest",
      "Curl shoulders off ground toward knees",
      "Lower with control"
    ],
    tips: [
      "Don't pull on neck",
      "Focus on contracting abs"
    ],
    isActive: true
  },
  {
    name: "Russian Twist",
    category: "strength",
    muscleGroups: ["core", "obliques"],
    equipment: "bodyweight",
    difficulty: "intermediate",
    instructions: [
      "Sit with knees bent, lean back slightly",
      "Hold hands together or hold weight",
      "Rotate torso side to side",
      "Keep core engaged throughout"
    ],
    tips: [
      "Don't just move arms - rotate torso",
      "Can lift feet for more challenge"
    ],
    isActive: true
  },
  {
    name: "Bicycle Crunches",
    category: "strength",
    muscleGroups: ["core", "obliques"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Lie on back with hands behind head",
      "Bring opposite elbow to opposite knee",
      "Extend other leg straight",
      "Alternate sides in pedaling motion"
    ],
    tips: [
      "Keep lower back pressed into ground",
      "Don't pull on neck"
    ],
    isActive: true
  },
  {
    name: "Hanging Leg Raise",
    category: "strength",
    muscleGroups: ["core", "hip_flexors"],
    equipment: "pull_up_bar",
    difficulty: "advanced",
    instructions: [
      "Hang from pull-up bar",
      "Raise legs until parallel to ground or higher",
      "Lower with control",
      "Avoid swinging"
    ],
    tips: [
      "Start with knee raises if too difficult",
      "Great for lower abs"
    ],
    isActive: true
  },
  {
    name: "Ab Wheel Rollout",
    category: "strength",
    muscleGroups: ["core"],
    equipment: "none",
    difficulty: "advanced",
    instructions: [
      "Kneel with ab wheel in front",
      "Roll forward extending body",
      "Go as far as you can control",
      "Roll back to starting position"
    ],
    tips: [
      "Keep core tight throughout",
      "Don't let lower back sag"
    ],
    isActive: true
  },
  {
    name: "Mountain Climbers",
    category: "cardio",
    muscleGroups: ["core", "shoulders", "hip_flexors"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Start in push-up position",
      "Drive one knee toward chest",
      "Quickly switch legs",
      "Continue alternating at pace"
    ],
    tips: [
      "Keep hips down",
      "Great for cardio and core"
    ],
    isActive: true
  },
  {
    name: "Side Plank",
    category: "strength",
    muscleGroups: ["obliques", "core"],
    equipment: "bodyweight",
    difficulty: "intermediate",
    instructions: [
      "Lie on side propped up on forearm",
      "Lift hips to create straight line",
      "Hold position",
      "Repeat on other side"
    ],
    tips: [
      "Don't let hips sag",
      "Stack feet or stagger for balance"
    ],
    isActive: true
  },

  // ============================================
  // CARDIO EXERCISES
  // ============================================
  {
    name: "Running",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "calves"],
    equipment: "treadmill",
    difficulty: "beginner",
    instructions: [
      "Start at comfortable pace",
      "Maintain steady breathing rhythm",
      "Land with midfoot strike",
      "Keep arms relaxed at sides"
    ],
    tips: [
      "Start slow and build endurance",
      "Proper footwear is important"
    ],
    isActive: true
  },
  {
    name: "Cycling",
    category: "cardio",
    muscleGroups: ["quadriceps", "hamstrings", "calves"],
    equipment: "stationary_bike",
    difficulty: "beginner",
    instructions: [
      "Adjust seat height so leg is slightly bent at bottom",
      "Maintain steady cadence",
      "Keep core engaged",
      "Vary resistance for intensity"
    ],
    tips: [
      "Low impact option for cardio",
      "Great for leg endurance"
    ],
    isActive: true
  },
  {
    name: "Rowing Machine",
    category: "cardio",
    muscleGroups: ["back", "quadriceps", "hamstrings", "biceps"],
    equipment: "rowing_machine",
    difficulty: "intermediate",
    instructions: [
      "Sit on rower with feet strapped in",
      "Push with legs first, then pull with arms",
      "Return by extending arms, then bending knees",
      "Maintain steady rhythm"
    ],
    tips: [
      "Full body cardio workout",
      "Focus on leg drive first"
    ],
    isActive: true
  },
  {
    name: "Jump Rope",
    category: "cardio",
    muscleGroups: ["quadriceps", "calves"],
    equipment: "none",
    difficulty: "intermediate",
    instructions: [
      "Hold rope handles at hip height",
      "Swing rope overhead and jump as it passes under",
      "Stay on balls of feet",
      "Keep jumps small and efficient"
    ],
    tips: [
      "Great for coordination and cardio",
      "Start with basic jumps before tricks"
    ],
    isActive: true
  },
  {
    name: "Burpees",
    category: "cardio",
    muscleGroups: ["full_body"],
    equipment: "bodyweight",
    difficulty: "intermediate",
    instructions: [
      "Stand, then squat down and place hands on floor",
      "Jump feet back to push-up position",
      "Do a push-up (optional)",
      "Jump feet forward and jump up with arms overhead"
    ],
    tips: [
      "One of the best full-body cardio exercises",
      "Modify by stepping instead of jumping"
    ],
    isActive: true
  },
  {
    name: "Box Jumps",
    category: "plyometric",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: "box",
    difficulty: "intermediate",
    instructions: [
      "Stand in front of box",
      "Swing arms and jump onto box",
      "Land softly with both feet",
      "Step or jump back down"
    ],
    tips: [
      "Start with lower box height",
      "Focus on soft landings"
    ],
    isActive: true
  },
  {
    name: "Jumping Jacks",
    category: "cardio",
    muscleGroups: ["full_body"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand with feet together, arms at sides",
      "Jump feet apart while raising arms overhead",
      "Jump back to starting position",
      "Repeat at steady pace"
    ],
    tips: [
      "Great warm-up exercise",
      "Keep core engaged"
    ],
    isActive: true
  },
  {
    name: "High Knees",
    category: "cardio",
    muscleGroups: ["quadriceps", "hip_flexors"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Run in place bringing knees up to hip height",
      "Pump arms in running motion",
      "Stay on balls of feet",
      "Maintain quick pace"
    ],
    tips: [
      "Great for warming up",
      "Focus on knee height and pace"
    ],
    isActive: true
  },
  {
    name: "Battle Ropes",
    category: "cardio",
    muscleGroups: ["biceps", "triceps", "shoulders", "core"],
    equipment: "battle_ropes",
    difficulty: "intermediate",
    instructions: [
      "Hold rope ends in each hand",
      "Create waves by alternating arms up and down",
      "Keep core engaged and knees slightly bent",
      "Maintain intensity for time"
    ],
    tips: [
      "Great for upper body cardio",
      "Try different wave patterns"
    ],
    isActive: true
  },
  {
    name: "Stair Climber",
    category: "cardio",
    muscleGroups: ["quadriceps", "glutes", "calves"],
    equipment: "none",
    difficulty: "beginner",
    instructions: [
      "Step on machine and set desired level",
      "Step steadily, driving through heels",
      "Avoid leaning heavily on handles",
      "Maintain consistent pace"
    ],
    tips: [
      "Great for glutes and legs",
      "Don't hunch over handles"
    ],
    isActive: true
  },

  // ============================================
  // FLEXIBILITY/MOBILITY
  // ============================================
  {
    name: "Cat-Cow Stretch",
    category: "flexibility",
    muscleGroups: ["back", "core"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Start on hands and knees",
      "Arch back up like cat, tucking chin",
      "Then drop belly and lift head (cow)",
      "Flow between positions"
    ],
    tips: [
      "Great for spine mobility",
      "Move with your breath"
    ],
    isActive: true
  },
  {
    name: "World's Greatest Stretch",
    category: "flexibility",
    muscleGroups: ["hip_flexors", "hamstrings", "back"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Lunge forward with right foot",
      "Place left hand on ground, rotate right arm to ceiling",
      "Hold, then switch sides"
    ],
    tips: [
      "Excellent warm-up stretch",
      "Opens hips and thoracic spine"
    ],
    isActive: true
  },
  {
    name: "Hip Flexor Stretch",
    category: "flexibility",
    muscleGroups: ["hip_flexors"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Kneel on one knee with other foot forward",
      "Push hips forward gently",
      "Feel stretch in front of hip",
      "Hold and switch sides"
    ],
    tips: [
      "Important for those who sit a lot",
      "Keep torso upright"
    ],
    isActive: true
  },
  {
    name: "Pigeon Pose",
    category: "flexibility",
    muscleGroups: ["glutes", "hip_flexors"],
    equipment: "bodyweight",
    difficulty: "intermediate",
    instructions: [
      "From all fours, bring right knee behind right wrist",
      "Extend left leg behind you",
      "Lower torso over front leg",
      "Hold and switch sides"
    ],
    tips: [
      "Great for hip mobility",
      "Use props if needed"
    ],
    isActive: true
  },
  {
    name: "Downward Dog",
    category: "flexibility",
    muscleGroups: ["hamstrings", "calves", "shoulders"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Start on hands and knees",
      "Lift hips up and back",
      "Straighten legs, pressing heels toward floor",
      "Keep arms straight, head between arms"
    ],
    tips: [
      "Bend knees if hamstrings are tight",
      "Press through fingers, not just palms"
    ],
    isActive: true
  },
  {
    name: "Child's Pose",
    category: "flexibility",
    muscleGroups: ["back", "glutes"],
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Kneel and sit back on heels",
      "Fold forward, extending arms in front",
      "Rest forehead on ground",
      "Breathe deeply and relax"
    ],
    tips: [
      "Great for recovery and relaxation",
      "Widen knees if needed"
    ],
    isActive: true
  },
  {
    name: "Foam Roll - IT Band",
    category: "flexibility",
    muscleGroups: ["quadriceps", "hamstrings"],
    equipment: "foam_roller",
    difficulty: "beginner",
    instructions: [
      "Lie on side with foam roller under outer thigh",
      "Roll from hip to just above knee",
      "Pause on tender spots",
      "Switch sides"
    ],
    tips: [
      "Can be intense - go slowly",
      "Support some weight with hands"
    ],
    isActive: true
  },
  {
    name: "Foam Roll - Back",
    category: "flexibility",
    muscleGroups: ["back"],
    equipment: "foam_roller",
    difficulty: "beginner",
    instructions: [
      "Lie with foam roller under upper back",
      "Cross arms over chest",
      "Roll from mid-back to shoulders",
      "Pause on tight spots"
    ],
    tips: [
      "Don't roll lower back",
      "Keep core engaged"
    ],
    isActive: true
  }
];

async function seedExercises() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/pulseledger";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check existing count
    const existingCount = await Exercise.countDocuments();
    console.log(`📊 Current exercises in database: ${existingCount}`);

    if (existingCount > 0) {
      const response = await new Promise((resolve) => {
        process.stdout.write("⚠️  Database already has exercises. Do you want to add more? (y/n): ");
        process.stdin.once("data", (data) => resolve(data.toString().trim().toLowerCase()));
      });
      
      if (response !== "y") {
        console.log("❌ Seeding cancelled");
        process.exit(0);
      }
    }

    // Insert exercises (skip duplicates by name)
    let added = 0;
    let skipped = 0;

    for (const exercise of exercises) {
      const exists = await Exercise.findOne({ name: exercise.name });
      if (exists) {
        skipped++;
        continue;
      }
      await Exercise.create(exercise);
      added++;
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Added: ${added} exercises`);
    console.log(`   Skipped (duplicates): ${skipped} exercises`);
    console.log(`   Total in database: ${await Exercise.countDocuments()}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding exercises:", error);
    process.exit(1);
  }
}

seedExercises();
