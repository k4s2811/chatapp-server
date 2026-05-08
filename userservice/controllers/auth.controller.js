import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { query } from "../config/db.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { ENV_VARS } from "../config/envVars.js";

const audit = async (userId, action, req, metadata = {}) => {
    await query(
        `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, req.ip, req.get('user-agent'), JSON.stringify(metadata)]
    );
};

export async function signup(req, res) {
    const { email, name, password } = req.body;

    const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );
    if (existingEmail.rows.length) {
        return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await query(
        `INSERT INTO users (email, name, password) 
         VALUES ($1, $2, $3)
         RETURNING id, email, name, role, is_active, is_verified, created_at`,
        [email, name, hashedPassword]
    );
    const user = newUser.rows[0];

    const tokenPayload = {
        sub: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        avatar: user.avatar_url
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ sub: user.id });

    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5)`,
        [user.id, refreshToken, refreshExpiresAt, req.ip, req.get('user-agent')]
    );

    await audit(user.id, 'SIGNUP', req);

    res.cookie('refreshToken', refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: ENV_VARS.NODE_ENV !== "production",
    });

    res.status(201).json({
        success: true,
        data: {
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
            },
        },
    })

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
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const user = result.rows[0];

    if (!user) {
        return res.status(404).json({ success: false, message: "Invalid credentials" });
    }
    if (!user.is_active) {
        return res.status(403).json({ success: false, message: "Account is disabled" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const tokenPayload = {
        sub: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        avatar: user.avatar_url
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ sub: user.id });

    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5)`,
        [user.id, refreshToken, refreshExpiresAt, req.ip, req.get('user-agent')]
    );

    await audit(user.id, 'LOGIN', req);

    res.cookie('refreshToken', refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: ENV_VARS.NODE_ENV !== "production",
    });


    res.status(201).json({
        success: true,
        data: {
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
            },
        },
    })

};

export async function logout(req, res) {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
        await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1', [token]);

        try {
            const decoded = verifyRefreshToken(token);
            await audit(decoded.sub, 'LOGOUT', req);
        } catch (err) {
        }
    }
    res.clearCookie('refreshToken');
    res.json({ message: "Logged out" });
}

export async function refresh(req, res) {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token) return res.status(401).json({ message: "No refresh token" });

        const decoded = verifyRefreshToken(token);

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

        const newAccessToken = generateAccessToken({
            sub: record.user_id,
            role: record.role,
            email: record.email
        });

        res.json({
            success: true,
            data: { accessToken: newAccessToken }
        });
    } catch (err) {
        return res.status(403).json({ success: false, message: "Refresh session expired" });
    }
}

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
        `SELECT id, email, bio, name, role, is_active, is_verified, created_at, updated_at
       FROM users WHERE id = $1`,
        [req.user.id]
    );
    const user = result.rows[0];
    res.json({
        success: true,
        data: { user }
    });
};

export async function getUsersByIds(req, res) {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: "No ids provided" });

    const idArray = ids.split(',');

    const result = await query(
        `SELECT id, email, name, avatar_url, bio, is_active 
         FROM users 
         WHERE id = ANY($1::uuid[])`,
        [idArray]
    );

    res.json({ success: true, data: result.rows });
}

export async function getAllUsers(req, res) {
    const result = await query(
        `SELECT id, name, email, avatar_url, bio, is_active 
         FROM users`
    );
    res.json({ success: true, data: result.rows });
}

export async function updateProfile(req, res) {
    const { name, bio, avatar_url } = req.body;
    const result = await query(
        `UPDATE users SET name = $1, bio = $2, avatar_url = $3 WHERE id = $4`,
        [name, bio, avatar_url, req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
}