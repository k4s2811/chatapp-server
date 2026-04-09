import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("message", (data) => {
        console.log("message: " + data);
        io.emit("message", data);
    });
});

httpServer.listen(3000);