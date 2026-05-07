import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import Conversation from "../models/ConversationDb.js";
import * as messageService from "../services/messageService.js";
import { markAsRead } from "../services/conversationService.js";
import { setOnlineStatus, setOfflineStatus, isUserOnline } from "../config/redis.js";

const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:5100"],
            credentials: true
        }
    });

    // Authentication Middleware
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(" ")[1];

            if (!token) return next(new Error("Authentication error: no token"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch {
            next(new Error("Authentication error: invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        // Bulletproof ID extraction (handles different JWT payload structures)
        const userId = socket.user.userId || socket.user.sub || socket.user._id || socket.user.id;
        console.log(`[Socket] CONNECTED: User ${userId} (Socket ID: ${socket.id})`);

        await setOnlineStatus(userId, socket.id);
        io.emit("user_online", { userId });

        // JOIN CONVERSATION ROOM
        socket.on("join_conversation", async (conversationId) => {
            try {
                console.log(`[Socket] User ${userId} attempting to join conv:${conversationId}`);
                
                // We check if the conversation exists. If you experience routing issues, 
                // it is usually Mongoose struggling to cast strings to ObjectIds here.
                const conversation = await Conversation.findById(conversationId);

                if (!conversation) {
                    console.log(`[Socket] Denied: Conversation ${conversationId} not found in DB`);
                    return;
                }

                socket.join(`conv:${conversationId}`);
                console.log(`[Socket] Success: User ${userId} joined conv:${conversationId}`);
            } catch (err) {
                console.error("[Socket] Error joining room:", err.message);
            }
        });

        // LEAVE CONVERSATION ROOM
        socket.on("leave_conversation", (conversationId) => {
            console.log(`[Socket] User ${userId} left conv:${conversationId}`);
            socket.leave(`conv:${conversationId}`);
        });

        // SEND MESSAGE
        socket.on("send_message", async (payload, ack) => {
            try {
                const {
                    conversationId,
                    text,
                    attachments,
                    replyToMessageId,
                    clientMessageId
                } = payload;

                console.log(`[Socket] User ${userId} sending message to conv:${conversationId}`);

                // Save to database
                const message = await messageService.sendMessage({
                    conversationId,
                    senderId: userId,
                    text,
                    attachments,
                    replyToMessageId,
                    clientMessageId
                });
                // Broadcast to everyone in the room EXCEPT the sender
                socket.to(`conv:${conversationId}`).emit("new_message", message);
                console.log(`[Socket] Broadcasted message to conv:${conversationId}`);

                // Acknowledge success back to the sender
                if (typeof ack === "function") ack({ success: true, messageId: message._id });
            } catch (err) {
                console.error("[Socket] Send message error:", err.message);
                if (typeof ack === "function") ack({ success: false, error: err.message });
            }
        });

        // TYPING INDICATOR
        socket.on("typing", ({ conversationId, isTyping }) => {
            socket.to(`conv:${conversationId}`).emit("typing", {
                userId,
                conversationId,
                isTyping
            });
        });

        // READ RECEIPT
        socket.on("mark_read", async ({ conversationId, messageId }) => {
            try {
                await markAsRead(conversationId, userId, messageId);

                io.to(`conv:${conversationId}`).emit("messages_read", {
                    conversationId,
                    messageId,
                    readByUserId: userId
                });
            } catch (err) {
                console.error("[Socket] Mark read error:", err.message);
            }
        });

        // CHECK USER ONLINE STATUS
        socket.on("check_online", async (targetUserId, ack) => {
            const online = await isUserOnline(targetUserId);
            if (typeof ack === "function") {
                ack({ online });
            }
        });

        // DISCONNECT
        socket.on("disconnect", async () => {
            console.log(`[Socket] DISCONNECTED: User ${userId} (Socket ID: ${socket.id})`);

            await setOfflineStatus(userId, socket.id);

            // Check if the user is completely offline (e.g., no other tabs open)
            const stillOnline = await isUserOnline(userId);
            if (!stillOnline) {
                io.emit("user_offline", { userId });
            }
        });
    });

    return io;
};

export default initSocket;