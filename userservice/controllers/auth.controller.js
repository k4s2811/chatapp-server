import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { query } from "../config/db.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { ENV_VARS } from "../config/envVars.js";
// import AuthService from '../services/auth.service.js';

const audit = async (userId, action, req, metadata = {}) => {
    await query(
        `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, req.ip, req.get('user-agent'), JSON.stringify(metadata)]
    );
};

export async function signup(req, res) {
    const { email, name, password } = req.body;

    //check if email already exists
    const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );
    if (existingEmail.rows.length) {
        return error(res, 409, "Email already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //save user in db
    const newUser = await query(
        `INSERT INTO users (email, name, password) 
         VALUES ($1, $2, $3)
         RETURNING id, email, name, role, is_active, is_verified, created_at`,
        [email, name, hashedPassword]
    );
    const user = newUser.rows[0];

    // Generate verification token

    // const verifyToken = crypto.randomBytes(32).toString('hex');
    // const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    // await query(
    //   `INSERT INTO verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    //   [user.id, verifyToken, expiresAt]
    // );

    const tokenPayload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ sub: user.id });

    // Store refresh token in DB (rotation-ready)
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5)`,
        [user.id, refreshToken, refreshExpiresAt, req.ip, req.get('user-agent')]
    );

    await audit(user.id, 'SIGNUP', req);

    res.cookie(ENV_VARS.NODE_ENV, refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in MS
        httpOnly: true, // prevent XSS attacks cross-site scripting attacks, make it not be accessed by JS
        sameSite: "strict", // CSRF attacks cross-site request forgery attacks
        secure: ENV_VARS.NODE_ENV !== "production",
    });

    res.status(201).json({
        accessToken,
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_verified: user.is_verified,
        },
    });

};

export async function login(req, res) {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    if (!result.rows.length) {
        await audit(null, 'LOGIN_FAILED', req, { email });
        return error(res, 'Invalid credentials', 401);
    }
    const user = result.rows[0];

    if (!user) {
        return res.status(404).json({ success: false, message: "Invalid credentials" });
    }
    if (!user.is_active) {
        return error(res, 'Account is disabled', 403);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const tokenPayload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ sub: user.id });

    // Store refresh token in DB (rotation-ready)
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5)`,
        [user.id, refreshToken, refreshExpiresAt, req.ip, req.get('user-agent')]
    );

    await audit(user.id, 'LOGIN', req);

    res.cookie(ENV_VARS.NODE_ENV, refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in MS
        httpOnly: true, // prevent XSS attacks cross-site scripting attacks, make it not be accessed by JS
        sameSite: "strict", // CSRF attacks cross-site request forgery attacks
        secure: ENV_VARS.NODE_ENV !== "production",
    });


    res.status(201).json({
        accessToken,
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_verified: user.is_verified,
        },
    });

};

export async function logout(req, res) {

    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
        await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1', [token]);
    }
    if (req.user) {
        await audit(req.user.id, 'LOGOUT', req);
    }
    res.clearCookie('refreshToken');
    res.json({ message: "Logged out" });

};

export async function refresh(req, res) {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });
    const decoded = verifyRefreshToken(token);

    // Check token in DB
    const result = await query(
        `SELECT rt.*, u.role, u.email, u.is_active
           FROM refresh_tokens rt
           JOIN users u ON u.id = rt.user_id
           WHERE rt.token = $1 AND rt.revoked = FALSE AND rt.expires_at > NOW()`,
        [token]
    );

    if (!result.rows.length) {
        return res.status(403).json({ message: "Invalid refresh token" });
    }
    const record = result.rows[0];
    if (!record.is_active) {
        return res.status(403).json({ message: "Account is disabled" });
    }

    // Rotate: revoke old, issue new
    await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1', [token]);

    const newRefreshToken = generateRefreshToken({ sub: record.user_id });
    const newAccessToken = generateAccessToken({
        sub: record.user_id,
        role: record.role,
        email: record.email,
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5)`,
        [record.user_id, newRefreshToken, expiresAt, req.ip, req.get('user-agent')]
    );

    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken }, 'Token refreshed');

};

export async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return error(res, 'Current password is incorrect', 400);

    const hashed = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    await query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [req.user.id]);
    await audit(req.user.id, 'PASSWORD_CHANGED', req);

    res.clearCookie('refreshToken');
    res.json({ message: "Password changed successfully. Please log in again." });
}

export async function me(req, res) {
    const result = await query(
        `SELECT id, email, username, role, is_active, is_verified, created_at, updated_at
       FROM users WHERE id = $1`,
        [req.user.id]
    );
    res.json({ user: result.rows[0] });
};

export async function setusername(req,res){
    const {username} = req.body;
    
}