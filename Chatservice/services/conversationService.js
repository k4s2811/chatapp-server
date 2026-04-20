import Conversation from "../models/ConversationDb.js";

/**
 * Find or create a 1-to-1 conversation between two users.
 */
export const findOrCreateDM = async (userIdA, userIdB) => {
    // Look for existing DM between exactly these two users
    let conversation = await Conversation.findOne({
        isGroup: false,
        "participants.userId": { $all: [userIdA, userIdB] },
        $expr: { $eq: [{ $size: "$participants" }, 2] }
    });

    if (!conversation) {
        conversation = await Conversation.create({
            isGroup: false,
            participants: [
                { userId: userIdA, role: "member" },
                { userId: userIdB, role: "member" }
            ]
        });
    }

    return conversation;
};

/**
 * Get all conversations for a user, sorted by latest activity.
 */
export const getUserConversations = async (userId) => {
    return Conversation.find({
        "participants.userId": userId
    })
        .sort({ updatedAt: -1 })
        .lean();
};

/**
 * Get a single conversation — only if the user is a participant.
 */
export const getConversationById = async (conversationId, userId) => {
    const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.userId": userId
    }).lean();

    return conversation;
};

/**
 * Mark all messages as read for a user in a conversation.
 * Updates lastReadMessageId to the latest message.
 */
export const markAsRead = async (conversationId, userId, messageId) => {
    return Conversation.updateOne(
        { _id: conversationId, "participants.userId": userId },
        { $set: { "participants.$.lastReadMessageId": messageId } }
    );
};

/**
 * Update the lastMessage snapshot on the conversation document.
 */
export const updateLastMessage = async (conversationId, message) => {
    return Conversation.findByIdAndUpdate(
        conversationId,
        {
            $set: {
                lastMessage: {
                    messageId: message._id,
                    content: message.content.text || "[attachment]",
                    senderId: message.senderId,
                    createdAt: message.createdAt
                }
            }
        },
        { new: true }
    );
};