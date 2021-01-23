import React from "react";
import cursor from "./cursor.svg";
import "./User.css";

class User extends React.Component {
  constructor(props) {
    super(props);
    this.elRef = React.createRef();
  }

  setPosition = (x, y) => {
    this.elRef.current.style.transform =
      "translate3d(" + x + "px, " + y + "px, 0)";
  };

  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { x, y, id } = this.props;
    return (
      <div
        className="user-indicator"
        style={{
          display: "flex",
          top: 0,
          left: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
        }}
        ref={this.elRef}
      >
        <img
          src={cursor}
          style={{ width: 20, height: 20 }}
          alt="user_location"
        />
        <div
          style={{
            color: "black",
            fontSize: 12,
          }}
        >
          {id}
        </div>
      </div>
    );
  }
}

export default User;
