import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV_VARS } from "./envVars.js";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import pool from "./config/db.js";

const app =  express();
app.use(express.json())
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

mongoose.connect(ENV_VARS.MONGO_URI).then(() =>
  console.log("MongoDB connected")
);

app.use("/v1/auth", authRoutes);

app.listen(ENV_VARS.PORT, () => {
	console.log("Server started at http://localhost:" + ENV_VARS.PORT);
});