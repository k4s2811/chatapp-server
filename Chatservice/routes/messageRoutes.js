import { Router } from "express";

import authMiddleware from "../middleware/auth.js";

import {
    sendMessage,
    getMessages,
    deleteMessage
} from "../controllers/messageController.js";

const router = Router();

router.use(authMiddleware);

router.post("/:conversationId", sendMessage);

router.get("/:conversationId", getMessages);

router.delete("/:messageId", deleteMessage);

export default router;