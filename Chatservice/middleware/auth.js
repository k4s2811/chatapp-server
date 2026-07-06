import jwt from "jsonwebtoken";
import { ENV_VARS } from "../config/envVars.js";
import { isUserActive } from "../services/userStatus.js";

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, ENV_VARS.JWT_ACCESS_SECRET, { issuer: "auth-backend" });

        // const userId = decoded.sub || decoded.userId || decoded._id || decoded.id;
        // const active = await isUserActive(userId, token);
        // if (!active) {
        //     return res.status(401).json({ success: false, message: "User not found or inactive" });
        // }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

// Restrict a route to users whose access-token `role` is in the allowed list.
// Must run after authMiddleware so req.user is populated.
export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
};

export default authMiddleware;