import { THE_DOCUMENTS } from "./local-documents";
import redis from "../_helpers/redis";

export const onAddBox = (
  socket: any,
  data: {
    boxId: string;
    documentId: string;
    redis_stream_id: string;
    sender: string;
  }
) => {
  const date = new Date();
  const { boxId, documentId, redis_stream_id, sender } = data;
  const newBox = {
    id: boxId,
    updated_by: sender,
    updated_at: date,
    redis_stream_id,
    x: 0,
    y: 0,
  };
  THE_DOCUMENTS[documentId].last_updated_at = date;
  THE_DOCUMENTS[documentId].redis_stream_id = redis_stream_id;
  THE_DOCUMENTS[documentId].boxes[boxId] = newBox;
  if (socket.connected) {
    socket.emit("add_box", newBox);
  }
};

export const onUpdateBox = (
  socket: any,
  data: {
    boxId: string;
    location: [string, string];
    redis_stream_id: string;
    sender: string;
  }
) => {
  const date = new Date();
  const { documentId } = socket.data;
  const { redis_stream_id, sender } = data;
  const { boxId, location } = data;
  const document = THE_DOCUMENTS[documentId];
  const localBox = document.boxes?.[boxId];
  if (
    localBox &&
    (localBox.updated_by === sender ||
      date.getTime() - new Date(localBox.updated_at).getTime() > 2000)
  ) {
    localBox.updated_by = sender;
    localBox.updated_at = date;
    localBox.redis_stream_id = redis_stream_id;
    localBox.x = location[0];
    localBox.y = location[1];
    document.last_updated_at = date;
    document.redis_stream_id = redis_stream_id;
    if (socket.connected) {
      socket.emit("update_box", localBox);
    }
  }
};

export const listenForXStream = async ({
  documentId,
  socket,
  redis_stream_id,
}: {
  documentId: string;
  socket: any;
  redis_stream_id: string;
}) => {
  let redisId = redis_stream_id;
  while (socket.connected) {
    // @ts-ignore
    const rawRes: any = await redis.xread(
      ["BLOCK", 200],
      "STREAMS",
      [`document:stream:${documentId}`],
      redisId
    );
    if (rawRes !== null) {
      const events: any[] = [];
      rawRes[0][1].forEach(([id, [key, value]]: [string, [string, string]]) => {
        const data = JSON.parse(value);
        const currentValue = {
          event_type: key,
          data,
          redis_stream_id: id,
        };
        events.push(currentValue);
      });
      events.forEach((event) => {
        redisId = event.redis_stream_id;
        switch (event.event_type) {
          case "add_box": {
            THE_DOCUMENTS[documentId].redis_stream_id = redis_stream_id;
            onAddBox(socket, {
              ...event.data,
              redis_stream_id: event.redis_stream_id,
            });
            break;
          }
          case "update_box": {
            onUpdateBox(socket, {
              ...event.data,
              redis_stream_id: event.redis_stream_id,
            });
            break;
          }
        }
      });
    }
  }
};

const defaultDocument = {
  boxes: {
    box1: {
      id: "box1",
      x: 0,
      y: 0,
      updated_by: "1",
      updated_at: new Date(),
      redis_stream_id: 0,
    },
  },
  last_updated_at: new Date(),
  redis_stream_id: 0,
};

export const getDocument = async (documentId: string) => {
  if (!THE_DOCUMENTS[documentId]) {
    const [boxes, last_updated_at, redis_stream_id] = await redis.hmget(
      `document:${documentId}`,
      "boxes",
      "last_updated_at",
      "redis_stream_id"
    );
    if (boxes) {
      THE_DOCUMENTS[documentId] = {
        id: documentId,
        boxes: JSON.parse(boxes),
        last_updated_at,
        redis_stream_id,
      };
    } else {
      THE_DOCUMENTS[documentId] = {
        id: documentId,
        ...defaultDocument,
      };
    }
  }
  return THE_DOCUMENTS[documentId];
};
