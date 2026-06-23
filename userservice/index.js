import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV_VARS } from "./config/envVars.js";
import crypto from "node:crypto";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import logger from "./utils/logger.js";
import authRoutes from "./routes/auth.routes.js";
import pool from "./config/db.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { corsOptions } from "./config/cors.js";
import { migrate } from "./models/migrate.js";

import passport from "passport"; // Keep this
import "./services/google_auth.js"; // Keep this so the strategy loads

const app = express();

// Behind a reverse proxy / docker: trust the first proxy so req.ip and
// rate-limit keys reflect the real client, not the proxy.
app.set("trust proxy", 1);

app.use(express.json({ limit: "100kb" }));
app.use(cors(corsOptions));
app.use(cookieParser());

// Global rate limiter — blunts scraping / abuse across the whole service.
app.use(rateLimit({
  windowMs: ENV_VARS.RATE_LIMIT.windowMs,
  max: ENV_VARS.RATE_LIMIT.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
}));

app.use(pinoHttp({
  logger,
  genReqId: () => crypto.randomUUID()
}));

app.use(passport.initialize()); // Initialize passport (No session needed!)

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// This mounts your /google and /google/callback routes under /chat/user
app.use("/chat/user", authRoutes);

app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("User Service Running");
});

const start = async () => {
  await migrate(); 
  app.listen(ENV_VARS.PORT, () => {
    logger.info({
      port: ENV_VARS.PORT,
      env: ENV_VARS.NODE_ENV,
    }, "User service started");
  });
};

start();