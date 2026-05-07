import { Router } from "express";

import authMiddleware from "../middleware/auth.js";

import {
    startOrGetConversation,
    getMyConversations,
    getConversation,
    markConversationRead
} from "../controllers/conversationController.js";

const router = Router();

router.use(authMiddleware);

router.post("/", startOrGetConversation);

router.get("/", getMyConversations);

router.get("/:conversationId", getConversation);

router.patch("/:conversationId/read", markConversationRead);

export default router;