import * as conversationService from "../services/conversationService.js";

const getUserId = (user) => user.userId || user.sub || user._id || user.id;

export const startOrGetConversation = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = getUserId(req.user);

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "targetUserId is required" });
        }

        if (targetUserId === currentUserId) {
            return res.status(400).json({ success: false, message: "Cannot start conversation with yourself" });
        }

        const conversation = await conversationService.findOrCreateDM(currentUserId, targetUserId);

        return res.status(200).json({ success: true, data: conversation });
    } catch (err) {
        console.error("Error in startOrGetConversation:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getMyConversations = async (req, res) => {
    try {
        const currentUserId = getUserId(req.user);
        const conversations = await conversationService.getUserConversations(currentUserId);
        return res.status(200).json({ success: true, data: conversations });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getConversation = async (req, res) => {
    try {
        const currentUserId = getUserId(req.user);
        const conversation = await conversationService.getConversationById(
            req.params.conversationId,
            currentUserId
        );

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        return res.status(200).json({ success: true, data: conversation });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const markConversationRead = async (req, res) => {
    try {
        const { messageId } = req.body;
        const currentUserId = getUserId(req.user);

        if (!messageId) return res.status(400).json({ success: false, message: "messageId required" });

        await conversationService.markAsRead(req.params.conversationId, currentUserId, messageId);

        return res.status(200).json({ success: true, message: "Marked as read" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};