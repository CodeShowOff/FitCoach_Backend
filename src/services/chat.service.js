// src/services/chat.service.js
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import ConversationMember from "../models/ConversationMember.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Message retention period in days
const MESSAGE_RETENTION_DAYS = 7;

// System user ID constant - used for system messages
// Using a fixed ObjectId ensures consistency and avoids creating invalid references
const SYSTEM_USER_ID = new mongoose.Types.ObjectId("000000000000000000000000");

/**
 * Get or create the global broadcast conversation for a coach
 */
export const getOrCreateGlobalBroadcast = async (coachId) => {
  let conversation = await Conversation.findOne({
    coachId,
    type: "global_broadcast",
    isActive: true,
  });

  if (!conversation) {
    const coach = await User.findById(coachId).select("fullName").lean();
    
    conversation = await Conversation.create({
      type: "global_broadcast",
      coachId,
      name: `${coach?.fullName || "Coach"}'s Announcements`,
      description: "Broadcast channel for announcements and updates",
    });

    // Add coach as owner
    await ConversationMember.addMember(conversation._id, coachId, "owner");
  }

  return conversation;
};

/**
 * Get or create a plan-specific group conversation
 */
export const getOrCreatePlanGroup = async (planId, coachId, planTitle) => {
  let conversation = await Conversation.findOne({
    planId,
    type: "plan_group",
    isActive: true,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      type: "plan_group",
      coachId,
      planId,
      planTitle,
      name: `${planTitle} Community`,
      description: `Community group for ${planTitle} subscribers`,
    });

    // Add coach as owner
    await ConversationMember.addMember(conversation._id, coachId, "owner");
  }

  return conversation;
};

/**
 * Get or create a direct conversation between coach and client
 */
export const getOrCreateDirectConversation = async (coachId, clientId) => {
  let conversation = await Conversation.findOne({
    coachId,
    clientId,
    type: "direct",
    isActive: true,
  });

  if (!conversation) {
    const [coach, client] = await Promise.all([
      User.findById(coachId).select("fullName").lean(),
      User.findById(clientId).select("fullName").lean(),
    ]);

    conversation = await Conversation.create({
      type: "direct",
      coachId,
      clientId,
      name: null, // Direct chats don't need a name
    });

    // Both are members with equal standing
    await Promise.all([
      ConversationMember.addMember(conversation._id, coachId, "owner"),
      ConversationMember.addMember(conversation._id, clientId, "member"),
    ]);
  }

  return conversation;
};

/**
 * Add a client to coach's global broadcast
 */
export const addClientToGlobalBroadcast = async (coachId, clientId) => {
  const broadcast = await getOrCreateGlobalBroadcast(coachId);
  await ConversationMember.addMember(broadcast._id, clientId, "member");
  
  // Create system message
  const client = await User.findById(clientId).select("fullName").lean();
  await createSystemMessage(
    broadcast._id,
    `${client?.fullName || "A new member"} joined the channel`
  );
  
  return broadcast;
};

/**
 * Remove a client from coach's global broadcast
 */
export const removeClientFromGlobalBroadcast = async (coachId, clientId) => {
  const broadcast = await Conversation.findOne({
    coachId,
    type: "global_broadcast",
    isActive: true,
  });

  if (broadcast) {
    await ConversationMember.removeMember(broadcast._id, clientId);
  }
};

/**
 * Add a client to a plan group when they subscribe
 */
export const addClientToPlanGroup = async (planId, coachId, clientId, planTitle) => {
  const planGroup = await getOrCreatePlanGroup(planId, coachId, planTitle);
  await ConversationMember.addMember(planGroup._id, clientId, "member");
  
  // Create system message
  const client = await User.findById(clientId).select("fullName").lean();
  await createSystemMessage(
    planGroup._id,
    `${client?.fullName || "A new member"} joined the group`
  );
  
  return planGroup;
};

/**
 * Remove a client from a plan group when subscription ends
 */
