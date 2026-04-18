import { verifyAccessToken } from '../utils/token.js';
import { query } from '../config/db.js';


export async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: "Access token required" });
        }
        const token = authHeader.split(' ')[1];

        const decoded = verifyAccessToken(token);

        const result = await query(
            'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
            [decoded.sub]
        );

        if (!result.rows.length || !result.rows[0].is_active) {
            return res.status(401).json({ success: false, message: "User not found or inactive" });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
}

export function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Insufficient permissions" });
        }
        next();
    };
}
