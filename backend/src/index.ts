import express from "express";
import cors from "cors";

import handle from "./handlers";

const socket = require("socket.io");

// App setup
const PORT = 5000;
const app = express();
app.use(cors());
const server = app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Static files
// app.use(express.static("public"));

// Socket setup
const io = socket(server, {
  transports: ["websocket"],
  cors: {
    origin: "*",
  },
});

handle(app, io);