import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV_VARS } from "./config/envVars.js";
import crypto from "crypto";
import pinoHttp from "pino-http";
import logger from "./utils/logger.js";
import authRoutes from "./routes/auth.routes.js";
import pool from "./config/db.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { migrate } from "./models/migrate.js";

import passport from "passport"; // Keep this
import "./services/google_auth.js"; // Keep this so the strategy loads

const app = express();

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

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