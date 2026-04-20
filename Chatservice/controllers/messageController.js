import * as messageService from "../services/messageService.js";

export const sendMessage = async (req, res) => {
    try {
        const { text, attachments, replyToMessageId } = req.body;
        const { conversationId } = req.params;
        const senderId = req.user.userId;

        const message = await messageService.sendMessage({
            conversationId,
            senderId,
            text,
            attachments,
            replyToMessageId
        });

        const io = req.app.get("io");
        io.to(`conv:${conversationId}`).emit("new_message", message);

        return res.status(201).json({ success: true, data: message });
    } catch (err) {
        const status = err.message.includes("access denied") ? 403 : 500;
        return res.status(status).json({ success: false, message: err.message });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit, before } = req.query;

        const messages = await messageService.getMessages({
            conversationId,
            userId: req.user.userId,
            limit: parseInt(limit) || 30,
            before: before || null
        });

        return res.status(200).json({ success: true, data: messages });
    } catch (err) {
        const status = err.message.includes("access denied") ? 403 : 500;
        return res.status(status).json({ success: false, message: err.message });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const message = await messageService.deleteMessage(req.params.messageId, req.user.userId);

        const io = req.app.get("io");
        io.to(`conv:${message.conversationId.toString()}`).emit("message_deleted", {
            messageId: message._id,
            conversationId: message.conversationId
        });

        return res.status(200).json({ success: true, message: "Message deleted" });
    } catch (err) {
        const status = err.message.includes("not the sender") ? 403 : 500;
        return res.status(status).json({ success: false, message: err.message });
    }
};