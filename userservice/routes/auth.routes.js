import express from "express"
import { signup, login, logout, authCheck, refresh } from "../controllers/auth.controller.js"
import { verifyAccessToken } from "../middleware/auth.middleware.js"

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/authCheck", verifyAccessToken, authCheck);

export default router;