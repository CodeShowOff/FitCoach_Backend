// src/jobs/chatCleanup.job.js
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import cloudinary from "../config/cloudinary.js";

// Retention period in days
const MESSAGE_RETENTION_DAYS = 7;

/**
 * Delete messages older than the retention period
 * Also cleans up associated Cloudinary images
 * @returns {Promise<{deleted: number, imagesDeleted: number}>}
 */
export const cleanupOldMessages = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MESSAGE_RETENTION_DAYS);

  console.log(`🧹 Chat cleanup: Removing messages older than ${cutoffDate.toISOString()}`);

  // Find messages with images to delete from Cloudinary
  const messagesWithImages = await Message.find({
    createdAt: { $lt: cutoffDate },
    type: "image",
    mediaPublicId: { $ne: null },
  }).select("mediaPublicId").lean();

  let imagesDeleted = 0;

  // Delete images from Cloudinary in batches
  if (messagesWithImages.length > 0) {
    const publicIds = messagesWithImages
      .map((m) => m.mediaPublicId)
      .filter(Boolean);

    // Delete in batches of 100 (Cloudinary limit)
    const batchSize = 100;
    for (let i = 0; i < publicIds.length; i += batchSize) {
      const batch = publicIds.slice(i, i + batchSize);
      try {
        const result = await cloudinary.api.delete_resources(batch, {
          type: "upload",
          resource_type: "image",
        });
        imagesDeleted += Object.keys(result.deleted || {}).length;
      } catch (error) {
        console.error("Error deleting images from Cloudinary:", error.message);
        // Continue with message deletion even if image deletion fails
      }
    }
  }

  // Delete old messages from database
  const deleteResult = await Message.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  const deletedCount = deleteResult.deletedCount || 0;

  // Update conversations that may have had their last message deleted
  // Set lastMessagePreview to indicate old messages were cleaned
  if (deletedCount > 0) {
    // Find conversations where the last message was deleted
    const affectedConversations = await Conversation.find({
      lastMessageAt: { $lt: cutoffDate },
    }).select("_id").lean();

    if (affectedConversations.length > 0) {
      // Get the most recent message for each affected conversation
      for (const conv of affectedConversations) {
        const latestMessage = await Message.findOne({
          conversationId: conv._id,
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .lean();

        if (latestMessage) {
          await Conversation.findByIdAndUpdate(conv._id, {
            lastMessageAt: latestMessage.createdAt,
            lastMessagePreview: getMessagePreview(latestMessage),
            lastMessageSenderId: latestMessage.senderId,
          });
        } else {
          // No messages left in conversation
          await Conversation.findByIdAndUpdate(conv._id, {
            lastMessageAt: null,
            lastMessagePreview: null,
            lastMessageSenderId: null,
          });
        }
      }
    }
  }

  console.log(`🧹 Chat cleanup complete: ${deletedCount} messages deleted, ${imagesDeleted} images removed`);

  return {
    deleted: deletedCount,
    imagesDeleted,
    cutoffDate,
  };
};

/**
 * Get statistics about messages that would be cleaned up
 * @returns {Promise<{count: number, imageCount: number, oldestMessage: Date|null}>}
 */
export const getCleanupStats = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MESSAGE_RETENTION_DAYS);

  const [count, imageCount, oldest] = await Promise.all([
    Message.countDocuments({ createdAt: { $lt: cutoffDate } }),
    Message.countDocuments({
      createdAt: { $lt: cutoffDate },
      type: "image",
      mediaPublicId: { $ne: null },
    }),
    Message.findOne({ createdAt: { $lt: cutoffDate } })
      .sort({ createdAt: 1 })
      .select("createdAt")
      .lean(),
  ]);

  return {
    count,
    imageCount,
    oldestMessage: oldest?.createdAt || null,
    cutoffDate,
    retentionDays: MESSAGE_RETENTION_DAYS,
  };
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

export default {
  cleanupOldMessages,
  getCleanupStats,
  MESSAGE_RETENTION_DAYS,
};
