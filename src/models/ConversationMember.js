// src/models/ConversationMember.js
import mongoose from "mongoose";

/**
 * Tracks membership in group conversations (global_broadcast and plan_group).
 * For direct chats, membership is implicit (coachId + clientId on Conversation).
 */

const conversationMemberSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Role in the conversation
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },

    // When the user joined this conversation
    joinedAt: {
      type: Date,
      default: Date.now,
    },

    // Last time user read messages in this conversation
    lastReadAt: {
      type: Date,
      default: null,
    },

    // Count of unread messages (for efficient badge display)
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Is user muted from this conversation
    isMuted: {
      type: Boolean,
      default: false,
    },

    // Notification preferences
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    // Has the user left or been removed
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // If removed, when and by whom
    removedAt: {
      type: Date,
      default: null,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for unique membership
conversationMemberSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true }
);

// Index for finding all conversations a user is part of
conversationMemberSchema.index({ userId: 1, isActive: 1 });

// Index for finding all members of a conversation
conversationMemberSchema.index({ conversationId: 1, isActive: 1 });

// Index for unread counts
conversationMemberSchema.index({ userId: 1, unreadCount: 1 });

/**
 * Static method to add a member to a conversation
 */
conversationMemberSchema.statics.addMember = async function (
  conversationId,
  userId,
  role = "member"
) {
  const existing = await this.findOne({ conversationId, userId });
  
  if (existing) {
    // Reactivate if previously removed
    if (!existing.isActive) {
      existing.isActive = true;
      existing.removedAt = null;
      existing.removedBy = null;
      existing.joinedAt = new Date();
      await existing.save();
    }
    return existing;
  }

  return this.create({
    conversationId,
    userId,
    role,
  });
};

/**
 * Static method to remove a member from a conversation
 */
conversationMemberSchema.statics.removeMember = async function (
  conversationId,
  userId,
  removedBy = null
) {
  return this.findOneAndUpdate(
    { conversationId, userId },
    {
      isActive: false,
      removedAt: new Date(),
      removedBy,
    },
    { new: true }
  );
};

/**
 * Static method to get all active members of a conversation
 */
conversationMemberSchema.statics.getActiveMembers = async function (conversationId) {
  return this.find({ conversationId, isActive: true })
    .populate("userId", "fullName email avatarUrl role")
    .lean();
};

/**
 * Static method to increment unread count for all members except sender
 */
conversationMemberSchema.statics.incrementUnreadForOthers = async function (
  conversationId,
  senderId
) {
  return this.updateMany(
    {
      conversationId,
      userId: { $ne: senderId },
      isActive: true,
    },
    { $inc: { unreadCount: 1 } }
  );
};

/**
 * Static method to mark messages as read for a user
 */
conversationMemberSchema.statics.markAsRead = async function (conversationId, userId) {
  return this.findOneAndUpdate(
    { conversationId, userId },
    {
      lastReadAt: new Date(),
      unreadCount: 0,
    },
    { new: true }
  );
};

const ConversationMember = mongoose.model(
  "ConversationMember",
  conversationMemberSchema
);

export default ConversationMember;
