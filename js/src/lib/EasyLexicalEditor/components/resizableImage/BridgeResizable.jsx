import ResizableImage from "./ResizableImage.jsx";
import React from "react";
import { UPDATE_IMAGE_SIZE_COMMAND } from "../../contants/common.js";

export default function BridgeResizable({ editor, nodeKey, props }) {
  return (
    <ResizableImage
      {...props}
      onResizeEnd={(s) => {
        editor.dispatchCommand(UPDATE_IMAGE_SIZE_COMMAND, {
          key: String(nodeKey),
          width: s.width,
          height: s.height,
        });
      }}
    />
  );
}
