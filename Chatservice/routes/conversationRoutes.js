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

router.use(authMiddleware);

router.post("/", startOrGetConversation);
router.get("/", getMyConversations);
router.get("/:conversationId", getConversation);
router.post("/:conversationId/read", markConversationRead);


router.post("/:conversationId/messages", sendMessage);
router.get("/:conversationId/messages", getMessages);

export default router;