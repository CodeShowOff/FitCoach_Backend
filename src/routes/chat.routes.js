// src/routes/chat.routes.js
import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import {
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
} from "../controllers/chat.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ------------------------------
// General Chat Routes
// ------------------------------

// Get total unread count
router.get("/unread-count", getUnreadCount);

// Get all conversations for current user
router.get("/conversations", getConversations);

// Get/create broadcast channel (coach only)
router.get("/broadcast", authorizeRoles("coach"), getBroadcastChannel);

// Start/get direct chat with a user
router.post("/direct/:userId", startDirectChat);

// ------------------------------
// Conversation-specific Routes
// ------------------------------

// Get single conversation details
router.get("/conversations/:conversationId", getConversation);

// Get conversation members
router.get("/conversations/:conversationId/members", getMembers);

// Get messages for a conversation
router.get("/conversations/:conversationId/messages", getConversationMessages);

// Send a message (text or link)
router.post("/conversations/:conversationId/messages", sendMessage);

// Upload image and send as message
router.post(
  "/conversations/:conversationId/upload",
  upload.single("image"),
  uploadChatImage
);

// Mark conversation as read
router.post("/conversations/:conversationId/read", markAsRead);

// Mute/unmute conversation
router.patch("/conversations/:conversationId/mute", toggleMute);

export default router;
