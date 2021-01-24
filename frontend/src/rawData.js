const DOCUMENT = {
  boxes: {},
  users: {},
  redis_stream_id: 0
};

export const getDocument = () => DOCUMENT;

export const getUsers = () => DOCUMENT.users;

export const getUser = (userId) => DOCUMENT.users[userId];

export const getBox = (boxId) => DOCUMENT.boxes[boxId];
