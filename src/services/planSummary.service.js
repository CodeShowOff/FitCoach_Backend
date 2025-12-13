import mongoose from "mongoose";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";

const APPROVED_STATUSES = ["approved"];
const TRACKED_STATUSES = ["pending", "approved"];

const normalizeIds = (ids = []) => {
  return ids
    .filter(Boolean)
    .map((value) => {
      if (value instanceof mongoose.Types.ObjectId) {
        return value;
      }
      try {
        return new mongoose.Types.ObjectId(value);
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);
};

const ensureObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch (err) {
    return null;
  }
};

export const getPlanSummariesForClients = async (coachId, clientIds = []) => {
  try {
    const normalizedCoachId = ensureObjectId(coachId);
    const normalizedClientIds = normalizeIds(clientIds);
    const now = new Date();

    let defaultPlan = null;
    let fallbackPlan = null;

    if (normalizedCoachId) {
      try {
        defaultPlan = await Plan.findOne({
          coachId: normalizedCoachId,
          isDefault: true,
        })
          .select("title description durationWeeks price goal isDefault")
          .sort({ createdAt: 1 })
          .lean();

        if (!defaultPlan) {
          fallbackPlan = await Plan.findOne({
            coachId: normalizedCoachId,
          })
            .select("title description durationWeeks price goal isDefault")
            .sort({ createdAt: 1 })
            .lean();
        }
      } catch (err) {
        console.error("❌ SERVICE ERROR: Failed to fetch default/fallback plan for coach");
        console.error("   Coach ID:", normalizedCoachId);
        console.error("   Details:", err.message || err);
        console.error("   Impact: Clients will not see a default plan (non-critical)");
        // Continue without default plan
      }
    }

    if (!normalizedClientIds.length) {
      return {
        summaries: {},
        defaultPlan,
        fallbackPlan,
      };
    }

    try {
      await Subscription.updateMany(
        {
          clientId: { $in: normalizedClientIds },
          status: "approved",
          endDate: { $lt: now },
        },
        { $set: { status: "expired" } }
      );
    } catch (err) {
      console.error("❌ SERVICE ERROR: Failed to update expired subscriptions in plan summary");
      console.error("   Details:", err.message || err);
      console.error("   Impact: Some expired subscriptions may show as active (will be fixed on next cron run)");
      // Continue without updating expired subscriptions
    }

    const subscriptions = await Subscription.find({
      clientId: { $in: normalizedClientIds },
      status: { $in: TRACKED_STATUSES },
    })
      .populate("planId", "title description durationWeeks price goal isDefault")
      .sort({ createdAt: -1 })
      .lean();

  const byClient = new Map();
  for (const sub of subscriptions) {
    const key = sub.clientId.toString();
    if (!byClient.has(key)) {
      byClient.set(key, []);
    }
    byClient.get(key).push(sub);
  }

  const templatePlan = defaultPlan || fallbackPlan || null;

  const summaries = {};

  for (const clientId of normalizedClientIds) {
    const key = clientId.toString();
    const list = byClient.get(key) || [];

    const active = list.find((sub) => {
      if (!APPROVED_STATUSES.includes(sub.status)) return false;
      if (!sub.endDate) return true;
      return sub.endDate >= now;
    });

    const pending = list.filter((sub) => sub.status === "pending");

    let current = null;
    if (active) {
      current = {
        type: "subscription",
        subscriptionId: active._id,
        planId: active.planId?._id || null,
        planTitle: active.planId?.title || active.planTitle || "Coach Plan",
        goal: active.planId?.goal || null,
        price:
          typeof active.planId?.price === "number"
            ? active.planId.price
            : typeof active.amount === "number"
            ? active.amount
            : 0,
        durationWeeks:
          typeof active.planId?.durationWeeks === "number"
            ? active.planId.durationWeeks
            : active.durationWeeks || null,
        status: active.status,
        startDate: active.startDate || null,
        endDate: active.endDate || null,
        isDefault: Boolean(active.planId?.isDefault),
      };
    } else if (templatePlan) {
      current = {
        type: "default",
        subscriptionId: null,
        planId: templatePlan._id || null,
        planTitle: templatePlan.title,
        goal: templatePlan.goal || null,
        price: typeof templatePlan.price === "number" ? templatePlan.price : 0,
        durationWeeks: templatePlan.durationWeeks || null,
        status: "auto",
        startDate: null,
        endDate: null,
        isDefault: Boolean(templatePlan.isDefault),
      };
    }

    summaries[key] = {
      current,
      pending: pending.map((sub) => ({
        subscriptionId: sub._id,
        planId: sub.planId?._id || null,
        planTitle: sub.planId?.title || sub.planTitle || "Coach Plan",
        amount: typeof sub.amount === "number" ? sub.amount : 0,
        durationWeeks: sub.durationWeeks || sub.planId?.durationWeeks || null,
        requestedAt: sub.createdAt || null,
        status: sub.status,
      })),
      defaultPlan: templatePlan,
    };
  }

    return {
      summaries,
      defaultPlan,
      fallbackPlan,
    };
  } catch (error) {
    console.error("❌ SERVICE ERROR: getPlanSummariesForClients failed");
    console.error("   Coach ID:", coachId);
    console.error("   Client IDs:", clientIds);
    console.error("   Details:", error.message || error);
    console.error("   Returning empty plan summaries to prevent crash");
    // Return safe defaults to prevent crashes
    return {
      summaries: {},
      defaultPlan: null,
      fallbackPlan: null,
    };
  }
};
