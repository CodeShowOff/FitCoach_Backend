// src/socket/socketServer.js
import { Server as SocketIOServer } from "socket.io";
import { socketAuthMiddleware } from "./socketAuth.js";
import { registerChatHandlers } from "./chatHandler.js";
import { getTotalUnreadCount } from "../services/chat.service.js";

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - The HTTP server instance
 * @param {string[]} origins - Allowed CORS origins
 * @returns {Server} Socket.IO server instance
 */
export const initializeSocketServer = (httpServer, origins = []) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: origins.length > 0 ? origins : "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.user.fullName} (${socket.id})`);

    // Join user to their personal room for targeted messages
    socket.join(`user:${socket.user._id}`);

    // If coach, join their coach room
    if (socket.user.role === "coach") {
      socket.join(`coach:${socket.user._id}`);
    }

    // If client with a coach, join their coach's client room
    if (socket.user.role === "client" && socket.user.coachId) {
      socket.join(`coach:${socket.user.coachId}:clients`);
    }

    // Emit initial unread chat count for quick client sync
    if (socket.user.role === "coach" || socket.user.role === "client") {
      void getTotalUnreadCount(socket.user._id)
        .then((count) => {
          socket.emit("chat:unread-count", { count });
        })
        .catch((error) => {
          console.error("Failed to emit initial chat unread count:", error);
        });
    }

    // Register chat event handlers
    registerChatHandlers(io, socket);

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.user.fullName} - ${reason}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.user.fullName}:`, error);
    });
  });

  console.log("🔌 Socket.IO server initialized");
  return io;
};

/**
 * Get the Socket.IO server instance
 * @returns {Server|null}
 */
export const getIO = () => io;

/**
 * Emit event to a specific user
 * @param {string} userId - Target user ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit event to all members of a conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export const emitToConversation = (conversationId, event, data) => {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }
};

/**
 * Emit event to all clients of a coach
 * @param {string} coachId - Coach ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export const emitToCoachClients = (coachId, event, data) => {
  if (io) {
    io.to(`coach:${coachId}:clients`).emit(event, data);
  }
};

/**
 * Get all socket IDs for a user
 * @param {string} userId - User ID
 * @returns {Promise<string[]>}
 */
export const getUserSockets = async (userId) => {
  if (!io) return [];
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.map((s) => s.id);
};

/**
 * Check if a user is online
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export const isUserOnline = async (userId) => {
  const sockets = await getUserSockets(userId);
  return sockets.length > 0;
};

export default { 
  initializeSocketServer, 
  getIO, 
  emitToUser, 
  emitToConversation,
  emitToCoachClients,
  getUserSockets,
  isUserOnline,
};
