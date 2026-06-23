import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Conversation from "../models/ConversationDb.js";
import * as messageService from "../services/messageService.js";
import { markAsRead } from "../services/conversationService.js";


const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true
        }
    });

    // 1. Authentication Middleware
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(" ")[1];

            if (!token) {
                return next(new Error("Authentication error: no token provided"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            console.error("[Socket] Auth Error:", err.message);
            next(new Error("Authentication error: invalid or expired token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = String(socket.user.userId || socket.user.sub || socket.user._id || socket.user.id);
        console.log(`[Socket] CONNECTED: User ${userId} (Socket ID: ${socket.id})`);

        socket.join(userId);
        // bugfix: broadcast to exclude sender — connecting user shouldn't get user_online about themselves
        socket.broadcast.emit("user_online", { userId });

        // JOIN CONVERSATION ROOM
        socket.on("join_conversation", async (conversationId) => {
            try {
                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    "participants.userId": userId
                });

                if (!conversation) {
                    socket.emit("room_error", { message: "Access denied" });
                    return;
                }
                socket.join(`conv:${conversationId}`);
            } catch (err) {
                console.error(`[Socket] Error joining room conv:${conversationId}:`, err.message);
            }
        });

        // LEAVE CONVERSATION ROOM
        socket.on("leave_conversation", (conversationId) => {
            socket.leave(`conv:${conversationId}`);
        });

        // SEND MESSAGE 
        socket.on("send_message", async (payload, ack) => {
            try {
                const { conversationId, text, attachments, replyToMessageId, clientMessageId } = payload;

                const message = await messageService.sendMessage({
                    conversationId, senderId: userId, text, attachments, replyToMessageId, clientMessageId
                });

                // bugfix: io.to instead of socket.to so sender also gets the event
                // and useConversationStore.handleSocketNewMessage updates the sidebar.
                // Duplicate is skipped by clientMessageId / _id dedup.
                io.to(`conv:${conversationId}`).emit("new_message", message);

                if (typeof ack === "function") ack({ success: true, messageId: message._id });
            } catch (err) {
                if (typeof ack === "function") ack({ success: false, error: err.message });
            }
        });

        // TYPING INDICATOR
        socket.on("typing", ({ conversationId, isTyping }) => {
            socket.to(`conv:${conversationId}`).emit("typing", { userId, conversationId, isTyping });
        });

        // READ RECEIPT
        socket.on("mark_read", async ({ conversationId, messageId }) => {
            try {
                await markAsRead(conversationId, userId, messageId);
                io.to(`conv:${conversationId}`).emit("messages_read", {
                    conversationId, messageId, readByUserId: userId
                });
            } catch (err) {
                console.error("[Socket] Mark read error:", err.message);
            }
        });

        // CHECK USER ONLINE STATUS
        socket.on("check_online", async (targetUserId, ack) => {
            try {
                const sockets = await io.in(String(targetUserId)).fetchSockets();
                const online = sockets.length > 0;

                if (typeof ack === "function") ack({ online });
            } catch (err) {
                if (typeof ack === "function") ack({ online: false });
            }
        });

        // DISCONNECT HANDLING
        socket.on("disconnect", async () => {
            console.log(`[Socket] DISCONNECTED: User ${userId} (Socket ID: ${socket.id})`);
            setTimeout(async () => {
                const sockets = await io.in(userId).fetchSockets();

                if (sockets.length === 0) {
                    io.emit("user_offline", { userId });
                }
            }, 1000);
        });
    });

    return io;
};

export default initSocket;
