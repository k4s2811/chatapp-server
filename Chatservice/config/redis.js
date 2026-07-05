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

