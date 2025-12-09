// src/models/Conversation.js
import mongoose from "mongoose";

/**
 * Conversation Types:
 * - "global_broadcast": Coach's global channel (coach → all their clients, one-way)
 * - "plan_group": Plan-specific community (coach + all clients subscribed to that plan)
 * - "direct": One-to-one chat between coach and client
 */

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["global_broadcast", "plan_group", "direct"],
      required: true,
      index: true,
    },

    // For global_broadcast and plan_group: the coach who owns this conversation
    // For direct: one of the participants (the coach)
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // For plan_group: the plan this group is associated with
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
      index: true,
    },

    // For direct chats: the client participant
    // For groups: null (members tracked in ConversationMember)
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Conversation name (auto-generated or custom)
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    // Optional description for groups
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    // Cover image for group (optional)
    imageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: null,
    },

    // Last message info for efficient conversation list queries
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastMessagePreview: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Is the conversation active (soft delete)
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // For plan_group: track the plan title in case plan is deleted
    planTitle: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
conversationSchema.index({ coachId: 1, isActive: 1, lastMessageAt: -1 });

// For direct chats: ensure unique conversation per coach-client pair
conversationSchema.index(
  { coachId: 1, clientId: 1, type: 1 },
  { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { type: "direct" } 
  }
);

// Ensure one global broadcast per coach
conversationSchema.index(
  { coachId: 1, type: 1 },
  { 
    unique: true,
    partialFilterExpression: { type: "global_broadcast" }
  }
);

// Ensure one plan group per plan
conversationSchema.index(
  { planId: 1, type: 1 },
  { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { type: "plan_group" }
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
