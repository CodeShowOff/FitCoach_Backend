// src/controllers/clientWorkout.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import ClientWorkoutLog from "../models/ClientWorkoutLog.js";
import CoachWorkoutPlan from "../models/CoachWorkoutPlan.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import User from "../models/User.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function getISTNow() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function getISTDayOfWeekFromUtcDate(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).getUTCDay();
}

// Monday=1 ... Sunday=7
function getISTDayNumberMon1FromDayOfWeek(dayOfWeek) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

// Returns a Date whose epoch corresponds to IST midnight, stored as UTC time.
function getISTStartOfDayUtc(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const istMidnightAsUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0, 0);
  return new Date(istMidnightAsUtc - IST_OFFSET_MS);
}

function parseDateInputToISTStartUtc(dateInput) {
  const rawValue = Array.isArray(dateInput) ? dateInput[0] : dateInput;
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return null;
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return getISTStartOfDayUtc(parsedDate);
}

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const exerciseLogSchema = Joi.object({
  exerciseLogId: Joi.string().optional(),
  exerciseIndex: Joi.number().integer().min(0).optional(),
  exerciseId: Joi.string().optional(),
  exerciseName: Joi.string().max(100).optional(),
  completedSets: Joi.number().min(0).max(20).optional(),
  actualReps: Joi.array().items(Joi.number().min(0).max(200)).optional(),
  weightUsed: Joi.array().items(Joi.number().min(0).max(1000)).optional(),
  actualDuration: Joi.number().min(0).max(7200).optional(),
  completed: Joi.boolean().optional(),
  skipped: Joi.boolean().optional(),
  skipReason: Joi.string().max(200).optional().allow("", null),
  notes: Joi.string().max(500).optional().allow("", null),
  difficultyRating: Joi.number().min(1).max(5).optional(),
});

const updateLogSchema = Joi.object({
  status: Joi.string()
    .valid("scheduled", "in_progress", "completed", "missed", "partial")
    .optional(),
  exerciseLogs: Joi.array().items(exerciseLogSchema).optional(),
  actualDuration: Joi.number().min(0).max(600).optional(),
  caloriesBurned: Joi.number().min(0).max(5000).optional(),
  overallDifficulty: Joi.number().min(1).max(5).optional(),
  energyLevel: Joi.number().min(1).max(5).optional(),
  moodAfter: Joi.number().min(1).max(5).optional(),
  clientNotes: Joi.string().max(1000).optional().allow("", null),
});

const completeWorkoutSchema = Joi.object({
  exerciseLogs: Joi.array().items(exerciseLogSchema).optional(),
  actualDuration: Joi.number().min(0).max(600).optional(),
  caloriesBurned: Joi.number().min(0).max(5000).optional(),
  overallDifficulty: Joi.number().min(1).max(5).optional(),
  energyLevel: Joi.number().min(1).max(5).optional(),
  moodAfter: Joi.number().min(1).max(5).optional(),
  clientNotes: Joi.string().max(1000).optional().allow("", null),
});

function normalizeExerciseName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function findExerciseLogUpdateIndex(exerciseLogs, update, usedIndexes, fallbackIndex) {
  if (!Array.isArray(exerciseLogs) || exerciseLogs.length === 0) return -1;

  const availableIndexes = [];
  for (let index = 0; index < exerciseLogs.length; index += 1) {
    if (!usedIndexes.has(index)) {
      availableIndexes.push(index);
    }
  }

  const updateLogId = update?.exerciseLogId ? String(update.exerciseLogId) : null;
  if (updateLogId) {
    const byLogId = availableIndexes.find(
      (index) => exerciseLogs[index]?._id?.toString() === updateLogId
    );
    if (byLogId !== undefined) return byLogId;
  }

  const updateExerciseId = update?.exerciseId ? String(update.exerciseId) : null;
  if (updateExerciseId) {
    const byExerciseId = availableIndexes.find(
      (index) => exerciseLogs[index]?.exerciseId?.toString() === updateExerciseId
    );
    if (byExerciseId !== undefined) return byExerciseId;
  }

  const updateExerciseName = normalizeExerciseName(update?.exerciseName);
  if (updateExerciseName) {
    const byExerciseName = availableIndexes.find(
      (index) => normalizeExerciseName(exerciseLogs[index]?.exerciseName) === updateExerciseName
    );
    if (byExerciseName !== undefined) return byExerciseName;
  }

  if (
    Number.isInteger(update?.exerciseIndex) &&
    update.exerciseIndex >= 0 &&
    update.exerciseIndex < exerciseLogs.length &&
    !usedIndexes.has(update.exerciseIndex)
  ) {
    return update.exerciseIndex;
  }

  if (
    Number.isInteger(fallbackIndex) &&
    fallbackIndex >= 0 &&
    fallbackIndex < exerciseLogs.length &&
    !usedIndexes.has(fallbackIndex)
  ) {
    return fallbackIndex;
  }

  return -1;
}

