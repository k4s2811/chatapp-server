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

// io.on("connection", (socket) => {
//     console.log(`User connected: ${socket.id}`);

//     socket.on("disconnect", () => {
//         console.log("user disconnected");
//     });

//     socket.on("message", (data) => {
//         console.log("message: " + data);
//         io.emit("message", data);
//     });
// });

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Private Message Listener
    socket.on("private_message", (data) => {
        const { targetId, message } = data;

        // Use io.to() to send ONLY to the specific socket ID
        io.to(targetId).emit("message", `[Private from ${socket.id}]: ${message}`);

        // Also send it back to the sender so they see it in their own chat box
        socket.emit("message", `[To ${targetId}]: ${message}`);
    });

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
});
httpServer.listen(3000);