// nodes/StyledTableNodes.js
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";

/** <table> */
export class StyledTableNode extends TableNode {
  static getType() {
    return "table";
  }
  static clone(node) {
    const n = new StyledTableNode(node.__style, node.__key);
    return n;
  }

  constructor(style = "", key) {
    super(key);
    this.__style = style;
  }

  getStyle() {
    return this.getLatest().__style || "";
  }
  setStyle(style) {
    const w = this.getWritable();
    w.__style = style;
  }

  createDOM(config) {
    const el = super.createDOM(config);
    el.setAttribute("data-lexical-node-key", "stamp_" + Date.now());
    if (this.__style) el.setAttribute("style", this.__style);
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
    return new StyledTableNode(json.style || "");
  }
  exportJSON() {
    const base = super.exportJSON();
    return { ...base, type: "table", style: this.__style };
  }

  static importDOM() {
    return {
      table: (el) => ({
        conversion: () => {
          const st = el.getAttribute("style") || "";
          return { node: new StyledTableNode(st) };
        },
        priority: 2,
      }),
    };
  }

  exportDOM() {
    const el = document.createElement("table");
    if (this.__style) el.setAttribute("style", this.__style);
    return { element: el };
  }
}

/** <tr> */
export class StyledTableRowNode extends TableRowNode {
  __style;

  static getType() {
    return "tableRow";
  }
  static clone(node) {
    const n = new StyledTableRowNode(node.__height, node.__style, node.__key);
    return n;
  }

  constructor(height, style = "", key) {
    super(height, key);
    this.__style = style || "";
  }

  getStyle() {
    return this.getLatest().__style || "";
  }
  setStyle(style) {
    const w = this.getWritable();
    w.__style = style || "";
  }

  createDOM(config) {
    const el = super.createDOM(config);
    if (this.__style) el.setAttribute("style", this.__style);
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
    return new StyledTableRowNode(json.height, json.style || "");
  }
  exportJSON() {
    const base = super.exportJSON();
    return { ...base, type: "tableRow", style: this.__style };
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

/** <td>/<th> */
export class StyledTableCellNode extends TableCellNode {
  __style;
  __isHeader; // ← 우리가 직접 들고 있는 헤더 플래그

  static getType() {
    return "tableCell";
  }

  static clone(node) {
    return new StyledTableCellNode(
      node.__isHeader, // ← 우리가 가진 플래그 사용
      1,
      1,
      node.__style,
      node.__key,
    );
  }

  constructor(isHeader /* boolean */, _colSpan, _rowSpan, style = "", key) {
    // 병합 제거 정책: 항상 1,1 강제
    super(!!isHeader, 1, 1, key);
    this.__isHeader = !!isHeader;
    this.__style = style || "";
  }

  getStyle() {
    return this.getLatest().__style || "";
  }
  setStyle(style) {
    const w = this.getWritable();
    w.__style = style || "";
  }

  // 필요하면 헤더 플래그도 세터/게터 제공 가능
  isHeader() {
    return !!this.getLatest().__isHeader;
  }
  setHeader(isHeader) {
    const w = this.getWritable();
    w.__isHeader = !!isHeader;
  }

  createDOM(config) {
    const el = super.createDOM(config); // TableCellNode가 header면 <th>, 아니면 <td> 생성
    if (this.__style) el.setAttribute("style", this.__style);
    el.removeAttribute("colspan");
    el.removeAttribute("rowspan");
    return el;
  }

  updateDOM(prev, dom) {
    const newStyle = dom.getAttribute("style");

    if (prev.__style !== newStyle) {
      const w = this.getWritable();
      w.__style = newStyle;
    }

    // 병합은 강제로 제거
    dom.removeAttribute("colspan");
    dom.removeAttribute("rowspan");
    return false;
  }

  static importJSON(json) {
    // header 정보를 우리가 직접 읽어서 보관
    const isHeader = !!json.isHeader || !!json.header;
    return new StyledTableCellNode(isHeader, 1, 1, json.style || "");
  }

  exportJSON() {
    const base = super.exportJSON();
    return {
      ...base,
      type: "tableCell",
      style: this.__style,
      isHeader: !!this.__isHeader, // ← 우리가 들고 있는 값
      colSpan: 1,
      rowSpan: 1,
    };
  }

  static importDOM() {
    const conv = (el, isHeader) => {
      const st = el.getAttribute("style") || "";
      return { node: new StyledTableCellNode(!!isHeader, 1, 1, st) };
    };
    return {
      td: (el) => ({ conversion: () => conv(el, false), priority: 2 }),
      th: (el) => ({ conversion: () => conv(el, true), priority: 2 }),
    };
  }

  exportDOM() {
    // ★ getHeader 같은 내부 API에 의존하지 말고, 우리가 저장한 플래그로 결정
    const tag = this.__isHeader ? "th" : "td";
    const el = document.createElement(tag);
    if (this.__style) el.setAttribute("style", this.__style);
    return { element: el };
  }
}
