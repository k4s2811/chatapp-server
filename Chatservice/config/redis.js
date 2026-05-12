import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { ENV_VARS } from './envVars.js';

let pubClient;
let subClient;

export const setupRedis = async (io) => {
    pubClient = createClient({
        url: ENV_VARS.REDIS_URL,
        socket: {
            reconnectStrategy: (retries) => {
                console.log(`[Redis] Reconnecting... Attempt ${retries}`);
                const delay = Math.min(retries * 50, 2000);
                return delay;
            },
        },
    });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis Pub Error', err));
    subClient.on('error', (err) => console.error('Redis Sub Error', err));

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis Adapter & Clients Initialized');
    return { pubClient, subClient };
};

const safetyCheck = (value, label = "Value") => {
    if (!value) throw new Error(`${label} is required`);
};

const getUserSocketKey = (userId) => `user:${userId}:sockets`;

// Add a specific socket ID to the user's set
export const setOnlineStatus = async (userId, socketId) => {
    safetyCheck(userId, "User ID");
    safetyCheck(socketId, "Socket ID");
    
    const key = getUserSocketKey(userId);
    await pubClient.sAdd(key, socketId);
    await pubClient.expire(key, 86400); 
};

// Remove a specific socket ID when one tab disconnects
export const setOfflineStatus = async (userId, socketId) => {
    safetyCheck(userId, "User ID");
    safetyCheck(socketId, "Socket ID");

    const key = getUserSocketKey(userId);

    await pubClient.sRem(key, socketId);

    // cleanup empty set
    const remaining = await pubClient.sCard(key);

    if (remaining === 0) {
        await pubClient.del(key);
    }
};

// Get all active socket IDs for a user
export const getSocketIds = async (userId) => {
    safetyCheck(userId, "User ID");
    return await pubClient.sMembers(getUserSocketKey(userId));
};

// User is online if their set of sockets is not empty
export const isUserOnline = async (userId) => {
    safetyCheck(userId, "User ID");
    const count = await pubClient.sCard(getUserSocketKey(userId));
    return count > 0;
};
