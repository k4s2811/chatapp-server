import { Router } from "express";
import { clearAllDatabaseData } from "../controllers/admin.controller.js";
import authMiddleware, { requireRole } from "../middleware/auth.js";

const router = Router();

// Destructive: wipes all conversations & messages. Admins only.
router.delete("/clearalldata", authMiddleware, requireRole("admin"), clearAllDatabaseData);

export default router;