export const removeClientFromPlanGroup = async (planId, clientId) => {
  const planGroup = await Conversation.findOne({
    planId,
    type: "plan_group",
    isActive: true,
  });

  if (planGroup) {
    const client = await User.findById(clientId).select("fullName").lean();
    
    await ConversationMember.removeMember(planGroup._id, clientId);
    
    await createSystemMessage(
      planGroup._id,
      `${client?.fullName || "A member"} left the group`
    );
  }
};

/**
 * Create a system message
 */
export const createSystemMessage = async (conversationId, content) => {
  return Message.create({
    conversationId,
    senderId: SYSTEM_USER_ID,
    type: "system",
    content,
    senderName: "System",
    senderRole: "system",
  });
};

/**
 * Create a new message
 */
export const createMessage = async (data) => {
  const {
    conversationId,
    senderId,
    type = "text",
    content,
    mediaUrl,
    mediaPublicId,
    mediaThumbnailUrl,
    linkUrl,
    linkTitle,
    linkDescription,
    linkImageUrl,
    replyToId,
  } = data;

  // Get sender info
  const sender = await User.findById(senderId).select("fullName avatarUrl role").lean();

  const message = await Message.create({
    conversationId,
    senderId,
    type,
    content,
    mediaUrl,
    mediaPublicId,
    mediaThumbnailUrl,
    linkUrl,
    linkTitle,
    linkDescription,
    linkImageUrl,
    replyToId,
    senderName: sender?.fullName || "Unknown",
    senderAvatarUrl: sender?.avatarUrl || null,
    senderRole: sender?.role || "client",
  });

  // Increment unread count for other members
  await ConversationMember.incrementUnreadForOthers(conversationId, senderId);

  return message;
};

/**
 * Get messages for a conversation with pagination
 * Only returns messages from the last 7 days (MESSAGE_RETENTION_DAYS)
 */
export const getMessages = async (conversationId, options = {}) => {
  const { limit = 50, before = null, after = null } = options;

  // Calculate the cutoff date for message retention
  const retentionCutoff = new Date();
  retentionCutoff.setDate(retentionCutoff.getDate() - MESSAGE_RETENTION_DAYS);

  const query = { 
    conversationId, 
    isDeleted: false,
    createdAt: { $gte: retentionCutoff }, // Only fetch messages within retention period
  };

  if (before) {
    const beforeDate = new Date(before);
    // Don't allow fetching before the retention cutoff
    if (beforeDate < retentionCutoff) {
      return []; // No messages available before retention period
    }
    query.createdAt = { $gte: retentionCutoff, $lt: beforeDate };
  } else if (after) {
    const afterDate = new Date(after);
    query.createdAt = { $gte: afterDate > retentionCutoff ? afterDate : retentionCutoff };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 }) // Always sort descending to get newest messages first
    .limit(limit)
    .populate("replyToId", "content type senderName")
    .lean();

  // Reverse to get chronological order (oldest to newest) for display
  messages.reverse();

  return messages;
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId, userRole) => {
  const conversations = [];

  if (userRole === "coach") {
    // Get all conversations where user is the coach
    const coachConversations = await Conversation.find({
      coachId: userId,
      isActive: true,
    })
      .sort({ lastMessageAt: -1 })
      .populate("clientId", "fullName avatarUrl")
      .populate("planId", "title")
      .lean();

    for (const conv of coachConversations) {
      const membership = await ConversationMember.findOne({
        conversationId: conv._id,
        userId,
      }).lean();

      conversations.push({
        ...conv,
        unreadCount: membership?.unreadCount || 0,
        lastReadAt: membership?.lastReadAt,
        isMuted: membership?.isMuted || false,
      });
    }
  } else {
    // Get all group conversations where user is a member
    const memberships = await ConversationMember.find({
      userId,
      isActive: true,
    }).lean();

    const conversationIds = memberships.map((m) => m.conversationId);

    const memberConversations = await Conversation.find({
      _id: { $in: conversationIds },
      isActive: true,
    })
      .sort({ lastMessageAt: -1 })
      .populate("coachId", "fullName avatarUrl")
      .populate("planId", "title")
      .lean();

    const membershipMap = new Map(
      memberships.map((m) => [m.conversationId.toString(), m])
    );

    for (const conv of memberConversations) {
      const membership = membershipMap.get(conv._id.toString());
      conversations.push({
        ...conv,
        unreadCount: membership?.unreadCount || 0,
        lastReadAt: membership?.lastReadAt,
        isMuted: membership?.isMuted || false,
      });
    }
  }

  return conversations;
};

