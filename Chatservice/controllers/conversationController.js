import * as conversationService from "../services/conversationService.js";


export const startOrGetConversation = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.user.userId;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "targetUserId is required" });
        }

        if (targetUserId === currentUserId) {
            return res.status(400).json({ success: false, message: "Cannot start conversation with yourself" });
        }

        const conversation = await conversationService.findOrCreateDM(currentUserId, targetUserId);

        return res.status(200).json({ success: true, data: conversation });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getMyConversations = async (req, res) => {
    try {
        const conversations = await conversationService.getUserConversations(req.user.userId);
        return res.status(200).json({ success: true, data: conversations });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};


export const getConversation = async (req, res) => {
    try {
        const conversation = await conversationService.getConversationById(
            req.params.conversationId,
            req.user.userId
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
        if (!messageId) return res.status(400).json({ success: false, message: "messageId required" });

        await conversationService.markAsRead(req.params.conversationId, req.user.userId, messageId);

        return res.status(200).json({ success: true, message: "Marked as read" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};