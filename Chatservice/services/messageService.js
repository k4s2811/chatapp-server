import Message from "../models/MessageDb.js";
import Conversation from "../models/ConversationDb.js";
import { updateLastMessage } from "./conversationService.js";

/**
 * Send a message in a conversation.
 * Also updates the lastMessage snapshot on the conversation.
 */
export const sendMessage = async ({ conversationId, senderId, text = "", attachments = [], replyToMessageId = null }) => {
    // Verify sender is a participant
    const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.userId": senderId
    });

    if (!conversation) {
        throw new Error("Conversation not found or access denied");
    }

    const message = await Message.create({
        conversationId,
        senderId,
        content: { text, attachments },
        replyToMessageId: replyToMessageId || null
    });

    // Update lastMessage snapshot (non-blocking update is fine)
    await updateLastMessage(conversationId, message);

    return message;
};

/**
 * Get paginated messages for a conversation.
 * Uses cursor-based pagination via `before` (a messageId).
 */
export const getMessages = async ({ conversationId, userId, limit = 30, before = null }) => {
    // Verify access
    const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.userId": userId
    });

    if (!conversation) {
        throw new Error("Conversation not found or access denied");
    }

    const query = {
        conversationId,
        isDeleted: false
    };

    if (before) {
        const cursorMsg = await Message.findById(before).lean();
        if (cursorMsg) {
            query.createdAt = { $lt: cursorMsg.createdAt };
        }
    }

    const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    return messages.reverse(); // return chronological order
};

/**
 * Soft-delete a message (only sender can delete).
 */
export const deleteMessage = async (messageId, userId) => {
    const message = await Message.findOne({ _id: messageId, senderId: userId });

    if (!message) {
        throw new Error("Message not found or you are not the sender");
    }

    message.isDeleted = true;
    await message.save();

    return message;
};