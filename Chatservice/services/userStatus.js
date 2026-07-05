import { ENV_VARS } from "../config/envVars.js";

// Cache verified "is user still active" results briefly so we don't call
// userservice on every single REST request or socket event. A deactivated
// user can still act for up to CACHE_TTL_MS after being banned — acceptable
// trade-off for chat; tighten CACHE_TTL_MS if that's not acceptable for you.
const CACHE_TTL_MS = 60_000;
const cache = new Map(); // userId -> { active: boolean, expiresAt: number }

export const isUserActive = async (userId, accessToken) => {
    const cached = cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.active;
    }

    try {
        const res = await fetch(`${ENV_VARS.USERSERVICE_URL}/chat/user/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const active = res.ok;
        cache.set(userId, { active, expiresAt: Date.now() + CACHE_TTL_MS });
        return active;
    } catch (err) {
        // userservice unreachable: fail open using the last known cached value
        // if we have one, otherwise fail closed (deny) rather than trust a
        // token we can't verify against the source of truth.
        console.error("[userStatus] Could not reach userservice:", err.message);
        return cached ? cached.active : false;
    }
};