/**
 * Get conversation details with member info
 */
export const getConversationDetails = async (conversationId) => {
  const conversation = await Conversation.findById(conversationId)
    .populate("coachId", "fullName avatarUrl email")
    .populate("clientId", "fullName avatarUrl email")
    .populate("planId", "title description")
    .lean();

  if (!conversation) {
    return null;
  }

  // Get member count for groups
  if (conversation.type !== "direct") {
    const memberCount = await ConversationMember.countDocuments({
      conversationId,
      isActive: true,
    });
    conversation.memberCount = memberCount;
  }

  return conversation;
};

/**
 * Get members of a conversation
 */
export const getConversationMembers = async (conversationId, options = {}) => {
  const { limit = 50, skip = 0 } = options;

  const members = await ConversationMember.find({
    conversationId,
    isActive: true,
  })
    .skip(skip)
    .limit(limit)
    .populate("userId", "fullName avatarUrl email role")
    .lean();

  return members.map((m) => ({
    ...m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
};

/**
 * Mark conversation as read for a user
 */
export const markConversationAsRead = async (conversationId, userId) => {
  return ConversationMember.markAsRead(conversationId, userId);
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (messageId, userId) => {
  const message = await Message.findById(messageId);
  
  if (!message) {
    return { success: false, error: "Message not found" };
  }

  // Only sender can delete their own message
  if (message.senderId.toString() !== userId) {
    // Check if user is the coach (owner) of the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || conversation.coachId.toString() !== userId) {
      return { success: false, error: "Cannot delete this message" };
    }
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = null;
  message.mediaUrl = null;
  message.linkUrl = null;
  await message.save();

  return { success: true, message };
};

/**
 * Edit a message
 */
export const editMessage = async (messageId, userId, newContent) => {
  const message = await Message.findById(messageId);
  
  if (!message) {
    return { success: false, error: "Message not found" };
  }

  // Only sender can edit their own message
  if (message.senderId.toString() !== userId) {
    return { success: false, error: "Cannot edit this message" };
  }

  // Can only edit text messages
  if (message.type !== "text") {
    return { success: false, error: "Can only edit text messages" };
  }

  message.content = newContent;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  return { success: true, message };
};

/**
 * Get total unread count for a user
 */
export const getTotalUnreadCount = async (userId) => {
  const result = await ConversationMember.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    { $group: { _id: null, total: { $sum: "$unreadCount" } } },
  ]);

  return result[0]?.total || 0;
};

/**
 * Initialize chat system for a new client (add to coach's global broadcast)
 */
export const initializeClientChat = async (clientId, coachId) => {
  // Add to global broadcast
  await addClientToGlobalBroadcast(coachId, clientId);
  
  // Create direct conversation (but don't send system message)
  await getOrCreateDirectConversation(coachId, clientId);
};

/**
 * Handle subscription approved - add client to plan group
 */
export const onSubscriptionApproved = async (subscription) => {
  const { clientId, coachId, planId, planTitle } = subscription;
  
  await addClientToPlanGroup(planId, coachId, clientId, planTitle);
};

/**
 * Handle subscription expired/cancelled - remove client from plan group
 */
export const onSubscriptionEnded = async (subscription) => {
  const { clientId, planId } = subscription;
  
  await removeClientFromPlanGroup(planId, clientId);
};

export default {
  getOrCreateGlobalBroadcast,
  getOrCreatePlanGroup,
  getOrCreateDirectConversation,
  addClientToGlobalBroadcast,
  removeClientFromGlobalBroadcast,
  addClientToPlanGroup,
  removeClientFromPlanGroup,
  createMessage,
  createSystemMessage,
  getMessages,
  getUserConversations,
  getConversationDetails,
  getConversationMembers,
  markConversationAsRead,
  deleteMessage,
  editMessage,
  getTotalUnreadCount,
  initializeClientChat,
  onSubscriptionApproved,
  onSubscriptionEnded,
};
