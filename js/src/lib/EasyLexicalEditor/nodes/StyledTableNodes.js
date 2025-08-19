import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";

/** <table> — class 제거, style만 보존 */
export class StyledTableNode extends TableNode {
  __style;

  static getType() {
    return "table";
  } // 기본 타입 유지(호환성)
  static clone(node) {
    return new StyledTableNode(node.__style, node.__key);
  }

  constructor(style = "", key) {
    super(key);
    this.__style = style;
  }

  // 에디터 내부 렌더링
  createDOM(config) {
    const el = super.createDOM(config); // theme 클래스는 super가 붙임
    if (this.__style) el.setAttribute("style", this.__style);
    return el;
  }
  updateDOM(prev, dom) {
    if (prev.__style !== this.__style) {
      if (this.__style) dom.setAttribute("style", this.__style);
      else dom.removeAttribute("style");
    }
    return false;
  }

  // JSON
  static importJSON(json) {
    return new StyledTableNode(json.style || "");
  }
  exportJSON() {
    const base = super.exportJSON();
    return { ...base, type: "table", style: this.__style };
  }

  // HTML import/export (fallback)
  static importDOM() {
    return {
      table: (el) => ({
        conversion: () => {
          const st = el.getAttribute("style") || "";
          return { node: new StyledTableNode(st) };
        },
        priority: 1,
      }),
    };
  }
  exportDOM() {
    const el = document.createElement("table");
    if (this.__style) el.setAttribute("style", this.__style);
    return { element: el };
  }
}

/** <tr> — class 제거, style만 보존 */
export class StyledTableRowNode extends TableRowNode {
  __style;

  static getType() {
    return "tableRow";
  }
  static clone(node) {
    return new StyledTableRowNode(node.__height, node.__style, node.__key);
  }

  constructor(height, style = "", key) {
    super(height, key);
    this.__style = style;
  }

  createDOM(config) {
    const el = super.createDOM(config);
    if (this.__style) el.setAttribute("style", this.__style);
    return el;
  }
  updateDOM(prev, dom) {
    if (prev.__style !== this.__style) {
      if (this.__style) dom.setAttribute("style", this.__style);
      else dom.removeAttribute("style");
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
        priority: 1,
      }),
    };
  }
  exportDOM() {
    const el = document.createElement("tr");
    if (this.__style) el.setAttribute("style", this.__style);
    return { element: el };
  }
}

/** <td>/<th> — class 제거, style만 보존 */
export class StyledTableCellNode extends TableCellNode {
  __style;

  static getType() {
    return "tableCell";
  }
  static clone(node) {
    return new StyledTableCellNode(
      node.__header,
      node.__colSpan,
      node.__rowSpan,
      node.__style,
      node.__key,
    );
  }

  constructor(header, colSpan, rowSpan, style = "", key) {
    super(header, colSpan, rowSpan, key);
    this.__style = style;
  }

  createDOM(config) {
    const el = super.createDOM(config); // <td> or <th>
    if (this.__style) el.setAttribute("style", this.__style);
    // colspan/rowspan 재보강
    if (this.__colSpan && this.__colSpan !== 1) el.setAttribute("colspan", String(this.__colSpan));
    if (this.__rowSpan && this.__rowSpan !== 1) el.setAttribute("rowspan", String(this.__rowSpan));
    return el;
  }
  updateDOM(prev, dom) {
    if (prev.__style !== this.__style) {
      if (this.__style) dom.setAttribute("style", this.__style);
      else dom.removeAttribute("style");
    }
    if (prev.__colSpan !== this.__colSpan) {
      if (this.__colSpan && this.__colSpan !== 1)
        dom.setAttribute("colspan", String(this.__colSpan));
      else dom.removeAttribute("colspan");
    }
    if (prev.__rowSpan !== this.__rowSpan) {
      if (this.__rowSpan && this.__rowSpan !== 1)
        dom.setAttribute("rowspan", String(this.__rowSpan));
      else dom.removeAttribute("rowspan");
    }
    return false;
  }

  static importJSON(json) {
    return new StyledTableCellNode(json.header, json.colSpan, json.rowSpan, json.style || "");
  }
  exportJSON() {
    const base = super.exportJSON();
    return { ...base, type: "tableCell", style: this.__style };
  }

  static importDOM() {
    const conv = (el, header) => {
      const st = el.getAttribute("style") || "";
      const cs = parseInt(el.getAttribute("colspan") || "1", 10);
      const rs = parseInt(el.getAttribute("rowspan") || "1", 10);
      return { node: new StyledTableCellNode(header, cs, rs, st) };
    };
    return {
      td: (el) => ({ conversion: () => conv(el, false), priority: 1 }),
      th: (el) => ({ conversion: () => conv(el, true), priority: 1 }),
    };
  }
  exportDOM() {
    const el = document.createElement(this.__header ? "th" : "td");
    if (this.__style) el.setAttribute("style", this.__style);
    if (this.__colSpan && this.__colSpan !== 1) el.setAttribute("colspan", String(this.__colSpan));
    if (this.__rowSpan && this.__rowSpan !== 1) el.setAttribute("rowspan", String(this.__rowSpan));
    return { element: el };
  }
}
