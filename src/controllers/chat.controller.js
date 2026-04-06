// src/controllers/chat.controller.js
import asyncHandler from "express-async-handler";
import Joi from "joi";
import streamifier from "streamifier";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import {
  getUserConversations,
  getConversationDetails,
  getConversationMembers,
  getMessages,
  markConversationAsRead,
  getOrCreateDirectConversation,
  getOrCreateGlobalBroadcast,
  getTotalUnreadCount,
  createMessage,
} from "../services/chat.service.js";

// ------------------------------
// 🧩 Validation Schemas
// ------------------------------
const sendMessageSchema = Joi.object({
  type: Joi.string().valid("text", "image", "link").default("text"),
  content: Joi.string().max(5000).allow("", null),
  linkUrl: Joi.string().uri().allow("", null),
  linkTitle: Joi.string().max(200).allow("", null),
  linkDescription: Joi.string().max(500).allow("", null),
  replyToId: Joi.string().allow("", null),
});

const paginationSchema = Joi.object({
  limit: Joi.number().min(1).max(100).default(50),
  before: Joi.date().iso().allow(null),
  after: Joi.date().iso().allow(null),
});

const emitUnreadCountSnapshot = async (userId) => {
  try {
    const { getIO } = await import("../socket/socketServer.js");
    const io = getIO();
    if (!io) return;

    const count = await getTotalUnreadCount(userId);
    io.to(`user:${userId}`).emit("chat:unread-count", { count });
  } catch (error) {
    console.error("Failed to emit unread snapshot:", error);
  }
};

const getMessagePreview = (message) => {
  if (!message) return "";

  switch (message.type) {
    case "text":
      return message.content?.substring(0, 100) || "";
    case "image":
      return message.content ? `📷 ${message.content.substring(0, 90)}` : "📷 Photo";
    case "link":
      return message.linkTitle ? `🔗 ${message.linkTitle.substring(0, 90)}` : "🔗 Link";
    case "system":
      return message.content?.substring(0, 100) || "System message";
    default:
      return "";
  }
};

const emitConversationRealtimeUpdates = async ({
  io,
  conversation,
  conversationId,
  message,
  senderId,
  senderName,
}) => {
  if (!io) return;

  const messageObject = message?.toObject ? message.toObject() : message;

  const members = await ConversationMember.find({
    conversationId,
    userId: { $ne: senderId },
    isActive: true,
  }).lean();

  members.forEach((member) => {
    io.to(`user:${member.userId}`).emit("conversation:update", {
      conversationId,
      lastMessageAt: message.createdAt,
      lastMessagePreview: getMessagePreview(message),
      lastMessageSenderId: senderId,
      unreadIncrement: 1,
    });
  });

  if (conversation.type === "direct") {
    const senderIdStr = senderId.toString();
    const coachId = conversation.coachId?.toString?.() ?? String(conversation.coachId);
    const clientId = conversation.clientId?.toString?.() ?? String(conversation.clientId || "");
    const otherUserId = coachId === senderIdStr ? clientId : coachId;

    if (otherUserId) {
      io.to(`user:${otherUserId}`).emit("message:notification", {
        conversationId,
        message: messageObject,
        senderName,
      });
    }
  }
};

// ------------------------------
// 📋 @desc Get all conversations for current user
// @route GET /api/v1/chat/conversations
// @access Private
// ------------------------------
export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await getUserConversations(req.user._id, req.user.role);

  res.json({
    success: true,
    data: conversations,
    count: conversations.length,
  });
});

// ------------------------------
// 📋 @desc Get single conversation details
// @route GET /api/v1/chat/conversations/:conversationId
// @access Private
// ------------------------------
export const getConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Validate access
  const hasAccess = await validateUserAccess(req.user._id, conversationId, req.user.role);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this conversation");
  }

  const conversation = await getConversationDetails(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  // Get membership info for current user
  const membership = await ConversationMember.findOne({
    conversationId,
    userId: req.user._id,
  }).lean();

  res.json({
    success: true,
    data: {
      ...conversation,
      unreadCount: membership?.unreadCount || 0,
      lastReadAt: membership?.lastReadAt,
      isMuted: membership?.isMuted || false,
    },
  });
});

