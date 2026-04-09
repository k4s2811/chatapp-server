import { User } from "../models/user.js"
import bcryptjs from "bcryptjs"
import { generateAccessToken, generateRefreshToken } from "../utils/token.js"
import { ENV_VARS } from "../envVars.js";
import AuthService from '../services/auth.service.js';


export async function signup(req, res) {
    try {
        const { firstname, lastname, email, password } = req.body;

        if (password.length < 4) {
            return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
        }

        const existingEmail = await User.findOne({ email: email });

        if (existingEmail) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        const newUser = new User({
            firstName: firstname,
            lastName: lastname,
            email: email,
            passwordHash: hashedPassword
        });

        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);

        newUser.refreshToken = refreshToken;
        newUser.lastLogin = new Date();
        await newUser.save();

        res.cookie("jwt-ks", refreshToken, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in MS
            httpOnly: true, // prevent XSS attacks cross-site scripting attacks, make it not be accessed by JS
            sameSite: "strict", // CSRF attacks cross-site request forgery attacks
            secure: ENV_VARS.NODE_ENV !== "development",
        });

        res.status(201).json({
            accessToken,
            success: true,
            user: {
                id: newUser._id,
                username: newUser.firstName + " " + newUser.lastName,
                email: newUser.email,
                role: newUser.role,
                password: "",
            },
        });
    } catch (error) {
        console.error("Error in signup controller", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const user = await User.findOne({ email: email }).select("+passwordHash +refreshToken"); //needed only during login to compare passwords and when validating refresh token.

        if (!user) {
            return res.status(404).json({ success: false, message: "Invalid credentials" });
        }

        const isPasswordCorrect = await bcryptjs.compare(password, user.passwordHash);

        if (!isPasswordCorrect) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account disabled" });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token in DB (rotation-ready)
        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save();

        res.cookie("jwt-ks", refreshToken, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in MS
            httpOnly: true, // prevent XSS attacks cross-site scripting attacks, make it not be accessed by JS
            sameSite: "strict", // CSRF attacks cross-site request forgery attacks
            secure: ENV_VARS.NODE_ENV !== "development",
        });


        res.status(201).json({
            accessToken,
            success: true,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                password: "",
            },
        });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export async function logout(req, res) {
    try {
        const token = req.cookies.refreshToken;
        if (token) {
            const user = await User.findOne({ refreshToken: token });
            if (user) {
                user.refreshToken = null;
                await user.save();
            }
        }
        res.clearCookie("refreshToken");
        res.json({ message: "Logged out" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export async function authCheck(req, res) {
    try {
        console.log("req.user:", req.user);
        res.status(200).json({ success: true, user: req.user });
    } catch (error) {
        console.log("Error in authCheck controller", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export async function refresh(req, res) {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    try {
        const decoded = jwt.verify(token, ENV_VARS.REFRESH_SECRET);
        const user = await User.findById(decoded.userId).select("+refreshToken");

        if (!user || user.refreshToken !== token)
            return res.status(403).json({ message: "Invalid refresh token" });

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        user.refreshToken = newRefreshToken;
        await user.save();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
            sameSite: "Strict",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.json({ accessToken: newAccessToken });
    } catch {
        res.status(403).json({ message: "Refresh token expired or invalid" });
    }
};