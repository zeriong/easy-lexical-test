import { TableRowNode } from "@lexical/table";
import { StyledTableCellNode } from "./StyledTableCellNode.js";

/** <tr> */
export class StyledTableRowNode extends TableRowNode {
  __style;
  __rev;

  static getType() {
    return "tableRow";
  }

  static clone(node) {
    const n = new StyledTableRowNode(node.__height, node.__style, node.__key);
    n.__rev = node.__rev;
    return n;
  }

  constructor(height, style = "", key) {
    super(height, key);
    this.__style = style || "";
    this.__rev = 0;
  }

  getStyle() {
    return this.getLatest().__style || "";
  }

  setStyle(style) {
    const w = this.getWritable();
    w.__style = style || "";
  }

  // 히스토리 체크포인트용 매서드
  bumpRevision() {
    const w = this.getWritable();
    w.__rev = (w.__rev | 0) + 1;
  }

  createDOM(config) {
    const el = super.createDOM(config);
    if (this.__style) el.setAttribute("style", this.__style);
    el.setAttribute("data-lexical-node-key", this.__key);
    return el;
  }

  updateDOM(prev, dom) {
    const newStyle = dom.getAttribute("style");

    if (prev.__style !== newStyle) {
      const w = this.getWritable();
      w.__style = newStyle;
    }

    return false;
  }

  static importJSON(json) {
    const n = new StyledTableRowNode(json.height, json.style || "");
    n.__rev = json.__rev || 0;
    return n;
  }

  exportJSON() {
    const base = super.exportJSON();
    return { ...base, type: "tableRow", style: this.__style, __rev: this.__rev };
  }

  static importDOM() {
    return {
      tr: (el) => ({
        conversion: () => {
          const st = el.getAttribute("style") || "";
          return { node: new StyledTableRowNode(undefined, st) };
        },
        priority: 2,
      }),
    };
  }

  exportDOM() {
    const el = document.createElement("tr");
    if (this.__style) el.setAttribute("style", this.__style);
    return { element: el };
  }
}
