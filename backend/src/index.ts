import express from "express";
import cors from "cors";
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

let THE_DOCUMENTS: any = {
  "1": {
    id: "1",
    boxes: {
      box1: {
        id: "box1",
        x: 0,
        y: 0,
        updated_by: "1",
        updated_at: new Date(),
      },
    },
  },
};

const activeUsers = new Set();

app.get("/get-document/:id", (req, res) => {
  if (THE_DOCUMENTS[req.params.id]) {
    return res.json(THE_DOCUMENTS[req.params.id]).end();
  }
  return res.status(404).end("Not Found");
});

io.use(async (socket: any, next: any) => {
  // TODO: Use Database for persistence
  const { userId, documentId } = socket.handshake.query;
  if (!userId || !documentId) {
    return next(new Error("Insufficient Data"));
  }
  socket.data = {
    userId,
    documentId,
  };
  activeUsers.add(userId);
  return next();
});

io.on("connection", (socket: any) => {
  console.log("Made socket connection");

  socket.on("subscribe_to_document", () => {
    const { data } = socket;
    socket.join(data.documentId);
    io.to(data.documentId).emit("user_connected", [...activeUsers]);
  });

  socket.on("disconnect", () => {
    const { data } = socket;
    activeUsers.delete(data?.userId);
    if (activeUsers.size === 0) {
      // delete the document and free up the memory
      // THE_DOCUMENT = null;
    } else {
      io.to(data.documentId).emit("user_disconnected", data.userId);
    }
  });

  socket.on("update_user_location", (data: { location: [string, string] }) => {
    io.to(socket.data.documentId).emit("update_user_location", {
      userId: socket.data.userId,
      location: data.location,
    });
  });

  socket.on("add_box", (data: { boxId: string; documentId: string }) => {
    const date = new Date();
    const { boxId, documentId } = data;
    if (THE_DOCUMENTS[documentId]?.boxes) {
      const newBox = {
        id: boxId,
        updated_by: socket.data.userId,
        updated_at: date,
        x: 0,
        y: 0,
      };
      THE_DOCUMENTS[documentId].boxes[boxId] = newBox;
      io.to(socket.data.documentId).emit("add_box", newBox);
    }
  });

  socket.on(
    "update_box",
    (data: { boxId: string; location: [string, string] }) => {
      const date = new Date();
      const { userId, documentId } = socket.data;
      const { boxId, location } = data;
      const localBox = THE_DOCUMENTS[documentId]?.boxes?.[boxId];
      if (
        localBox &&
        (localBox.updated_by === userId ||
          date.getTime() - localBox.updated_at.getTime() > 500)
      ) {
        localBox.updated_by = userId;
        localBox.updated_at = date;
        localBox.x = location[0];
        localBox.y = location[1];
        io.to(socket.data.documentId).emit("update_box", localBox);
      }
    }
  );
});
