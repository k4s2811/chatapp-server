import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import logger from "../utils/logger.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/token.js";

// --- AUDIT LOGGER ---
export const audit = async (userId, action, req, metadata = {}) => {
    try {
        await query(
            `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata) VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, req.ip, req.get("user-agent"), JSON.stringify(metadata)]
        );
    } catch (err) {
        logger.error({ err, event: "AUDIT_LOG_FAILED", userId, action });
    }
};

// --- SIGNUP ---
export const signupUser = async (email, name, password, req) => {
    try {
        req.log.info({ event: "SIGNUP_SERVICE_STARTED", email });

        const existingEmail = await query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (existingEmail.rows.length) return { error: true, status: 409, message: "Email already exists" };

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await query(
            `INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name, role, avatar_url, is_active, is_verified, created_at`,
            [email, name, hashedPassword]
        );

        const user = newUser.rows[0];
        const tokenPayload = { sub: user.id, role: user.role, email: user.email, name: user.name, avatar: user.avatar_url };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ sub: user.id });
        const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)`,
            [user.id, refreshToken, refreshExpiresAt, req.ip, req.get("user-agent")]
        );

        await audit(user.id, "SIGNUP", req, { email: user.email });
        req.log.info({ event: "SIGNUP_SERVICE_SUCCESS", userId: user.id });

        return { error: false, accessToken, refreshToken, user };
    } catch (err) {
        req.log.error({ err, event: "SIGNUP_SERVICE_ERROR", email });
        throw err;
    }
};

// --- LOGIN ---
export const loginUser = async (email, password, req) => {
    try {
        req.log.info({ event: "LOGIN_SERVICE_STARTED", email });

        if (!email || !password) return { error: true, status: 400, message: "All fields are required" };

        const result = await query(
            `SELECT id, email, password, role, name, avatar_url, is_active, is_verified FROM users WHERE email = $1`,
            [email]
        );

        if (!result.rows.length) {
            await audit(null, "LOGIN_FAILED", req, { email });
            return { error: true, status: 401, message: "Invalid credentials" };
        }

        const user = result.rows[0];
        if (!user.is_active) return { error: true, status: 403, message: "Account is disabled" };

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            await audit(user.id, "LOGIN_FAILED", req, { email: user.email });
            return { error: true, status: 401, message: "Invalid credentials" };
        }

        const tokenPayload = { sub: user.id, role: user.role, email: user.email, name: user.name, avatar: user.avatar_url };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ sub: user.id });
        const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)`,
            [user.id, refreshToken, refreshExpiresAt, req.ip, req.get("user-agent")]
        );

        await audit(user.id, "LOGIN", req, { email: user.email });
        req.log.info({ event: "LOGIN_SERVICE_SUCCESS", userId: user.id });

        return { error: false, accessToken, refreshToken, user };
    } catch (err) {
        req.log.error({ err, event: "LOGIN_SERVICE_ERROR", email });
        throw err;
    }
};

// --- LOGOUT ---
export const logoutUser = async (token, req) => {
    try {
        if (!token) return;
        await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`, [token]);
        const decoded = verifyRefreshToken(token);
        await audit(decoded.sub, "LOGOUT", req);
        req.log.info({ event: "LOGOUT_SUCCESS", userId: decoded.sub });
    } catch (err) {
        req.log.error({ err, event: "LOGOUT_ERROR" });
        throw err;
    }
};

// --- REFRESH SESSION ---
export const refreshSession = async (token, req) => {
    try {
        if (!token) return { error: true, status: 401, payload: { success: false, message: "No refresh token" } };

        const decoded = verifyRefreshToken(token);
        const result = await query(
            `SELECT rt.*, u.role, u.email, u.name, u.avatar_url, u.is_active FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = $1 AND rt.revoked = FALSE AND rt.expires_at > NOW()`,
            [token]
        );

        if (!result.rows.length) return { error: true, status: 403, payload: { success: false, message: "Invalid refresh token" } };

        const record = result.rows[0];
        if (!record.is_active) return { error: true, status: 403, payload: { success: false, message: "Account disabled" } };

        const newAccessToken = generateAccessToken({
            sub: record.user_id, role: record.role, email: record.email, name: record.name, avatar: record.avatar_url,
        });

        req.log.info({ event: "TOKEN_REFRESH_SUCCESS", userId: record.user_id });
        return { error: false, newAccessToken };
    } catch (err) {
        req.log.error({ err, event: "TOKEN_REFRESH_ERROR" });
        return { error: true, status: 403, payload: { success: false, message: "Refresh session expired" } };
    }
};

// --- CHANGE PASSWORD ---
export const changeUserPassword = async (userId, currentPassword, newPassword, req) => {
    try {
        const result = await query(`SELECT password FROM users WHERE id = $1`, [userId]);
        const user = result.rows[0];

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return { error: true, type: "current_password_invalid" };

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await query(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, userId]);
        await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]);

        await audit(userId, "PASSWORD_CHANGED", req);
        req.log.info({ event: "PASSWORD_CHANGED", userId });

        return { error: false };
    } catch (err) {
        req.log.error({ err, event: "PASSWORD_CHANGE_ERROR", userId });
        throw err;
    }
};

// --- GET USER ---
export const getUserData = async (userId) => {
    const result = await query(
        `SELECT id, email, bio, name, role, avatar_url, is_active, is_verified, created_at, updated_at FROM users WHERE id = $1`,
        [userId]
    );
    return result.rows[0];
};

// --- GET USERS BY IDS ---
export const getUsersByIdsList = async (ids) => {
    if (!ids) return { error: true };
    const idArray = ids.split(",");
    const result = await query(
        `SELECT id, email, name, avatar_url, bio, is_active FROM users WHERE id = ANY($1::uuid[])`,
        [idArray]
    );
    return { error: false, data: result.rows };
};

// --- GET ALL USERS ---
export const getAllUsersData = async () => {
    const result = await query(`SELECT id, name, email, avatar_url, bio, is_active FROM users`);
    return result.rows;
};

// --- UPDATE PROFILE ---
export const updateUserData = async (userId, data) => {
    const { name, bio, avatar_url } = data;
    const result = await query(
        `UPDATE users SET name = $1, bio = $2, avatar_url = $3 WHERE id = $4 RETURNING id, name, bio, avatar_url`,
        [name, bio, avatar_url, userId]
    );
    return result.rows[0];
};