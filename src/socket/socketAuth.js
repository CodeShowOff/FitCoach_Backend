// src/socket/socketAuth.js
import { verifyAccessToken } from "../config/jwt.js";
import User from "../models/User.js";

/**
 * Socket.IO authentication middleware
 * Verifies JWT token from handshake and attaches user to socket
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      console.error("Socket auth - Token verification failed:", error.message);
      return next(new Error("Invalid or expired token"));
    }

    // Get user from database
    const user = await User.findById(decoded.id).select("-password").lean();

    if (!user) {
      return next(new Error("User not found"));
    }

    if (!user.emailVerified) {
      return next(new Error("Email not verified"));
    }

    if (user.isActive === false) {
      return next(new Error("Account is deactivated"));
    }

    // Attach user to socket
    socket.user = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      coachId: user.coachId?.toString() || null,
    };

    console.log(`🔌 Socket authenticated: ${user.fullName} (${user.role})`);
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication failed"));
  }
};

/**
 * Validate that user has access to a conversation
 */
export const validateConversationAccess = async (userId, conversationId, userRole) => {
  const Conversation = (await import("../models/Conversation.js")).default;
  const ConversationMember = (await import("../models/ConversationMember.js")).default;

  const conversation = await Conversation.findById(conversationId).lean();
  
  if (!conversation || !conversation.isActive) {
    return { valid: false, reason: "Conversation not found" };
  }

  // Coach always has access to their own conversations
  if (conversation.coachId.toString() === userId) {
    return { valid: true, conversation };
  }

  // For direct chats, check if user is the client
  if (conversation.type === "direct") {
    if (conversation.clientId?.toString() === userId) {
      return { valid: true, conversation };
    }
    // Direct chats only have coach and client - no membership check needed
    return { valid: false, reason: "Access denied to this conversation" };
  }

  // For group chats (global_broadcast, plan_group), check membership
  const membership = await ConversationMember.findOne({
    conversationId,
    userId,
    isActive: true,
  }).lean();

  if (!membership) {
    return { valid: false, reason: "Not a member of this conversation" };
  }

  return { valid: true, conversation, membership };
};

/**
 * Check if user can send messages in a conversation
 * For global_broadcast, only coach can send
 */
export const canSendMessage = (conversation, userId) => {
  if (conversation.type === "global_broadcast") {
    // Only coach can send in broadcast
    return conversation.coachId.toString() === userId;
  }
  // Everyone can send in plan_group and direct
  return true;
};
