import { Server } from "socket.io";
import jwt from "jsonwebtoken"; // Standard ES Import

import * as messageService from "../services/messageService.js";
import { markAsRead } from "../services/conversationService.js";
import { setOnlineStatus, setOfflineStatus, isUserOnline } from "../config/redis.js";

const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

        if (!token) return next(new Error("Authentication error: no token"));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch {
            next(new Error("Authentication error: invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.user.userId;

        await setOnlineStatus(userId, socket.id);

        socket.on("join_conversation", (conversationId) => {
            socket.join(`conv:${conversationId}`);
        });

        socket.on("leave_conversation", (conversationId) => {
            socket.leave(`conv:${conversationId}`);
        });

        socket.on("send_message", async (payload, ack) => {
            try {
                const { conversationId, text, attachments, replyToMessageId } = payload;

                const message = await messageService.sendMessage({
                    conversationId,
                    senderId: userId,
                    text,
                    attachments,
                    replyToMessageId
                });

                io.to(`conv:${conversationId}`).emit("new_message", message);

                if (typeof ack === "function") ack({ success: true, messageId: message._id });
            } catch (err) {
                if (typeof ack === "function") ack({ success: false, error: err.message });
            }
        });

        socket.on("typing", ({ conversationId, isTyping }) => {
            io.to(`conv:${conversationId}`).emit("typing", { userId, isTyping, conversationId });
        });

        socket.on("mark_read", async ({ conversationId, messageId }) => {
            await markAsRead(conversationId, userId, messageId);

            io.to(`conv:${conversationId}`).emit("messages_read", { conversationId, readByUserId: userId, messageId });
        });

        socket.on("check_online", async (targetUserId, ack) => {
            const online = await isUserOnline(targetUserId);
            if (typeof ack === "function") ack({ online });
        });

        socket.on("disconnect", async () => {
            await setOfflineStatus(userId);
        });
    });

    return io;
};

export default initSocket;