function applyExerciseLogUpdates(log, updates) {
  if (!Array.isArray(updates) || updates.length === 0) return 0;
  if (!Array.isArray(log.exerciseLogs) || log.exerciseLogs.length === 0) return 0;

  const usedIndexes = new Set();
  let appliedCount = 0;

  updates.forEach((update, updateIndex) => {
    const targetIndex = findExerciseLogUpdateIndex(
      log.exerciseLogs,
      update,
      usedIndexes,
      updateIndex
    );

    if (targetIndex === -1) return;

    Object.assign(log.exerciseLogs[targetIndex], update);
    usedIndexes.add(targetIndex);
    appliedCount += 1;
  });

  return appliedCount;
}

// Helper to get client's active subscription and workout plan
async function getClientWorkoutPlan(clientId) {
  // Get client's coach
  const client = await User.findById(clientId).select("coachId");
  if (!client?.coachId) {
    return { subscription: null, workoutPlan: null, plan: null };
  }

  // Get active subscription
  const now = new Date();
  const subscription = await Subscription.findOne({
    clientId,
    status: "approved",
    endDate: { $gte: now },
  }).populate("planId");

  if (!subscription || !subscription.planId) {
    return { subscription: null, workoutPlan: null, plan: null };
  }

  // Get the plan with workout plan IDs
  const plan = await Plan.findById(subscription.planId._id);
  if (!plan || !plan.workoutPlanIds || plan.workoutPlanIds.length === 0) {
    return { subscription, workoutPlan: null, plan };
  }

  // Get the first active workout plan
  const workoutPlan = await CoachWorkoutPlan.findOne({
    _id: { $in: plan.workoutPlanIds },
    isActive: true,
  });

  return { subscription, workoutPlan, plan };
}

// Helper to create workout logs for a period
async function generateWorkoutLogs(clientId, coachId, workoutPlan, subscription, startDate, endDate) {
  const logs = [];
  const current = getISTStartOfDayUtc(startDate);
  const endDay = getISTStartOfDayUtc(endDate);

  let weekNumber = 1;
  const weekStartDate = getISTStartOfDayUtc(subscription.startDate);

  while (current <= endDay) {
    const dayOfWeek = getISTDayOfWeekFromUtcDate(current);
    const dayNumber = getISTDayNumberMon1FromDayOfWeek(dayOfWeek);
    
    // Calculate week number
    const daysSinceStart = Math.floor((current - weekStartDate) / (1000 * 60 * 60 * 24));
    weekNumber = Math.floor(daysSinceStart / 7) + 1;

    // Find the day in the weekly schedule - check both dayOfWeek and dayNumber
    const scheduleDay = workoutPlan.weeklySchedule.find(
      (day) => day.dayOfWeek === dayOfWeek || day.dayNumber === dayNumber
    );

    // Create date range for checking existing logs
    const dayStart = new Date(current);
    const nextDayStart = new Date(dayStart.getTime() + DAY_MS);

    // Check if log already exists for this day
    const existingLog = await ClientWorkoutLog.findOne({
      clientId,
      workoutPlanId: workoutPlan._id,
      scheduledDate: {
        $gte: dayStart,
        $lt: nextDayStart,
      },
    });

    if (!existingLog) {
      const log = {
        clientId,
        coachId,
        workoutPlanId: workoutPlan._id,
        subscriptionId: subscription._id,
        scheduledDate: new Date(dayStart),
        dayOfWeek,
        dayNumber: scheduleDay?.dayNumber || dayNumber,
        weekNumber,
        workoutName: scheduleDay?.dayName || `Day ${dayNumber}`,
        focusArea: scheduleDay?.focusArea,
        status: scheduleDay?.isRestDay ? "rest_day" : "scheduled",
        exerciseLogs: [],
      };

      // Add exercise logs if not a rest day and we have schedule data
      if (scheduleDay && !scheduleDay.isRestDay && scheduleDay.workouts) {
        for (const workout of scheduleDay.workouts) {
          if (workout.exercises) {
            for (const ex of workout.exercises) {
              log.exerciseLogs.push({
                exerciseId: ex.exerciseId,
                exerciseName: ex.exerciseName,
                plannedSets: ex.sets,
                plannedReps: ex.reps,
                plannedDuration: ex.duration,
                completedSets: 0,
                completed: false,
              });
            }
          }
        }
      }

      logs.push(log);
    }

    // Move to next day
    current.setTime(current.getTime() + DAY_MS);
  }

  if (logs.length > 0) {
    await ClientWorkoutLog.insertMany(logs);
  }

  return logs.length;
}

