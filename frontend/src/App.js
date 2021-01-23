import React from "react";
import axios from "axios";
import faker from "faker";
import throttle from "lodash/throttle";
import { nanoid } from "nanoid";
import { io } from "socket.io-client";

import DraggableItem from "./DraggableItem";
import User from "./User";
import { getDocument, getBox, getUser } from "./rawData";
import "./App.css";

const getClient = (e) => {
  if (e.type === "touchmove") {
    return [e.touches[0].clientX, e.touches[0].clientY];
  }
  return [e.clientX, e.clientY];
};

const THE_DOCUMENT = getDocument();
const DOCUMENT_ID = 1;
const LOCAL_USER_ID = faker.name.firstName("male").toLowerCase() + nanoid(2);

class App extends React.Component {
  activeBox;
  socket;
  throttleEmit;

  constructor(props) {
    super(props);
    this.state = {
      boxes: {},
      users: {},
      loading: true,
    };
  }

  createThrottledFunctions = () => {
    this.throttleEmit = {
      update_box: throttle(
        (data) => this.socket.emit("update_box", data),
        100,
        { leading: true, trailing: true }
      ),
      update_user_location: throttle(
        (data) =>
          this.socket.emit("update_user_location", data, { trailing: true }),
        100
      ),
    };
  };

  async componentDidMount() {
    window.addEventListener("mousemove", this.onDrag);
    window.addEventListener("touchmove", this.onDrag);
    window.addEventListener("mouseup", this.onDragEnd);
    window.addEventListener("touchend", this.onDragEnd);
    this.socket = io("http://localhost:5000", {
      transports: ["websocket"],
      query: {
        userId: LOCAL_USER_ID,
        documentId: DOCUMENT_ID,
      },
    });
    await axios
      .get(`http://localhost:5000/get-document/${DOCUMENT_ID}`)
      .then((res) => {
        const document = res.data;
        Object.assign(THE_DOCUMENT, document);
        const boxIds = Object.keys(THE_DOCUMENT.boxes);
        boxIds.forEach(
          (boxId) => (THE_DOCUMENT.boxes[boxId].ref = React.createRef())
        );
        this.setState(() => ({
          loading: false,
          boxes: {
            ...THE_DOCUMENT.boxes,
          },
        }));
      });
    this.socket.on("connect", () => {
      this.createThrottledFunctions();
      this.handleSocket();
    });
  }

  componentWillUnmount() {
    window.removeEventListener("mousemove", this.onDrag);
    window.removeEventListener("touchmove", this.onDrag);
    window.removeEventListener("mouseup", this.onDragEnd);
    window.removeEventListener("touchend", this.onDragEnd);
  }

  handleSocket = () => {
    console.log("handle socket fired");
    this.socket.emit("subscribe_to_document");
    this.socket.on("update_box", (data) => {
      const { boxes } = this.state;
      const { id, updated_by, x, y } = data;
      const box = getBox(id);
      if (LOCAL_USER_ID !== updated_by) {
        boxes[id].ref.current.setPosition(x, y);
      }
      Object.assign(box, data);
    });
    this.socket.on("add_box", (box) => {
      if (box.updated_by !== LOCAL_USER_ID) {
        this.addBox(box);
      }
    });
    this.socket.on("user_connected", (data) => {
      THE_DOCUMENT.users = data.reduce((users, userId) => {
        if (userId !== LOCAL_USER_ID) {
          users[userId] = {
            x: 0,
            y: 0,
            id: userId,
            ref: THE_DOCUMENT.users[userId]?.ref || React.createRef(),
          };
        }
        return users;
      }, {});

      this.setState(() => ({
        users: { ...THE_DOCUMENT.users },
      }));
    });
    this.socket.on("user_disconnected", (userId) => {
      if (userId !== LOCAL_USER_ID) {
        delete THE_DOCUMENT.users[userId];
      }
      this.setState(() => ({
        users: { ...THE_DOCUMENT.users },
      }));
    });
    this.socket.on("update_user_location", (data) => {
      const { userId, location } = data;
      if (userId !== LOCAL_USER_ID) {
        const user = THE_DOCUMENT.users[userId];
        if (user) {
          user.x = location[0];
          user.y = location[1];
          user.ref.current.setPosition(location[0], location[1]);
        }
      }
    });
  };

  addBox = (newBox) => {
    const boxId = nanoid(10);
    const box = Object.assign(
      {
        id: boxId,
        ref: React.createRef(),
        x: 0,
        y: 0,
        updated_by: LOCAL_USER_ID,
        updated_at: new Date().toISOString(),
      },
      newBox
    );
    THE_DOCUMENT.boxes[box.id] = box;
    this.setState(({ boxes }) => ({
      boxes: {
        ...boxes,
        [box.id]: box,
      },
    }));
    if (box.updated_by === LOCAL_USER_ID) {
      this.socket.emit("add_box", {
        boxId: box.id,
        documentId: DOCUMENT_ID,
      });
    }
  };

  onDrag = (e) => {
    const [clientX, clientY] = getClient(e);
    if (this.throttleEmit) {
      this.throttleEmit["update_user_location"]({
        location: [clientX, clientY],
      });
    }
    if (this.activeBox?.ref && this.throttleEmit) {
      const boxId = this.activeBox.id;
      const documentBox = getBox(boxId);
      const last_updated_by = documentBox.updated_by;
      const last_updated_at = documentBox.updated_at;
      if (
        last_updated_by === LOCAL_USER_ID ||
        new Date().getTime() - new Date(last_updated_at).getTime() > 500
      ) {
        const [boxX, boxY] = this.activeBox.ref.current.onDrag(
          clientX,
          clientY
        );
        this.throttleEmit["update_box"]({
          boxId: this.activeBox.id,
          location: [boxX, boxY],
        });
      }
    }
  };

  onDragStart = (e, boxId) => {
    this.activeBox = this.state.boxes[boxId];
    const [clientX, clientY] = getClient(e);
    this.activeBox.ref.current.onDragStart(clientX, clientY);
  };

  onDragEnd = (e) => {
    const [clientX, clientY] = getClient(e);
    if (this.activeBox) {
      this.activeBox?.ref.current.onDragEnd(clientX, clientY);
      this.activeBox = null;
    }
  };

  renderAllBoxes = () => {
    const { boxes } = this.state;
    return Object.values(boxes).map((box) => (
      <div
        key={box.id}
        onMouseDown={(e) => this.onDragStart(e, box.id)}
        onTouchStart={(e) => this.onDragStart(e, box.id)}
      >
        <DraggableItem ref={box.ref} x={box.x} y={box.y} />
      </div>
    ));
  };

  renderAllUsers = () => {
    const { users } = this.state;
    return Object.values(users).map((user) => (
      <User key={user.id} id={user.id} ref={user.ref} x={user.x} y={user.y} />
    ));
  };

  render() {
    if (this.state.loading) {
      return null;
    }
    return (
      <div className="App">
        <header className="App-header">
          <button onClick={() => this.addBox()}>Add Box</button>
          {this.renderAllBoxes()}
          {this.renderAllUsers()}
        </header>
      </div>
    );
  }
}

export default App;
