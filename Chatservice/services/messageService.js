// backend/services/messageService.js
import mongoose from "mongoose";
import Message from "../models/MessageDb.js";
import Conversation from "../models/ConversationDb.js";

export const sendMessage = async ({
    conversationId,
    senderId,
    text = "",
    attachments = [],
    replyToMessageId = null,
    clientMessageId
}) => {
    const existingMessage = await Message.findOne({ clientMessageId });
    if (existingMessage) { return existingMessage; }

    const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.userId": senderId
    });

    if (!conversation) {
        throw new Error("Conversation not found or access denied");
    }

    try {
        const message = await Message.create({
            conversationId,
            senderId,
            clientMessageId,
            content: {
                text,
                attachments
            },

            replyToMessageId
        });

        await Conversation.updateOne(
            { _id: conversationId },
            {
                $set: {
                    lastMessage: {
                        messageId: message._id,
                        content: text || "[attachment]",
                        senderId,
                        createdAt: message.createdAt
                    }
                }
            }
        );

        return message;

    } catch (err) {
        throw err;
    }
};

export const getMessages = async ({ conversationId, userId, limit = 15, before = null }) => {
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

    return messages.reverse();
};

export const deleteMessage = async (messageId, userId) => {
    const message = await Message.findOne({ _id: messageId, senderId: userId });

    if (!message) {
        throw new Error("Message not found or you are not the sender");
    }

    message.isDeleted = true;
    message.content.text = "This message was deleted";
    await message.save();

    return message;
};