async function getClientActiveWorkoutPlans(clientId) {
  const { subscription, plan } = await getClientWorkoutPlan(clientId);

  if (!subscription || !plan || !plan.workoutPlanIds || plan.workoutPlanIds.length === 0) {
    return { subscription, plan, workoutPlans: [] };
  }

  const workoutPlans = await CoachWorkoutPlan.find({
    _id: { $in: plan.workoutPlanIds },
    isActive: true,
  });

  return { subscription, plan, workoutPlans };
}

async function ensureWorkoutLogsCoverageForClient(clientId, rangeStart, rangeEnd, workoutPlanId) {
  const { subscription, workoutPlans } = await getClientActiveWorkoutPlans(clientId);

  if (!subscription || !Array.isArray(workoutPlans) || workoutPlans.length === 0) {
    return 0;
  }

  const todayIstStart = getISTStartOfDayUtc();
  const subscriptionStart = getISTStartOfDayUtc(subscription.startDate);

  const requestedStart = rangeStart ? getISTStartOfDayUtc(rangeStart) : subscriptionStart;
  const requestedEnd = rangeEnd ? getISTStartOfDayUtc(rangeEnd) : todayIstStart;

  const effectiveStart = new Date(Math.max(requestedStart.getTime(), subscriptionStart.getTime()));
  const effectiveEnd = new Date(Math.min(requestedEnd.getTime(), todayIstStart.getTime()));

  if (effectiveEnd.getTime() < effectiveStart.getTime()) {
    return 0;
  }

  const filteredWorkoutPlans = workoutPlanId
    ? workoutPlans.filter((workoutPlan) => workoutPlan._id.toString() === workoutPlanId.toString())
    : workoutPlans;

  if (!filteredWorkoutPlans.length) {
    return 0;
  }

  let generatedCount = 0;

  for (const workoutPlan of filteredWorkoutPlans) {
    generatedCount += await generateWorkoutLogs(
      clientId,
      subscription.coachId,
      workoutPlan,
      subscription,
      effectiveStart,
      effectiveEnd
    );
  }

  return generatedCount;
}

async function markClientOverdueWorkoutsAsMissed(clientId, cutoff = getISTStartOfDayUtc()) {
  const result = await ClientWorkoutLog.updateMany(
    {
      clientId,
      status: { $in: ["scheduled", "in_progress"] },
      scheduledDate: { $lt: cutoff },
    },
    {
      $set: { status: "missed" },
    }
  );

  return result.modifiedCount ?? 0;
}

// ------------------------------
// 📋 @desc Get client's assigned workout plan
// @route GET /api/v1/client/workouts/plan
// @access Private (Client only)
// ------------------------------
export const getAssignedWorkoutPlan = asyncHandler(async (req, res) => {
  const { subscription, workoutPlan, plan } = await getClientWorkoutPlan(req.user._id);

  if (!subscription) {
    return res.json({
      success: true,
      data: null,
      message: "No active subscription found",
    });
  }

  if (!workoutPlan) {
    return res.json({
      success: true,
      data: null,
      message: "No workout plan assigned to your subscription",
    });
  }

  res.json({
    success: true,
    data: {
      workoutPlan,
      subscription: {
        _id: subscription._id,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        planTitle: plan.title,
      },
    },
  });
});

