import pino from "pino";
import { ENV_VARS } from "../config/envVars.js"

const isDevelopment = ENV_VARS.NODE_ENV !== "production";

const logger = pino({
    level: ENV_VARS.LOG_LEVEL || "info",

    transport: isDevelopment
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss",
                ignore: "pid,hostname",
            },
        }
        : undefined,

    timestamp: pino.stdTimeFunctions.isoTime,

    base: {
        service: ENV_VARS.SERVICE_NAME,
    },

    redact: {
        paths: [
            "password",
            "req.headers.authorization",
            "req.headers.cookie",
            "refreshToken",
            "accessToken"
        ],
        remove: true,
    },
});

export default logger;