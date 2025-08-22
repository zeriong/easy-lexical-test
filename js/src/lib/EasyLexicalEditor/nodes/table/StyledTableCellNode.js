import { TableCellNode } from "@lexical/table";

/** <td>/<th> */
export class StyledTableCellNode extends TableCellNode {
  __style;
  __rev; // 히스토리용 리비전 토큰
  __isHeader; // ← 우리가 직접 들고 있는 헤더 플래그

  static getType() {
    return "tableCell";
  }

  static clone(node) {
    const n = new StyledTableCellNode(
      node.__isHeader, // ← 우리가 가진 플래그 사용
      1,
      1,
      node.__style,
      node.__key,
    );
    n.__rev = node.__rev;
    return n;
  }

  constructor(isHeader /* boolean */, _colSpan, _rowSpan, style = "", key) {
    // 병합 제거 정책: 항상 1,1 강제
    super(!!isHeader, 1, 1, key);
    this.__isHeader = !!isHeader;
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
    el.setAttribute("data-lexical-node-key", this.__key);
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
    const n = new StyledTableCellNode(isHeader, 1, 1, json.style || "");
    n.__rev = json.__rev || 0;
    return n;
  }

  exportJSON() {
    const base = super.exportJSON();
    return {
      ...base,
      type: "tableCell",
      style: this.__style,
      isHeader: !!this.__isHeader, // ← 우리가 들고 있는 값
      __rev: this.__rev,
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
    const tag = this.__isHeader ? "th" : "td";
    const el = document.createElement(tag);
    if (this.__style) el.setAttribute("style", this.__style);
    return { element: el };
  }
}
