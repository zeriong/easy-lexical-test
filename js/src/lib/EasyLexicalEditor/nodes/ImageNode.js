// nodes/ImageNode.js
import { ElementNode, $applyNodeReplacement } from "lexical";

export class ImageNode extends ElementNode {
  static getType() {
    return "image";
  }

  static clone(node) {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  constructor(src, alt = "", key) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  createDOM() {
    const dom = document.createElement("img");
    dom.src = this.__src;
    dom.alt = this.__alt;
    dom.style.maxWidth = "100%";
    dom.style.display = "block";
    return dom;
  }

  updateDOM() {
    // src/alt를 바꿀 계획이 없다면 false
    return false;
  }

  static importJSON(serializedNode) {
    return new ImageNode(serializedNode.src, serializedNode.alt || "");
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: "image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
    };
  }
}

export function $createImageNode(src, alt) {
  return $applyNodeReplacement(new ImageNode(src, alt || ""));
}
