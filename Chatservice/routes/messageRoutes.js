import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { deleteMessage } from "../controllers/messageController.js";

const router = Router();

router.use(authMiddleware);

router.delete("/:messageId", deleteMessage);

export default router;