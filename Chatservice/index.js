import http from "http";
import app from "./app.js";
import { connectDB } from "./config/mongo.js";
import initSocket from "./socket/socketHandler.js";
import { ENV_VARS } from "./config/envVars.js";
import { setupRedis } from "./config/redis.js";

const start = async () => {
    await connectDB();
    const httpServer = http.createServer(app);
    const io = initSocket(httpServer);
    await setupRedis(io);
    app.set("io", io);
    httpServer.listen(ENV_VARS.PORT || 3002, () => {
        console.log(`[Server] Chat service running on port ${ENV_VARS.PORT || 3002}`);
    });
};

start().catch((err) => {
    console.error("[Server] Fatal startup error:", err);
    process.exit(1);
});

