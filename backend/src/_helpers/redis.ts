import { createNodeRedisClient } from "handy-redis";

const getRedisClient = () =>
  createNodeRedisClient({
    // @ts-ignore
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  });

const client = getRedisClient();
client.nodeRedis.on("error", (error) => {
  console.error("REDIS ERROR", error);
});

const subscribeClient = getRedisClient().nodeRedis;
const subscribers: any = {};
subscribeClient.on("message", (channel, message) => {
  if (subscribers[channel]) {
    subscribers[channel](message);
  }
});
export const subscribe = (
  channelName: string,
  cb: (message: string) => any
) => {
  subscribers[channelName] = cb;
  subscribeClient.subscribe(channelName);
};

const publishClient = getRedisClient().nodeRedis;
export const publish = (channelName: string, message: string) => {
  publishClient.publish(channelName, message);
};

export const addToDocumentStream = (
  documentId: string,
  { key, value }: { key: string; value: string }
) =>
  client.xadd(`document:stream:${documentId}`, ["MAXLEN", ["~", 1000]], "*", [
    key,
    value,
  ]);

export default client;
