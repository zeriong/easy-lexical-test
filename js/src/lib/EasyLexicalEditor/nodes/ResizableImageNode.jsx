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

  // * <img> 를 포함하여 모두 반환 가능하도록 구성
  exportDOM() {
    const img = document.createElement("img");
    img.setAttribute("data-lexical-type", "resizable-image");
    img.src = this.__src;
    if (this.__alt) img.alt = this.__alt;

    // 사이즈를 attribute나 style로 보존
    if (Number.isFinite(this.__width)) img.setAttribute("width", String(Math.round(this.__width)));
    if (Number.isFinite(this.__height))
      img.setAttribute("height", String(Math.round(this.__height)));

    // 역변환(importDOM) 용 힌트
    if (Number.isFinite(this.__width))
      img.setAttribute("data-width", String(Math.round(this.__width)));
    if (Number.isFinite(this.__height))
      img.setAttribute("data-height", String(Math.round(this.__height)));

    return { element: img };
  }

  // * HTML Import method
  static importDOM() {
    return {
      img: (node) => {
        const mark = node.getAttribute && node.getAttribute("data-lexical-type");
        if (mark === "resizable-image") {
          return {
            priority: 2,
            conversion: () => {
              const src = node.getAttribute("src") || "";
              const alt = node.getAttribute("alt") || "";
              const wAttr = node.getAttribute("data-width") || node.getAttribute("width");
              const hAttr = node.getAttribute("data-height") || node.getAttribute("height");
              const width = wAttr ? parseInt(wAttr, 10) : undefined;
              const height = hAttr ? parseInt(hAttr, 10) : undefined;
              return { node: new ResizableImageNode({ src, alt, width, height }) };
            },
          };
        }
        return null;
      },
    };
  }
}

export function $createResizableImageNode(payload) {
  return new ResizableImageNode(payload);
}
