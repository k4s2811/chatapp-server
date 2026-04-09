import express from "express";
import { createServer } from "https"; 
import { Server } from "socket.io";
import fs from "fs";

const app = express();

const options = {
  key: fs.readFileSync("path/to/private.key"),
  cert: fs.readFileSync("path/to/certificate.crt")
};

const httpsServer = createServer(options, app);

const io = new Server(httpsServer, {
  cors: { origin: "https://your-frontend.com" }
});

httpsServer.listen(3000);
