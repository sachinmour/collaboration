import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";

if ((process.env.NODE_ENV = "development")) {
  require("dotenv").config();
}

import handle from "./handlers";

const socket = require("socket.io");

// App setup
const PORT = 5000;
const app = express();
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));

const server = app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Static files
app.use(express.static(path.resolve(__dirname + "/../public")));

// Socket setup
const io = socket(server, {
  transports: ["websocket"],
  cors: {
    origin: "*",
  },
});

handle(app, io);

app.get("/*", function (req, res) {
  res.sendFile(path.resolve(__dirname + "/../public/index.html"));
});