// ------------------------------
// 📅 @desc Get today's workout
// @route GET /api/v1/client/workouts/today
// @access Private (Client only)
// ------------------------------
export const getTodaysWorkout = asyncHandler(async (req, res) => {
  const { subscription, plan } = await getClientWorkoutPlan(req.user._id);

  if (!subscription || !plan || !plan.workoutPlanIds || plan.workoutPlanIds.length === 0) {
    return res.json({
      success: true,
      data: [],
      message: "No workout scheduled for today",
    });
  }

  const workoutPlans = await CoachWorkoutPlan.find({
    _id: { $in: plan.workoutPlanIds },
    isActive: true,
  });

  if (!workoutPlans || workoutPlans.length === 0) {
    return res.json({
      success: true,
      data: [],
      message: "No workout scheduled for today",
    });
  }

  const today = getISTStartOfDayUtc();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const dayOfWeek = getISTNow().getUTCDay();
  const dayNumber = getISTDayNumberMon1FromDayOfWeek(dayOfWeek);

  const results = [];

  for (const workoutPlan of workoutPlans) {
    const scheduleDay = workoutPlan.weeklySchedule?.find(
      (day) => day.dayOfWeek === dayOfWeek || day.dayNumber === dayNumber
    );

    // If a plan doesn't have a schedule for today, skip it.
    if (!scheduleDay) {
      continue;
    }

    await generateWorkoutLogs(
      req.user._id,
      subscription.coachId,
      workoutPlan,
      subscription,
      today,
      today
    );

    let todayLog = await ClientWorkoutLog.findOne({
      clientId: req.user._id,
      workoutPlanId: workoutPlan._id,
      scheduledDate: { $gte: today, $lt: tomorrow },
    });

    const plannedExerciseLogs = [];
    if (!scheduleDay.isRestDay && scheduleDay.workouts) {
      for (const workout of scheduleDay.workouts) {
        if (workout.exercises) {
          for (const ex of workout.exercises) {
            plannedExerciseLogs.push({
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              plannedSets: ex.sets,
              plannedReps: ex.reps,
              plannedDuration: ex.duration,
              completedSets: 0,
              completed: false,
            });
          }
        }
      }
    }

    if (!todayLog) {
      todayLog = await ClientWorkoutLog.create({
        clientId: req.user._id,
        coachId: subscription.coachId,
        workoutPlanId: workoutPlan._id,
        subscriptionId: subscription._id,
        scheduledDate: today,
        dayOfWeek,
        dayNumber: scheduleDay.dayNumber || dayNumber,
        weekNumber: 1,
        workoutName: scheduleDay.dayName || `Day ${dayNumber}`,
        focusArea: scheduleDay.focusArea,
        status: scheduleDay.isRestDay ? "rest_day" : "scheduled",
        exerciseLogs: plannedExerciseLogs,
      });
    } else {
      const wasRestDay = todayLog.status === "rest_day";
      const shouldBeRestDay = !!scheduleDay.isRestDay;
      const expectedWorkoutName = scheduleDay.dayName || `Day ${dayNumber}`;
      const expectedDayNumber = scheduleDay.dayNumber || dayNumber;
      const expectedFocusArea = scheduleDay.focusArea || undefined;

      let shouldSave = false;

      if (todayLog.dayOfWeek !== dayOfWeek) {
        todayLog.dayOfWeek = dayOfWeek;
        shouldSave = true;
      }

      if (todayLog.dayNumber !== expectedDayNumber) {
        todayLog.dayNumber = expectedDayNumber;
        shouldSave = true;
      }

      if ((todayLog.workoutName || "") !== expectedWorkoutName) {
        todayLog.workoutName = expectedWorkoutName;
        shouldSave = true;
      }

      if ((todayLog.focusArea || "") !== (expectedFocusArea || "")) {
        todayLog.focusArea = expectedFocusArea;
        shouldSave = true;
      }

      if (shouldBeRestDay) {
        if (todayLog.status !== "rest_day") {
          todayLog.status = "rest_day";
          shouldSave = true;
        }

        if (Array.isArray(todayLog.exerciseLogs) && todayLog.exerciseLogs.length > 0) {
          todayLog.exerciseLogs = [];
          shouldSave = true;
        }
      } else {
        if (wasRestDay) {
          todayLog.status = "scheduled";
          shouldSave = true;
        }

        if ((!Array.isArray(todayLog.exerciseLogs) || todayLog.exerciseLogs.length === 0 || wasRestDay) && plannedExerciseLogs.length > 0) {
          todayLog.exerciseLogs = plannedExerciseLogs;
          shouldSave = true;
        }
      }

      if (shouldSave) {
        await todayLog.save();
      }
    }

    let exercises = [];
    if (scheduleDay.workouts && scheduleDay.workouts.length > 0) {
      for (const workout of scheduleDay.workouts) {
        if (workout.exercises && workout.exercises.length > 0) {
          for (const ex of workout.exercises) {
            exercises.push({
              _id: ex._id,
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              sets: ex.sets,
              reps: ex.reps,
              duration: ex.duration,
              restSeconds: ex.restSeconds,
              weight: ex.weight,
              notes: ex.notes,
              order: ex.order,
            });
          }
        }
      }
    }

    if (exercises.length > 0) {
      const exerciseIds = exercises
        .filter((e) => e.exerciseId)
        .map((e) => e.exerciseId);

      const exerciseDetails = await import("../models/Exercise.js").then((m) =>
        m.default
          .find({ _id: { $in: exerciseIds } })
          .select("name animationUrl thumbnailUrl muscleGroups equipment difficulty instructions tips")
      );

      const exerciseMap = new Map(exerciseDetails.map((e) => [e._id.toString(), e]));

      exercises = exercises.map((ex) => {
        const details = ex.exerciseId ? exerciseMap.get(ex.exerciseId.toString()) : null;
        return {
          ...ex,
          exerciseId: details || ex.exerciseId,
          name: details?.name || ex.exerciseName,
        };
      });
    }

    results.push({
      _id: todayLog?._id,
      planId: workoutPlan._id,
      planName: workoutPlan.name,
      workoutPlanId: workoutPlan._id,
      workoutPlanName: workoutPlan.name,
      dayOfWeek,
      focus: scheduleDay.focusArea || scheduleDay.dayName,
      dayName: scheduleDay.dayName,
      isRestDay: scheduleDay.isRestDay || false,
      restDayNotes: scheduleDay.restDayNotes,
      exercises,
      completed: todayLog?.status === "completed",
      status: todayLog?.status || "scheduled",
      log: todayLog,
    });
  }

  res.json({
    success: true,
    data: results,
  });
});

