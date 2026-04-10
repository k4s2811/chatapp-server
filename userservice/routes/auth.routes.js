import express from "express";
import { authenticate } from "../middleware/auth.middlewares.js";
import { signup, login, logout, refresh, changePassword, me } from "../controllers/auth.controller.js"
import { validate, registerRules, loginRules, changePasswordRules } from "../middleware/Validate.middleware.js";

const router = express.Router();

router.post("/signup", registerRules, validate, signup);

router.post("/signin", loginRules, validate, login);

router.post("/refresh", refresh);

router.post("/signout", logout);

// router.post("/update", update);

router.get("/me", authenticate, me);

router.post("/changepassword", authenticate, changePasswordRules, validate, changePassword);

// router.post("/forgot-password", forgotPassword);

// router.post("/reset-password", resetPassword);

// router.post("/delete", deleteUser);

// router.get("/authCheck", verifyAccessToken, authCheck);

export default router;