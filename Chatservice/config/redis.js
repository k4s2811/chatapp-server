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
    await pubClient.sAdd(getUserSocketKey(userId), socketId);
};

// Remove a specific socket ID when one tab disconnects
export const setOfflineStatus = async (userId, socketId) => {
    safetyCheck(userId, "User ID");
    safetyCheck(socketId, "Socket ID");
    await pubClient.sRem(getUserSocketKey(userId), socketId);
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