// ------------------------------
// 📆 @desc Get weekly workout schedule
// @route GET /api/v1/client/workouts/schedule
// @access Private (Client only)
// ------------------------------
export const getWeeklySchedule = asyncHandler(async (req, res) => {
  const { subscription, workoutPlan } = await getClientWorkoutPlan(req.user._id);

  if (!subscription || !workoutPlan) {
    return res.json({
      success: true,
      data: [],
      message: "No workout plan assigned",
    });
  }

  // Get start of current week (Monday) in IST
  const istNow = getISTNow();
  const istDayOfWeek = istNow.getUTCDay();
  const startOfTodayIst = getISTStartOfDayUtc();
  const daysSinceMonday = istDayOfWeek === 0 ? 6 : istDayOfWeek - 1;
  const startOfWeek = new Date(startOfTodayIst.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  // Generate logs for the week
  await generateWorkoutLogs(
    req.user._id,
    subscription.coachId,
    workoutPlan,
    subscription,
    startOfWeek,
    endOfWeek
  );

  // Get this week's logs
  const weekLogs = await ClientWorkoutLog.find({
    clientId: req.user._id,
    scheduledDate: { $gte: startOfWeek, $lte: endOfWeek },
  }).sort({ scheduledDate: 1 });

  res.json({
    success: true,
    data: {
      workoutPlanName: workoutPlan.name,
      weekStart: startOfWeek,
      weekEnd: endOfWeek,
      schedule: weekLogs,
    },
  });
});

// ------------------------------
// 🔍 @desc Get workout log by ID
// @route GET /api/v1/client/workouts/:logId
// @access Private (Client only)
// ------------------------------
export const getWorkoutLogById = asyncHandler(async (req, res) => {
  const log = await ClientWorkoutLog.findOne({
    _id: req.params.logId,
    clientId: req.user._id,
  });

  if (!log) {
    res.status(404);
    throw new Error("Workout log not found");
  }

  // Get workout plan details for exercises
  const workoutPlan = await CoachWorkoutPlan.findById(log.workoutPlanId);

  res.json({
    success: true,
    data: {
      log,
      workoutPlan: workoutPlan
        ? {
            name: workoutPlan.name,
            weeklySchedule: workoutPlan.weeklySchedule,
          }
        : null,
    },
  });
});

// ------------------------------
// ▶️ @desc Start a workout
// @route POST /api/v1/client/workouts/:logId/start
// @access Private (Client only)
// ------------------------------
export const startWorkout = asyncHandler(async (req, res) => {
  const log = await ClientWorkoutLog.findOne({
    _id: req.params.logId,
    clientId: req.user._id,
  });

  if (!log) {
    res.status(404);
    throw new Error("Workout log not found");
  }

  if (log.status === "rest_day") {
    res.status(400);
    throw new Error("Cannot start a rest day");
  }

  if (log.status === "completed") {
    res.status(400);
    throw new Error("Workout already completed");
  }

  log.status = "in_progress";
  log.startedAt = new Date();
  await log.save();

  res.json({
    success: true,
    message: "Workout started",
    data: log,
  });
});

// ------------------------------
// ✅ @desc Complete a workout
// @route POST /api/v1/client/workouts/:logId/complete
// @access Private (Client only)
// ------------------------------
export const completeWorkout = asyncHandler(async (req, res) => {
  const { error, value } = completeWorkoutSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const log = await ClientWorkoutLog.findOne({
    _id: req.params.logId,
    clientId: req.user._id,
  });

  if (!log) {
    res.status(404);
    throw new Error("Workout log not found");
  }

  if (log.status === "rest_day") {
    res.status(400);
    throw new Error("Cannot complete a rest day");
  }

  // Update exercise logs if provided
  if (value.exerciseLogs && value.exerciseLogs.length > 0) {
    applyExerciseLogUpdates(log, value.exerciseLogs);
  }

  // Update other fields
  if (value.actualDuration !== undefined) log.actualDuration = value.actualDuration;
  if (value.caloriesBurned !== undefined) log.caloriesBurned = value.caloriesBurned;
  if (value.overallDifficulty !== undefined) log.overallDifficulty = value.overallDifficulty;
  if (value.energyLevel !== undefined) log.energyLevel = value.energyLevel;
  if (value.moodAfter !== undefined) log.moodAfter = value.moodAfter;
  if (value.clientNotes !== undefined) log.clientNotes = value.clientNotes;

  // Mark as complete
  log.markComplete();
  await log.save();

  res.json({
    success: true,
    message: "Workout completed!",
    data: log,
  });
});

// ------------------------------
// ❌ @desc Mark workout as missed
// @route POST /api/v1/client/workouts/:logId/miss
// @access Private (Client only)
// ------------------------------
export const markWorkoutMissed = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const log = await ClientWorkoutLog.findOne({
    _id: req.params.logId,
    clientId: req.user._id,
  });

  if (!log) {
    res.status(404);
    throw new Error("Workout log not found");
  }

  if (log.status === "rest_day") {
    res.status(400);
    throw new Error("Cannot mark a rest day as missed");
  }

  if (log.status === "completed" || log.status === "partial") {
    res.status(400);
    throw new Error("Cannot mark a completed or partially completed workout as missed");
  }

  if (log.status === "missed") {
    res.status(400);
    throw new Error("Workout is already marked as missed");
  }

  log.status = "missed";
  if (typeof reason === "string" && reason.trim()) {
    log.clientNotes = reason.trim();
  }
  await log.save();

  res.json({
    success: true,
    message: "Workout marked as missed",
    data: log,
  });
});

