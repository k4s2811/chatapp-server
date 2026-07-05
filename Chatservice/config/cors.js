import { ENV_VARS } from "./envVars.js";

// Requests with no Origin header (server-to-server, curl, health checks) are allowed so internal calls and health checks work.
export const corsOptions = {
  origin(origin, callback) {
    if (!origin || ENV_VARS.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};