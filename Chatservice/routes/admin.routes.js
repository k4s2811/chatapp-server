import { Router } from "express";
import { clearAllDatabaseData } from "../controllers/admin.controller.js";

const router = Router();

router.delete("/clearalldata", clearAllDatabaseData);

export default router;
