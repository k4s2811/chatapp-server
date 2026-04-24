import Conversation from "../models/ConversationDb.js";

export const findOrCreateDM = async (userIdA, userIdB) => {
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

export const getUserConversations = async (userId) => {
    return Conversation.find({
        "participants.userId": userId
    })
        .sort({ updatedAt: -1 })
        .lean();
};

export const getConversationById = async (conversationId, userId) => {
    const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.userId": userId
    }).lean();

    return conversation;
};

export const markAsRead = async (conversationId, userId, messageId) => {
    return Conversation.updateOne(
        { _id: conversationId, "participants.userId": userId },
        { $set: { "participants.$.lastReadMessageId": messageId } }
    );
};

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