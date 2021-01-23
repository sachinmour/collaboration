import React from "react";
import "./DraggableItem.css";

class DraggableItem extends React.Component {
  xOffset = 0;
  yOffset = 0;
  currentX;
  currentY;
  initialX;
  initialY;

  constructor(props) {
    super(props);
    this.xOffset = props.x;
    this.yOffset = props.y;
    this.elRef = React.createRef();
  }

  onDragStart = (clientX, clientY) => {
    this.initialX = clientX - this.xOffset;
    this.initialY = clientY - this.yOffset;
  };

  onDragEnd = (currentX, currentY) => {
    this.initialX = currentX;
    this.initialY = currentY;
  };

  onDrag = (clientX, clientY) => {
    this.currentX = clientX - this.initialX;
    this.currentY = clientY - this.initialY;
    this.xOffset = this.currentX;
    this.yOffset = this.currentY;
    this.elRef.current.style.transform =
      "translate3d(" + this.currentX + "px, " + this.currentY + "px, 0)";
    return [this.currentX, this.currentY];
  };

  setPosition = (x, y) => {
    this.xOffset = x;
    this.yOffset = y;
    this.elRef.current.style.transform =
      "translate3d(" + x + "px, " + y + "px, 0)";
  };

  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { x, y } = this.props;
    return (
      <div
        className="draggableArea"
        style={{
          top: 0,
          left: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
        }}
        ref={this.elRef}
      >
        Drag Me
      </div>
    );
  }
}

export default DraggableItem;
