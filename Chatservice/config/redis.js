import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { ENV_VARS } from './envVars.js';

let pubClient;
let subClient;

export const setupRedis = async (io) => {
    pubClient = createClient({ url: ENV_VARS.REDIS_URL });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis Pub Error', err));
    subClient.on('error', (err) => console.error('Redis Sub Error', err));

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis Adapter & Clients Initialized');
    return { pubClient, subClient };
};

// set userid with socketid
export const setOnlineStatus = async (userId, socketId) => {
    await pubClient.hSet("online_users", userId, socketId);
};
//remove userid with socketid
export const setOfflineStatus = async (userId) => {
    await pubClient.hDel("online_users", userId);
};
//get socketid with userid if he is online
export const getSocketId = async (userId) => {
    return await pubClient.hGet("online_users", userId);
};
//check if user is online
export const isUserOnline = async (userId) => {
    return await pubClient.hExists("online_users", userId);
};