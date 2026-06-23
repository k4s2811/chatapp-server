import { ENV_VARS } from "./envVars.js";

// Reflect only allow-listed origins. Requests with no Origin header (server-to-server,
// curl, same-origin navigations) are allowed so health checks and OAuth redirects work.
export const corsOptions = {
  origin(origin, callback) {
    if (!origin || ENV_VARS.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