// ------------------------------
// 👥 @desc Get conversation members
// @route GET /api/v1/chat/conversations/:conversationId/members
// @access Private
// ------------------------------
export const getMembers = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { skip = 0, limit = 50 } = req.query;

  // Validate access
  const hasAccess = await validateUserAccess(req.user._id, conversationId, req.user.role);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this conversation");
  }

  const members = await getConversationMembers(conversationId, {
    skip: parseInt(skip),
    limit: parseInt(limit),
  });

  res.json({
    success: true,
    data: members,
    count: members.length,
  });
});

// ------------------------------
// 💬 @desc Get messages for a conversation
// @route GET /api/v1/chat/conversations/:conversationId/messages
// @access Private
// ------------------------------
export const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { error, value } = paginationSchema.validate(req.query);

  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Validate access
  const hasAccess = await validateUserAccess(req.user._id, conversationId, req.user.role);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this conversation");
  }

  const messages = await getMessages(conversationId, value);

  // Mark as read when fetching messages
  await markConversationAsRead(conversationId, req.user._id);
  await emitUnreadCountSnapshot(req.user._id);

  res.json({
    success: true,
    data: messages,
    count: messages.length,
  });
});

// ------------------------------
// 💬 @desc Send a message (REST fallback)
// @route POST /api/v1/chat/conversations/:conversationId/messages
// @access Private
// ------------------------------
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { error, value } = sendMessageSchema.validate(req.body);

  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Validate access
  const hasAccess = await validateUserAccess(req.user._id, conversationId, req.user.role);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this conversation");
  }

  const conversation = await Conversation.findById(conversationId);

  // Check if user can send (for broadcast channels)
  if (
    conversation.type === "global_broadcast" &&
    conversation.coachId.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("Only the coach can send messages in this channel");
  }

  const { type, content, linkUrl, linkTitle, linkDescription, replyToId } = value;

  // Validate based on type
  if (type === "text" && (!content || content.trim().length === 0)) {
    res.status(400);
    throw new Error("Message content required");
  }

  if (type === "link" && !linkUrl) {
    res.status(400);
    throw new Error("Link URL required");
  }

  const message = await createMessage({
    conversationId,
    senderId: req.user._id,
    type,
    content: content?.trim(),
    linkUrl,
    linkTitle,
    linkDescription,
    replyToId: replyToId || null,
  });

  // Emit via Socket.IO if available
  const { getIO } = await import("../socket/socketServer.js");
  const io = getIO();
  if (io) {
    io.to(`conversation:${conversationId}`).emit("message:new", {
      message: message.toObject(),
      conversationId,
    });

    await emitConversationRealtimeUpdates({
      io,
      conversation,
      conversationId,
      message,
      senderId: req.user._id,
      senderName: req.user.fullName,
    });
  }

  res.status(201).json({
    success: true,
    data: message,
  });
});

