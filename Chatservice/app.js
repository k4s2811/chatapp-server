import express from "express";
import cors from "cors";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import adminRoutes from "./routes/admin.routes.js";
import dns from "node:dns";

dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

app.use(cors({ origin: 'http://localhost:5100', credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "chat-service" }));

app.use("/chat/admin", adminRoutes);
app.use("/chat/conversations", conversationRoutes);
app.use("/chat/messages", messageRoutes);

app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

export default app;