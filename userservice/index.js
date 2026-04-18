import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV_VARS } from "./config/envVars.js";

import authRoutes from "./routes/auth.routes.js";
import pool from "./config/db.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { migrate } from "./models/migrate.js";


const app = express();
app.use(express.json())
app.use(cors({ origin: 'http://localhost:5100', credentials: true }));
app.use(cookieParser());



app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.use("/brr/user", authRoutes);
app.use(errorHandler);

const start = async () => {
  await migrate();   // tables created first
  app.listen(ENV_VARS.PORT, () => {
    console.log("Server started at http://localhost:" + ENV_VARS.PORT);
  });
};

start();