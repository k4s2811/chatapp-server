import express from "express";
import cors from "cors";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "chat-service" }));

app.use("brr/chat/conversations", conversationRoutes);
app.use("brr/chat/messages", messageRoutes);

app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

export default app;