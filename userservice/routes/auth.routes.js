import express from "express";
import { authenticate } from "../middleware/auth.middlewares.js";
import { signup, login, logout, refresh, changePassword, me, getUsersByIds, getAllUsers, updateProfile, googleCallback } from "../controllers/auth.controller.js"
import { validate, registerRules, loginRules, changePasswordRules } from "../middleware/Validate.middleware.js";
import passport from "passport";

const router = express.Router();

router.post("/signup", registerRules, validate, signup);

router.post("/signin", loginRules, validate, login);

router.post("/refresh", refresh);

router.post("/signout", logout);

// router.post("/update", update);

router.get("/me", authenticate, me);

router.post("/changepassword", authenticate, changePasswordRules, validate, changePassword);

router.get("/usersByIds", authenticate, getUsersByIds);

router.get("/allusers", authenticate, getAllUsers);

router.post("/update", authenticate, updateProfile);

// router.post("/delete", deleteUser);

// 1. Send user to Google
router.get("/google", passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google sends user back here
router.get(
    "/google/callback",
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:5100/signin?error=auth_failed',
        session: false
    }),
    googleCallback
);

export default router;