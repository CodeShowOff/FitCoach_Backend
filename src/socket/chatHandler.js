// src/socket/chatHandler.js
import {
  validateConversationAccess,
  canSendMessage,
} from "./socketAuth.js";
import {
  createMessage,
  getMessages,
  markConversationAsRead,
  deleteMessage,
  editMessage,
} from "../services/chat.service.js";
import ConversationMember from "../models/ConversationMember.js";
import Conversation from "../models/Conversation.js";

/**
 * Register chat-related socket event handlers
 */
export const registerChatHandlers = (io, socket) => {
  const userId = socket.user._id;
  const userRole = socket.user.role;

  /**
   * Join a conversation room
   * Event: "conversation:join"
   * Data: { conversationId }
   */
  socket.on("conversation:join", async (data, callback) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return callback?.({ success: false, error: "Conversation ID required" });
      }

      const access = await validateConversationAccess(userId, conversationId, userRole);

      if (!access.valid) {
        return callback?.({ success: false, error: access.reason });
      }

      // Join the conversation room
      socket.join(`conversation:${conversationId}`);

      // Mark as read when joining
      await markConversationAsRead(conversationId, userId);

      console.log(`👤 ${socket.user.fullName} joined conversation:${conversationId}`);

      callback?.({ success: true });
    } catch (error) {
      console.error("Error joining conversation:", error);
      callback?.({ success: false, error: "Failed to join conversation" });
    }
  });

  /**
   * Leave a conversation room
   * Event: "conversation:leave"
   * Data: { conversationId }
   */
  socket.on("conversation:leave", async (data, callback) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return callback?.({ success: false, error: "Conversation ID required" });
      }

      socket.leave(`conversation:${conversationId}`);

      console.log(`👤 ${socket.user.fullName} left conversation:${conversationId}`);

      callback?.({ success: true });
    } catch (error) {
      console.error("Error leaving conversation:", error);
      callback?.({ success: false, error: "Failed to leave conversation" });
    }
  });

  /**
   * Send a message
   * Event: "message:send"
   * Data: { conversationId, type, content, mediaUrl?, linkUrl?, linkTitle?, replyToId? }
   */
  socket.on("message:send", async (data, callback) => {
    try {
      const {
        conversationId,
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

      if (!conversationId) {
        return callback?.({ success: false, error: "Conversation ID required" });
      }

      // Validate access
      const access = await validateConversationAccess(userId, conversationId, userRole);

      if (!access.valid) {
        return callback?.({ success: false, error: access.reason });
      }

      // Check if user can send messages (for broadcast channels)
      if (!canSendMessage(access.conversation, userId)) {
        return callback?.({
          success: false,
          error: "Only the coach can send messages in this channel",
        });
      }

      // Validate message content
      if (type === "text" && (!content || content.trim().length === 0)) {
        return callback?.({ success: false, error: "Message content required" });
      }

      if (type === "image" && !mediaUrl) {
        return callback?.({ success: false, error: "Image URL required" });
      }

      if (type === "link" && !linkUrl) {
        return callback?.({ success: false, error: "Link URL required" });
      }

      // Create the message
      const message = await createMessage({
        conversationId,
        senderId: userId,
        type,
        content: content?.trim(),
        mediaUrl,
        mediaPublicId,
        mediaThumbnailUrl,
        linkUrl,
        linkTitle,
        linkDescription,
        linkImageUrl,
        replyToId,
      });

      // Emit to all users in the conversation
      io.to(`conversation:${conversationId}`).emit("message:new", {
        message: message.toObject(),
        conversationId,
      });

      // Also emit to members not in the room (for unread badges)
      const members = await ConversationMember.find({
        conversationId,
        userId: { $ne: userId },
        isActive: true,
      }).lean();

      for (const member of members) {
        io.to(`user:${member.userId}`).emit("conversation:update", {
          conversationId,
          lastMessageAt: message.createdAt,
          lastMessagePreview: getMessagePreview(message),
          lastMessageSenderId: userId,
          unreadIncrement: 1,
        });
      }

      // For direct chats, also notify the other party specifically
      if (access.conversation.type === "direct") {
        const otherUserId =
          access.conversation.coachId.toString() === userId
            ? access.conversation.clientId?.toString()
            : access.conversation.coachId.toString();

        if (otherUserId) {
          io.to(`user:${otherUserId}`).emit("message:notification", {
            conversationId,
            message: message.toObject(),
            senderName: socket.user.fullName,
          });
        }
      }

      callback?.({ success: true, message: message.toObject() });
    } catch (error) {
      console.error("Error sending message:", error);
      callback?.({ success: false, error: "Failed to send message" });
    }
  });

  /**
   * Fetch message history
   * Event: "message:history"
   * Data: { conversationId, limit?, before?, after? }
   */
  socket.on("message:history", async (data, callback) => {
    try {
      const { conversationId, limit = 50, before, after } = data;

      if (!conversationId) {
        return callback?.({ success: false, error: "Conversation ID required" });
      }

      // Validate access
      const access = await validateConversationAccess(userId, conversationId, userRole);

      if (!access.valid) {
        return callback?.({ success: false, error: access.reason });
      }

      const messages = await getMessages(conversationId, { limit, before, after });

      callback?.({ success: true, messages });
    } catch (error) {
      console.error("Error fetching message history:", error);
      callback?.({ success: false, error: "Failed to fetch messages" });
    }
  });

  /**
   * Mark conversation as read
   * Event: "conversation:read"
   * Data: { conversationId }
   */
  socket.on("conversation:read", async (data, callback) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return callback?.({ success: false, error: "Conversation ID required" });
      }

      // Validate access before marking as read
      const access = await validateConversationAccess(userId, conversationId, userRole);

      if (!access.valid) {
        return callback?.({ success: false, error: access.reason });
      }

      await markConversationAsRead(conversationId, userId);

      callback?.({ success: true });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      callback?.({ success: false, error: "Failed to mark as read" });
    }
  });

  /**
   * Delete a message
   * Event: "message:delete"
   * Data: { messageId }
   */
  socket.on("message:delete", async (data, callback) => {
    try {
      const { messageId } = data;

      if (!messageId) {
        return callback?.({ success: false, error: "Message ID required" });
      }

      const result = await deleteMessage(messageId, userId);

      if (!result.success) {
        return callback?.({ success: false, error: result.error });
      }

      // Notify all users in the conversation
      io.to(`conversation:${result.message.conversationId}`).emit("message:deleted", {
        messageId,
        conversationId: result.message.conversationId,
      });

      callback?.({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      callback?.({ success: false, error: "Failed to delete message" });
    }
  });

  /**
   * Edit a message
   * Event: "message:edit"
   * Data: { messageId, content }
   */
  socket.on("message:edit", async (data, callback) => {
    try {
      const { messageId, content } = data;

      if (!messageId || !content) {
        return callback?.({ success: false, error: "Message ID and content required" });
      }

      const result = await editMessage(messageId, userId, content.trim());

      if (!result.success) {
        return callback?.({ success: false, error: result.error });
      }

      // Notify all users in the conversation
      io.to(`conversation:${result.message.conversationId}`).emit("message:edited", {
        messageId,
        conversationId: result.message.conversationId,
        content: result.message.content,
        editedAt: result.message.editedAt,
      });

      callback?.({ success: true, message: result.message.toObject() });
    } catch (error) {
      console.error("Error editing message:", error);
      callback?.({ success: false, error: "Failed to edit message" });
    }
  });

  /**
   * Typing indicator
   * Event: "typing:start" / "typing:stop"
   * Data: { conversationId }
   */
  socket.on("typing:start", async (data) => {
    const { conversationId } = data;
    if (!conversationId) return;

    // Validate access before emitting typing indicator
    const access = await validateConversationAccess(userId, conversationId, userRole);
    if (!access.valid) return;

    socket.to(`conversation:${conversationId}`).emit("typing:update", {
      conversationId,
      userId,
      userName: socket.user.fullName,
      isTyping: true,
    });
  });

  socket.on("typing:stop", async (data) => {
    const { conversationId } = data;
    if (!conversationId) return;

    // Validate access before emitting typing indicator
    const access = await validateConversationAccess(userId, conversationId, userRole);
    if (!access.valid) return;

    socket.to(`conversation:${conversationId}`).emit("typing:update", {
      conversationId,
      userId,
      userName: socket.user.fullName,
      isTyping: false,
    });
  });

  /**
   * Get online status of users
   * Event: "presence:check"
   * Data: { userIds: string[] }
   */
  socket.on("presence:check", async (data, callback) => {
    try {
      const { userIds } = data;

      if (!userIds || !Array.isArray(userIds)) {
        return callback?.({ success: false, error: "User IDs array required" });
      }

      const onlineStatus = {};

      for (const uid of userIds) {
        const sockets = await io.in(`user:${uid}`).fetchSockets();
        onlineStatus[uid] = sockets.length > 0;
      }

      callback?.({ success: true, onlineStatus });
    } catch (error) {
      console.error("Error checking presence:", error);
      callback?.({ success: false, error: "Failed to check presence" });
    }
  });
};

/**
 * Helper: Get message preview text
 */
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

export default { registerChatHandlers };