// ------------------------------
// ✏️ @desc Update workout log
// @route PATCH /api/v1/client/workouts/:logId
// @access Private (Client only)
// ------------------------------
export const updateWorkoutLog = asyncHandler(async (req, res) => {
  const { error, value } = updateLogSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const log = await ClientWorkoutLog.findOne({
    _id: req.params.logId,
    clientId: req.user._id,
  });

  if (!log) {
    res.status(404);
    throw new Error("Workout log not found");
  }

  if (value.exerciseLogs && value.exerciseLogs.length > 0) {
    applyExerciseLogUpdates(log, value.exerciseLogs);
  }

  // Update fields
  Object.keys(value).forEach((key) => {
    if (key !== "exerciseLogs") {
      log[key] = value[key];
    }
  });

  await log.save();

  res.json({
    success: true,
    message: "Workout log updated",
    data: log,
  });
});

// ------------------------------
// 📊 @desc Get workout history
// @route GET /api/v1/client/workouts/history
// @access Private (Client only)
// ------------------------------
export const getWorkoutHistory = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const { status, startDate, endDate, workoutPlanId } = req.query;
  let startBoundary;
  let endBoundary;

  if (startDate) {
    startBoundary = parseDateInputToISTStartUtc(startDate);
    if (!startBoundary) {
      res.status(400);
      throw new Error("Invalid startDate");
    }
  }

  if (endDate) {
    endBoundary = parseDateInputToISTStartUtc(endDate);
    if (!endBoundary) {
      res.status(400);
      throw new Error("Invalid endDate");
    }
  }

  if (startBoundary && endBoundary && endBoundary.getTime() < startBoundary.getTime()) {
    res.status(400);
    throw new Error("Invalid date range: endDate must be on or after startDate");
  }

  await ensureWorkoutLogsCoverageForClient(req.user._id, startBoundary, endBoundary, workoutPlanId);
  await markClientOverdueWorkoutsAsMissed(req.user._id);

  const query = { clientId: req.user._id };

  if (status) {
    query.status = status;
  }

  if (workoutPlanId) {
    query.workoutPlanId = workoutPlanId;
  }

  if (startBoundary || endBoundary) {
    query.scheduledDate = {};

    if (startBoundary) {
      query.scheduledDate.$gte = startBoundary;
    }

    if (endBoundary) {
      query.scheduledDate.$lt = new Date(endBoundary.getTime() + DAY_MS);
    }
  }

  const [logs, total] = await Promise.all([
    ClientWorkoutLog.find(query)
      .populate('workoutPlanId', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ scheduledDate: -1 }),
    ClientWorkoutLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ------------------------------
// 📈 @desc Get workout statistics
// @route GET /api/v1/client/workouts/stats
// @access Private (Client only)
// ------------------------------
export const getWorkoutStats = asyncHandler(async (req, res) => {
  const { period = "30" } = req.query;
  const days = Math.max(1, parseInt(period) || 30);

  const todayIstStart = getISTStartOfDayUtc();
  const tomorrowIstStart = new Date(todayIstStart.getTime() + DAY_MS);
  const startDate = new Date(todayIstStart.getTime() - days * DAY_MS);

  await ensureWorkoutLogsCoverageForClient(req.user._id, startDate, todayIstStart);
  await markClientOverdueWorkoutsAsMissed(req.user._id, todayIstStart);

  const logs = await ClientWorkoutLog.find({
    clientId: req.user._id,
    scheduledDate: { $gte: startDate, $lt: tomorrowIstStart },
    status: { $ne: "rest_day" },
  });

  const stats = {
    totalWorkouts: logs.length,
    completed: logs.filter((l) => l.status === "completed").length,
    partial: logs.filter((l) => l.status === "partial").length,
    missed: logs.filter((l) => l.status === "missed").length,
    scheduled: logs.filter((l) => l.status === "scheduled").length,
    completionRate: 0,
    totalDuration: 0,
    totalCaloriesBurned: 0,
    averageDifficulty: 0,
    streak: 0,
    todayCompleted: false,
    yesterdayCompleted: false,
  };

  // Calculate completion rate
  const completedOrPartial = stats.completed + stats.partial;
  const attemptedOrMissed = completedOrPartial + stats.missed;
  if (attemptedOrMissed > 0) {
    stats.completionRate = Math.round((completedOrPartial / attemptedOrMissed) * 100);
  }

  // Calculate totals
  stats.totalDuration = logs.reduce((sum, l) => sum + (l.actualDuration || 0), 0);
  stats.totalCaloriesBurned = logs.reduce((sum, l) => sum + (l.caloriesBurned || 0), 0);

  // Calculate average difficulty
  const logsWithDifficulty = logs.filter((l) => l.overallDifficulty);
  if (logsWithDifficulty.length > 0) {
    stats.averageDifficulty =
      Math.round(
        (logsWithDifficulty.reduce((sum, l) => sum + l.overallDifficulty, 0) /
          logsWithDifficulty.length) *
          10
      ) / 10;
  }

  // Calculate current streak
  const sortedLogs = logs
    .filter((l) => l.status === "completed" || l.status === "partial")
    .sort((a, b) => b.scheduledDate - a.scheduledDate);

  let streak = 0;
  const today = new Date(todayIstStart);

  const yesterday = new Date(todayIstStart);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if today is completed
  const todayLog = sortedLogs.find((l) => {
    const logDate = getISTStartOfDayUtc(new Date(l.scheduledDate));
    return logDate.getTime() === todayIstStart.getTime();
  });
  stats.todayCompleted = !!todayLog;
  
  // Check if yesterday is completed
  const yesterdayLog = sortedLogs.find((l) => {
    const logDate = getISTStartOfDayUtc(new Date(l.scheduledDate));
    return logDate.getTime() === yesterday.getTime();
  });
  stats.yesterdayCompleted = !!yesterdayLog;

  let checkDate = null;
  if (stats.todayCompleted) {
    checkDate = new Date(today);
  } else if (stats.yesterdayCompleted) {
    checkDate = new Date(yesterday);
  }

  if (checkDate) {
    for (let i = 0; i < 365; i++) {
      const dayLog = sortedLogs.find((l) => {
        const logDate = getISTStartOfDayUtc(new Date(l.scheduledDate));
        return logDate.getTime() === checkDate.getTime();
      });

      if (!dayLog) {
        break;
      }

      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  stats.streak = streak;

  res.json({
    success: true,
    data: stats,
  });
});

// ------------------------------
// 📋 @desc Get all workout plans assigned to client
// @route GET /api/v1/client/workouts/plans
// @access Private (Client only)
// ------------------------------
export const getAssignedWorkoutPlans = asyncHandler(async (req, res) => {
  const { subscription, plan } = await getClientWorkoutPlan(req.user._id);

  if (!subscription) {
    return res.json({
      success: true,
      data: [],
      message: "No active subscription found",
    });
  }

  if (!plan || !plan.workoutPlanIds || plan.workoutPlanIds.length === 0) {
    return res.json({
      success: true,
      data: [],
      message: "No workout plans assigned to your subscription",
    });
  }

  // Get all active workout plans assigned to this subscription
  const workoutPlans = await CoachWorkoutPlan.find({
    _id: { $in: plan.workoutPlanIds },
    isActive: true,
  }).populate({
    path: "weeklySchedule.workouts.exercises.exerciseId",
    select: "name animationUrl thumbnailUrl muscleGroups equipment difficulty instructions tips",
  });

  res.json({
    success: true,
    data: workoutPlans,
  });
});

// ------------------------------
// 📋 @desc Get a specific workout plan by ID
// @route GET /api/v1/client/workouts/plans/:planId
// @access Private (Client only)
// ------------------------------
export const getWorkoutPlanById = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const { subscription, plan } = await getClientWorkoutPlan(req.user._id);

  if (!subscription) {
    res.status(403);
    throw new Error("No active subscription found");
  }

  // Check if this plan is assigned to the client's subscription
  // Convert ObjectIds to strings for comparison
  const assignedPlanIds = plan?.workoutPlanIds?.map((id) => id.toString()) || [];
  if (!assignedPlanIds.includes(planId)) {
    res.status(403);
    throw new Error("You don't have access to this workout plan");
  }

  const workoutPlan = await CoachWorkoutPlan.findOne({
    _id: planId,
    isActive: true,
  }).populate({
    path: "weeklySchedule.workouts.exercises.exerciseId",
    select: "name animationUrl thumbnailUrl muscleGroups equipment difficulty instructions tips",
  });

  if (!workoutPlan) {
    res.status(404);
    throw new Error("Workout plan not found");
  }

  res.json({
    success: true,
    data: workoutPlan,
  });
});