// ------------------------------
// 📷 @desc Upload image and send as message
// @route POST /api/v1/chat/conversations/:conversationId/upload
// @access Private
// ------------------------------
export const uploadChatImage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { caption } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error("Image file required");
  }

  // Validate access
  const hasAccess = await validateUserAccess(req.user._id, conversationId, req.user.role);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this conversation");
  }

  const conversation = await Conversation.findById(conversationId);

  // Check if user can send (for broadcast channels)
  if (
    conversation.type === "global_broadcast" &&
    conversation.coachId.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("Only the coach can send messages in this channel");
  }

  // Upload to Cloudinary
  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX || "app";

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folderPrefix}/chat_images`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  });

  // Create thumbnail URL
  const thumbnailUrl = uploadResult.secure_url.replace("/upload/", "/upload/w_200,h_200,c_fill/");

  const message = await createMessage({
    conversationId,
    senderId: req.user._id,
    type: "image",
    content: caption?.trim() || null,
    mediaUrl: uploadResult.secure_url,
    mediaPublicId: uploadResult.public_id,
    mediaThumbnailUrl: thumbnailUrl,
  });

  // Emit via Socket.IO if available
  const { getIO } = await import("../socket/socketServer.js");
  const io = getIO();
  if (io) {
    io.to(`conversation:${conversationId}`).emit("message:new", {
      message: message.toObject(),
      conversationId,
    });

    await emitConversationRealtimeUpdates({
      io,
      conversation,
      conversationId,
      message,
      senderId: req.user._id,
      senderName: req.user.fullName,
    });
  }

  res.status(201).json({
    success: true,
    data: message,
  });
});

// ------------------------------
// ✅ @desc Mark conversation as read
// @route POST /api/v1/chat/conversations/:conversationId/read
// @access Private
// ------------------------------
export const markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Validate access
  const hasAccess = await validateUserAccess(req.user._id, conversationId, req.user.role);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this conversation");
  }

  await markConversationAsRead(conversationId, req.user._id);
  await emitUnreadCountSnapshot(req.user._id);

  res.json({
    success: true,
    message: "Marked as read",
  });
});

// ------------------------------
// 🔢 @desc Get total unread count
// @route GET /api/v1/chat/unread-count
// @access Private
// ------------------------------
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await getTotalUnreadCount(req.user._id);

  res.json({
    success: true,
    data: { unreadCount: count },
  });
});

// ------------------------------
// 💬 @desc Start or get direct conversation with a user
// @route POST /api/v1/chat/direct/:userId
// @access Private
// ------------------------------
export const startDirectChat = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Validate the target user exists
  const targetUser = await User.findById(userId).select("_id role coachId").lean();
  if (!targetUser) {
    res.status(404);
    throw new Error("User not found");
  }

  let coachId, clientId;

  if (req.user.role === "coach") {
    // Coach starting chat with client
    if (targetUser.role !== "client") {
      res.status(400);
      throw new Error("Can only start direct chat with clients");
    }
    // Verify client belongs to this coach
    if (targetUser.coachId?.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("This client is not assigned to you");
    }
    coachId = req.user._id;
    clientId = userId;
  } else if (req.user.role === "client") {
    // Client starting chat with coach
    if (targetUser.role !== "coach") {
      res.status(400);
      throw new Error("Can only start direct chat with your coach");
    }
    // Verify this is the client's coach
    if (req.user.coachId?.toString() !== userId) {
      res.status(403);
      throw new Error("This is not your assigned coach");
    }
    coachId = userId;
    clientId = req.user._id;
  } else {
    res.status(403);
    throw new Error("Invalid role for direct chat");
  }

  const conversation = await getOrCreateDirectConversation(coachId, clientId);

  // Get full details
  const details = await getConversationDetails(conversation._id);

  res.json({
    success: true,
    data: details,
  });
});

// ------------------------------
// 📢 @desc Get or create global broadcast channel (Coach only)
// @route GET /api/v1/chat/broadcast
// @access Private (Coach)
// ------------------------------
export const getBroadcastChannel = asyncHandler(async (req, res) => {
  if (req.user.role !== "coach") {
    res.status(403);
    throw new Error("Only coaches can access broadcast channel management");
  }

  const conversation = await getOrCreateGlobalBroadcast(req.user._id);
  const details = await getConversationDetails(conversation._id);

  res.json({
    success: true,
    data: details,
  });
});

// ------------------------------
// 🔇 @desc Mute/unmute a conversation
// @route PATCH /api/v1/chat/conversations/:conversationId/mute
// @access Private
// ------------------------------
export const toggleMute = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { muted } = req.body;

  if (typeof muted !== "boolean") {
    res.status(400);
    throw new Error("muted field must be a boolean");
  }

  const membership = await ConversationMember.findOneAndUpdate(
    { conversationId, userId: req.user._id },
    { isMuted: muted },
    { new: true }
  );

  if (!membership) {
    res.status(404);
    throw new Error("Not a member of this conversation");
  }

  res.json({
    success: true,
    data: { isMuted: membership.isMuted },
  });
});

// ------------------------------
// 🛠️ Helper: Validate user access to conversation
// ------------------------------
const validateUserAccess = async (userId, conversationId) => {
  const conversation = await Conversation.findById(conversationId).lean();

  if (!conversation || !conversation.isActive) {
    return false;
  }

  // Coach always has access to their own conversations
  if (conversation.coachId.toString() === userId.toString()) {
    return true;
  }

  // For direct chats, check if user is the client
  if (conversation.type === "direct") {
    return conversation.clientId?.toString() === userId.toString();
  }

  // For group chats, check membership
  const membership = await ConversationMember.findOne({
    conversationId,
    userId,
    isActive: true,
  }).lean();

  return !!membership;
};

export default {
  getConversations,
  getConversation,
  getMembers,
  getConversationMessages,
  sendMessage,
  uploadChatImage,
  markAsRead,
  getUnreadCount,
  startDirectChat,
  getBroadcastChannel,
  toggleMute,
};
