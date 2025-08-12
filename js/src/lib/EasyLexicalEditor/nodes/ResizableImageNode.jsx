import React from "react";
import { DecoratorNode } from "lexical";
import BridgeResizable from "../components/resizableImage/BridgeResizable.jsx";

export class ResizableImageNode extends DecoratorNode {
  static getType() {
    return "resizable-image";
  }
  static clone(node) {
    return new ResizableImageNode(
      { src: node.__src, alt: node.__alt, width: node.__width, height: node.__height },
      node.__key,
    );
  }

  constructor(payload, key) {
    super(key);
    this.__src = payload.src;
    this.__alt = payload.alt || "";
    this.__width = payload.width;
    this.__height = payload.height;
  }

  isInline() {
    return false;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: "resizable-image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
      width: this.__width,
      height: this.__height,
    };
  }
  static importJSON(json) {
    return new ResizableImageNode({
      src: json.src,
      alt: json.alt,
      width: json.width,
      height: json.height,
    });
  }

  setSize(w, h) {
    const writable = this.getWritable();
    writable.__width = w;
    writable.__height = h;
  }
  setSrc(src) {
    const writable = this.getWritable();
    writable.__src = src;
  }

  createDOM() {
    const el = document.createElement("div");
    el.style.display = "block";
    el.style.width = "100%";
    el.style.position = "relative";
    return el;
  }
  updateDOM() {
    return false;
  }

  decorate(editor) {
    return (
      <BridgeResizable
        editor={editor}
        nodeKey={this.getKey()}
        props={{
          src: this.__src,
          alt: this.__alt,
          initialWidth: this.__width,
          initialHeight: this.__height,
          // 필요 시 기타 옵션 전달
        }}
      />
    );
  }
}

export function $createResizableImageNode(payload) {
  return new ResizableImageNode(payload);
}
