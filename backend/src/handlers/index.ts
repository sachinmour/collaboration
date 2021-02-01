import redis, { addToDocumentStream } from "../_helpers/redis";
import { THE_DOCUMENTS } from "./local-documents";
import { subscribe, publish } from "../_helpers/redis";
import { listenForXStream, getDocument } from "./utils";

import type { Socket } from "socket.io";
import type { Express } from "express";

const saveToDatabaseIfNew = async () => {
  const documentIds = Object.keys(THE_DOCUMENTS);
  const saveDocumentsPromise = documentIds.map(async (documentId) => {
    const last_updated_at = await redis.hget(
      `document:${documentId}`,
      "last_updated_at"
    );
    const document = THE_DOCUMENTS[documentId];
    const documentDate = new Date(document.last_updated_at);
    if (new Date(last_updated_at!) < documentDate) {
      await redis.hmset(
        `document:${documentId}`,
        ["boxes", JSON.stringify(document.boxes)],
        ["last_updated_at", documentDate.toISOString()],
        ["redis_stream_id", document.redis_stream_id]
      );
    }
  });
  await Promise.all(saveDocumentsPromise);
  await new Promise((resolve) =>
    // run this every 5 sec
    setTimeout(() => resolve(saveToDatabaseIfNew()), 5 * 1000)
  );
};

const handle = (app: Express, io: Socket) => {
  saveToDatabaseIfNew().catch((err) => {
    console.error("Not able to save to database", err);
  });

  app.get("/get-document/:id", async (req, res) => {
    const document = await getDocument(req.params.id);
    return res.json(document).end();
  });

  subscribe("user_disconnected", (message) => {
    const { documentId, userId } = JSON.parse(message);
    io.to(documentId).emit("user_disconnected", userId);
  });

  subscribe("update_user_location", (message) => {
    const { userId, location, documentId } = JSON.parse(message);
    io.to(documentId).emit("update_user_location", { userId, location });
  });

  const activeUsers = new Set();
  io.use(async (socket: any, next: any) => {
    const { userId, documentId } = socket.handshake.query;
    if (!userId || !documentId) {
      return next(new Error("Insufficient Data"));
    }
    // make sure it's loaded locally if /get-document call is served from
    // a different server
    await getDocument(documentId);
    socket.data = {
      userId,
      documentId,
    };
    activeUsers.add(userId);
    return next();
  });

  io.on("connection", (socket: any) => {
    console.log("Made socket connection");

    socket.on("subscribe_to_document", (last_redis_stream_id: string) => {
      console.log("subscribe_to_document");
      const { data } = socket;
      listenForXStream({
        documentId: data.documentId,
        socket,
        redis_stream_id: last_redis_stream_id || "0",
      });
      socket.join(data.documentId);
    });

    socket.on("disconnect", () => {
      const { data } = socket;
      activeUsers.delete(data?.userId);
      if (activeUsers.size === 0) {
        // delete the document and free up the memory
        // THE_DOCUMENT = null;
      } else {
        publish(
          "user_disconnected",
          JSON.stringify({
            documentId: data.documentId,
            userId: data.userId,
          })
        );
      }
    });

    socket.on(
      "update_user_location",
      (data: { location: [string, string] }) => {
        publish(
          "update_user_location",
          JSON.stringify({
            documentId: socket.data.documentId,
            userId: socket.data.userId,
            location: data.location,
          })
        );
      }
    );

    socket.on("add_box", (data: { boxId: string; documentId: string }) => {
      const { documentId, userId } = socket.data;
      addToDocumentStream(documentId, {
        key: "add_box",
        value: JSON.stringify({ ...data, sender: userId }),
      });
    });

    socket.on(
      "update_box",
      (data: { boxId: string; location: [string, string] }) => {
        const { userId, documentId } = socket.data;
        addToDocumentStream(documentId, {
          key: "update_box",
          value: JSON.stringify({ ...data, sender: userId }),
        });
      }
    );
  });
};

export default handle;
