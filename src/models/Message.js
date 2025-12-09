// src/models/Message.js
import mongoose from "mongoose";

/**
 * Message Types:
 * - "text": Plain text message
 * - "image": Image with optional caption
 * - "link": Link with optional preview
 * - "system": System-generated message (e.g., "User joined the group")
 */

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Message type
    type: {
      type: String,
      enum: ["text", "image", "link", "system"],
      default: "text",
    },

    // Text content (for text, image caption, or link description)
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },

    // Media fields (for image type)
    mediaUrl: {
      type: String,
      trim: true,
      default: null,
    },
    mediaPublicId: {
      type: String,
      trim: true,
      default: null,
    },
    mediaThumbnailUrl: {
      type: String,
      trim: true,
      default: null,
    },

    // Link fields (for link type)
    linkUrl: {
      type: String,
      trim: true,
      default: null,
    },
    linkTitle: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    linkDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    linkImageUrl: {
      type: String,
      trim: true,
      default: null,
    },

    // Message status
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },

    // For tracking edits
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },

    // Reply to another message (optional)
    replyToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Cached sender info for faster reads
    senderName: {
      type: String,
      trim: true,
      default: null,
    },
    senderAvatarUrl: {
      type: String,
      trim: true,
      default: null,
    },
    senderRole: {
      type: String,
      enum: ["coach", "client", "admin", "system"],
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for fetching messages in a conversation (sorted by time)
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: 1 });

// Index for finding messages by sender
messageSchema.index({ senderId: 1, createdAt: -1 });

// Pre-save: update conversation's last message info
messageSchema.post("save", async function () {
  if (this.isDeleted) return;
  
  try {
    const Conversation = mongoose.model("Conversation");
    
    let preview = "";
    switch (this.type) {
      case "text":
        preview = this.content?.substring(0, 100) || "";
        break;
      case "image":
        preview = this.content ? `📷 ${this.content.substring(0, 90)}` : "📷 Photo";
        break;
      case "link":
        preview = this.linkTitle ? `🔗 ${this.linkTitle.substring(0, 90)}` : "🔗 Link";
        break;
      case "system":
        preview = this.content?.substring(0, 100) || "System message";
        break;
    }

    await Conversation.findByIdAndUpdate(this.conversationId, {
      lastMessageAt: this.createdAt,
      lastMessagePreview: preview,
      lastMessageSenderId: this.senderId,
    });
  } catch (error) {
    console.error("Error updating conversation last message:", error);
  }
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
