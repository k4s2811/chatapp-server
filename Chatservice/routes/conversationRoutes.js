import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
    startOrGetConversation,
    getMyConversations,
    getConversation,
    markConversationRead
} from "../controllers/conversationController.js";
import { sendMessage, getMessages } from "../controllers/messageController.js";

const router = Router();

// Protect all conversation routes
router.use(authMiddleware);

// ─── Conversation Management ───────────────────────────────────────────────
router.post("/", startOrGetConversation);            // Start or get a 1-to-1 DM
router.get("/", getMyConversations);                 // List all conversations
router.get("/:conversationId", getConversation);     // Get single conversation
router.post("/:conversationId/read", markConversationRead); // Mark as read

// ─── Nested Message Management ─────────────────────────────────────────────
// These are nested because a message is always created within a conversation context
router.post("/:conversationId/messages", sendMessage);      // Send a message (REST fallback)
router.get("/:conversationId/messages", getMessages);       // Get paginated messages

export default router;