const DOCUMENT = {
  boxes: {},
  users: {},
};

export const getDocument = () => DOCUMENT;

export const getUsers = () => DOCUMENT.users;

export const getUser = (userId) => DOCUMENT.users[userId];

export const getBox = (boxId) => DOCUMENT.boxes[boxId];
