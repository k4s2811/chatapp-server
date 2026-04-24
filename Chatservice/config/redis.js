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

// set userid with socketid
export const setOnlineStatus = async (userId, socketId) => {
    safetyCheck(userId, socketId);
    await pubClient.hSet("online_users", userId, socketId);
};
//remove userid with socketid
export const setOfflineStatus = async (userId) => {
    safetyCheck(userId);
    await pubClient.hDel("online_users", userId);
};
//get socketid with userid if he is online
export const getSocketId = async (userId) => {
    safetyCheck(userId);
    return await pubClient.hGet("online_users", userId);
};
//check if user is online
export const isUserOnline = async (userId) => {
    safetyCheck(userId);
    return await pubClient.hExists("online_users", userId);
};