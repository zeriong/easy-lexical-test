import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getSelection, $isRangeSelection } from "lexical";
import {
  StyledTableCellNode,
  StyledTableNode,
  StyledTableRowNode,
} from "../nodes/StyledTableNodes.js";

/** ===== 설정 ===== */
const EDGE = 6;
const MIN_COL = 40;
const MIN_ROW = 24;

const CURSOR_COL = "col-resize";
const CURSOR_ROW = "row-resize";
const CURSOR_NWSE = "nwse-resize";
const CURSOR_NESW = "nesw-resize";

/** style 병합 함수 */
function setStyleProp(styleString, prop, value) {
  const map = new Map();
  (styleString || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const i = pair.indexOf(":");
      if (i < 0) return;
      const k = pair.slice(0, i).trim().toLowerCase();
      const v = pair.slice(i + 1).trim();
      map.set(k, v);
    });
  if (value == null) map.delete(prop.toLowerCase());
  else map.set(prop.toLowerCase(), String(value));
  return Array.from(map.entries())
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

/** 병합 제거: DOM + Node */
function normalizeMergedCells(editor, tableEl) {
  const tds = tableEl.querySelectorAll("td,th");
  const dirty = [];

  tds.forEach((td) => {
    const cs = parseInt(td.getAttribute("colspan") || "1", 10);
    const rs = parseInt(td.getAttribute("rowspan") || "1", 10);
    if (cs > 1 || rs > 1) {
      // 병합 라인을 제거하여 셀 편집이 가능
      td.removeAttribute("colspan");
      td.removeAttribute("rowspan");
      dirty.push(td);
    }
  });
  if (dirty.length === 0) return;

  editor.update(() => {
    dirty.forEach((td) => {
      const key = td.getAttribute("data-lexical-node-key");
      if (!key) return;
      const node = $getNodeByKey(key);
      if (!node || node.getType?.() !== "tableCell") return;
      const w = node.getWritable();
      w.__colSpan = 1;
      w.__rowSpan = 1;
    });
  });
}

/** 수집: 각 열/행의 모든 셀 (병합 제거 전제) */
function getColumnCells(tableEl, colIndex) {
  const out = [];
  const rows = tableEl?.rows || [];
  for (let r = 0; r < rows.length; r++) {
    const cell = rows[r].cells[colIndex];
    if (cell) out.push(cell);
  }
  return out;
}
function getRowCells(tableEl, rowIndex) {
  const out = [];
  const row = tableEl?.rows?.[rowIndex];
  if (!row) return out;
  for (let c = 0; c < row.cells.length; c++) out.push(row.cells[c]);
  return out;
}

/** 에지 히트 */
function hitEdges(e, rect) {
  const nearLeft = Math.abs(e.clientX - rect.left) <= EDGE;
  const nearRight = Math.abs(rect.right - e.clientX) <= EDGE;
  const nearTop = Math.abs(e.clientY - rect.top) <= EDGE;
  const nearBottom = Math.abs(rect.bottom - e.clientY) <= EDGE;
  return { nearLeft, nearRight, nearTop, nearBottom };
}

/** 오버레이 + sticky 툴바 */
function ensureOverlay(root) {
  // 선택 박스
  let overlay = root.querySelector(":scope > .lex-table-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "lex-table-overlay";
    overlay.style.position = "absolute";
    overlay.style.pointerEvents = "none";
    overlay.style.border = "2px solid transparent";
    overlay.style.borderRadius = "2px";
    overlay.style.zIndex = "10";
    root.appendChild(overlay);
  }

  // 툴바
  let toolbar = root.querySelector(":scope > .lex-table-toolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "lex-table-toolbar";
    toolbar.style.pointerEvents = "auto";
    toolbar.style.position = "sticky";
    toolbar.style.display = "flex";
    toolbar.style.top = "15px";
    toolbar.style.left = "100%";
    toolbar.style.zIndex = "11";
    toolbar.style.display = "none";
    toolbar.style.padding = "6px";
    toolbar.style.borderRadius = "8px";
    toolbar.style.background = "white";
    toolbar.style.boxShadow = "0 4px 16px rgba(0,0,0,.12)";
    toolbar.style.border = "1px solid #e5e7eb";
    toolbar.style.gap = "6px";
    toolbar.style.fontSize = "12px";
    toolbar.style.lineHeight = "1";
    toolbar.style.color = "#111827";
    toolbar.style.width = "fit-content";

    const mkBtn = (label) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.fontSize = "12px";
      b.style.padding = "6px 8px";
      b.style.border = "1px solid #e5e7eb";
      b.style.borderRadius = "6px";
      b.style.background = "white";
      b.style.cursor = "pointer";
      b.onmousedown = (ev) => ev.preventDefault(); // 포커스 유지
      return b;
    };

    const labels = [
      "표삭제",
      "이전에 행 삽입",
      "다음에 행 삽입",
      "행 삭제",
      "이전에 열 삽입",
      "다음에 열 삽입",
      "열 삭제",
    ];
    labels.forEach((lab) => toolbar.appendChild(mkBtn(lab)));
    root.prepend(toolbar);
  }

  return { overlay, toolbar };
}

/** 오버레이 위치 */
function positionOverlay(root, overlay, tableEl) {
  if (!tableEl) {
    overlay.style.display = "none";
    // console.log("없다 ㅋㅋ");
    return;
  }
  // console.log("있다 ㅋㅋ");
  // console.log("overlay???", overlay);
  const rootRect = root.getBoundingClientRect();
  const rect = tableEl.getBoundingClientRect();
  overlay.style.display = "block";
  overlay.style.left = `${rect.left - rootRect.left + root.scrollLeft}px`;
  overlay.style.top = `${rect.top - rootRect.top + root.scrollTop}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.borderColor = "dodgerblue";
}

/** 축별 자식들 auto 강제 (셀 단위) */
function forceChildrenAxisAuto(el, axis /* 'x' | 'y' */) {
  const prop = axis === "x" ? "width" : "height";
  const minProp = axis === "x" ? "minWidth" : "minHeight";
  const maxProp = axis === "x" ? "maxWidth" : "maxHeight";

  // 직계 자식만 처리 (불필요한 전체 탐색 방지)
  const children = el?.children || [];
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (!c || !c.style) continue;
    // inline-style 상에서 auto가 아니면 auto로
    if (c.style[prop] && c.style[prop] !== "auto") c.style[prop] = "auto";
    // min/max가 있으면 풀어줘야 자식이 따라 늘어남
    if (c.style[minProp]) c.style[minProp] = "";
    if (c.style[maxProp]) c.style[maxProp] = "";
  }
}

/** 축별 테이블 후손들 auto 강제 (테이블 전체 리사이즈용) */
function forceAxisAutoForTableDescendants(tableEl, axis /* 'x' | 'y' */) {
  if (axis === "x") return;
  const prop = "height";
  const minProp = "minHeight";

  if (!tableEl) return;

  // tr/td/th 에 걸린 고정값 해제
  tableEl.querySelectorAll("tr,td,th").forEach((node) => {
    const s = node.style;
    if (!s) return;
    s[prop] = "auto";
    s[minProp] = "fit-content";
  });
}

export default function ResizableTablePlugin() {
  const [editor] = useLexicalComposerContext();

  // dragRef
  const drag = useRef({
    active: false,
    pointerId: null,
    table: null,
    startX: 0,
    startY: 0,
    useLeft: false,
    useRight: false,
    useTop: false,
    useBottom: false,
    // 테이블 전체 리사이즈
    resizeTableX: false,
    resizeTableY: false,
    tableInitW: 0,
    tableInitH: 0,
    // 컬럼/행
    colIndex: -1,
    rowIndex: -1,
    colTargets: [],
    rowTargets: [],
    initColW: [],
    initRowH: [],
  });

  const selected = useRef({ tableKey: null, rowIndex: -1, colIndex: -1 });

  useEffect(() => {
    let root = editor.getRootElement();
    if (!root) return;

    const { overlay, toolbar } = ensureOverlay(root);

    /** 선택 감시 → overlay + toolbar 토글 */
    const removeUpdate = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection();
        let tableKey = null;
        let rowIndex = -1;
        let colIndex = -1;

        if ($isRangeSelection(sel)) {
          let node = sel.anchor.getNode();
          while (node && node.getType && node.getType() !== "tableCell") {
            node = node.getParent && node.getParent();
          }
          if (node && node.getType?.() === "tableCell") {
            const row = node.getParent();
            const table = row?.getParent();
            if (table && table.getType?.() === "table") {
              tableKey = table.getKey();
              const rows = table.getChildren();
              rowIndex = rows.findIndex((r) => r.getKey() === row.getKey());
              const cells = row.getChildren();
              colIndex = cells.findIndex((c) => c.getKey() === node.getKey());
            }
          }
        }

        selected.current = { tableKey, rowIndex, colIndex };
        toolbar.style.display = tableKey ? "flex" : "none";
        positionOverlay(root, overlay, tableKey ? editor.getElementByKey(tableKey) : null);
      });
    });

    // ? 리사이즈 함수
    const onScrollOrResize = () => {
      const tableEl = selected.current.tableKey
        ? editor.getElementByKey(selected.current.tableKey)
        : null;
      positionOverlay(root, overlay, tableEl);
    };

    root.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    /** 툴바 액션 */
    const [btnDel, btnRowBefore, btnRowAfter, btnRowDel, btnColBefore, btnColAfter, btnColDel] =
      Array.from(toolbar.querySelectorAll("button"));
    const withCtx = (fn) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { tableKey, rowIndex, colIndex } = selected.current;
      if (!tableKey) return;
      editor.update(() => fn({ tableKey, rowIndex, colIndex }));
    };

    // ? 표삭제 버튼 클릭 함수
    btnDel.onclick = withCtx(({ tableKey }) => {
      const table = $getNodeByKey(tableKey);
      if (table?.getType?.() === "table") {
        // 테이블 삭제
        table.remove();
      }
    });

    // ? 이전에 행 추가 클릭 함수
    btnRowBefore.onclick = withCtx(({ tableKey, rowIndex }) => {
      const table = $getNodeByKey(tableKey);
      const rows = table?.getChildren() || [];
      if (!table || rowIndex < 0 || rowIndex >= rows.length) return;
      const refRow = rows[rowIndex];
      const cols = (refRow.getChildren() || []).length;
      const RowKlass = refRow.constructor;
      const newRow = new RowKlass(undefined, refRow.__style || "");
      for (let c = 0; c < cols; c++) {
        const refCell = refRow.getChildren()[c];
        const st = refCell?.__style || "";
        const CellKlass = refCell.constructor;
        const newCell = new CellKlass(false, 1, 1, st);
        newRow.append(newCell);
      }
      refRow.insertBefore(newRow);
    });
    btnRowAfter.onclick = withCtx(({ tableKey, rowIndex }) => {
      const table = $getNodeByKey(tableKey);
      const rows = table?.getChildren() || [];
      if (!table || rowIndex < 0 || rowIndex >= rows.length) return;
      const refRow = rows[rowIndex];
      const cols = (refRow.getChildren() || []).length;
      const RowKlass = refRow.constructor;
      const newRow = new RowKlass(undefined, refRow.__style || "");
      for (let c = 0; c < cols; c++) {
        const refCell = refRow.getChildren()[c];
        const st = refCell?.__style || "";
        const CellKlass = refCell.constructor;
        const newCell = new CellKlass(false, 1, 1, st);
        newRow.append(newCell);
      }
      refRow.insertAfter(newRow);
    });

    btnRowDel.onclick = withCtx(({ tableKey, rowIndex }) => {
      const table = $getNodeByKey(tableKey);
      const rows = table?.getChildren() || [];
      const row = rows[rowIndex];
      if (row) row.remove();
    });

    btnColBefore.onclick = withCtx(({ tableKey, rowIndex, colIndex }) => {
      const table = $getNodeByKey(tableKey);
      const rows = table?.getChildren() || [];
      if (!table || rowIndex < 0 || colIndex < 0) return;
      rows.forEach((row) => {
        const cells = row.getChildren();
        const ref = cells[colIndex];
        if (!ref) return;
        const st = ref.__style || "";
        const CellKlass = ref.constructor;
        const newCell = new CellKlass(false, 1, 1, st);
        ref.insertBefore(newCell);
      });
    });

    btnColAfter.onclick = withCtx(({ tableKey, rowIndex, colIndex }) => {
      const table = $getNodeByKey(tableKey);
      const rows = table?.getChildren() || [];
      if (!table || rowIndex < 0 || colIndex < 0) return;
      rows.forEach((row) => {
        const cells = row.getChildren();
        const ref = cells[colIndex];
        if (!ref) return;
        const st = ref.__style || "";
        const CellKlass = ref.constructor;
        const newCell = new CellKlass(false, 1, 1, st);
        ref.insertAfter(newCell);
      });
    });

    btnColDel.onclick = withCtx(({ tableKey, rowIndex, colIndex }) => {
      const table = $getNodeByKey(tableKey);
      const rows = table?.getChildren() || [];
      if (!table || rowIndex < 0 || colIndex < 0) return;
      rows.forEach((row) => {
        const cells = row.getChildren();
        const ref = cells[colIndex];
        if (ref) ref.remove();
      });
    });

    /** 프리뷰 커서 */
    const onPointerMovePreview = (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const t = e.target;
      if (t.tagName !== "TD" && t.tagName !== "TH") {
        if (!drag.current.active) document.body.style.cursor = "";
        return;
      }
      const rect = t.getBoundingClientRect();
      const { nearLeft, nearRight, nearTop, nearBottom } = hitEdges(e, rect);

      if ((nearLeft && nearTop) || (nearRight && nearBottom)) {
        document.body.style.cursor = CURSOR_NWSE;
      } else if ((nearRight && nearTop) || (nearLeft && nearBottom)) {
        document.body.style.cursor = CURSOR_NESW;
      } else if (nearLeft || nearRight) {
        document.body.style.cursor = CURSOR_COL;
      } else if (nearTop || nearBottom) {
        document.body.style.cursor = CURSOR_ROW;
      } else if (!drag.current.active) {
        document.body.style.cursor = "";
      }
    };

    /** 리사이즈 시작 */
    const onPointerDown = (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.tagName !== "TD" && t.tagName !== "TH") return;

      const rect = t.getBoundingClientRect();
      const { nearLeft, nearRight, nearTop, nearBottom } = hitEdges(e, rect);
      if (!nearLeft && !nearRight && !nearTop && !nearBottom) return;

      const table = t.closest("table");
      if (!table) return;

      // 병합 제거
      normalizeMergedCells(editor, table);

      const tableRect = table.getBoundingClientRect();
      const isLastRow = t.parentElement && t.parentElement.rowIndex === table.rows.length - 1;
      const isLastCol = t.cellIndex === (t.parentElement?.cells.length || 1) - 1;
      const nearTableRight = Math.abs(tableRect.right - e.clientX) <= EDGE;
      const nearTableBottom = Math.abs(tableRect.bottom - e.clientY) <= EDGE;

      drag.current.active = true;
      drag.current.pointerId = e.pointerId;
      drag.current.table = table;
      drag.current.startX = e.clientX;
      drag.current.startY = e.clientY;

      drag.current.useLeft = nearLeft;
      drag.current.useRight = nearRight;
      drag.current.useTop = nearTop;
      drag.current.useBottom = nearBottom;

      // 테이블 전체 리사이즈 플래그
      drag.current.resizeTableX = !!(nearRight && (nearTableRight || isLastCol));
      drag.current.resizeTableY = !!(nearBottom && (nearTableBottom || isLastRow));
      drag.current.tableInitW = tableRect.width;
      drag.current.tableInitH = tableRect.height;

      // 컬럼/행 (테이블 리사이즈가 아닐 때만)
      if (!drag.current.resizeTableX && (nearLeft || nearRight)) {
        drag.current.colIndex = nearLeft ? Math.max(0, t.cellIndex - 1) : t.cellIndex;
        drag.current.colTargets = getColumnCells(table, drag.current.colIndex);
        drag.current.initColW = drag.current.colTargets.map(
          (cell) => cell.getBoundingClientRect().width,
        );
      } else {
        drag.current.colIndex = -1;
        drag.current.colTargets = [];
        drag.current.initColW = [];
      }
      if (!drag.current.resizeTableY && (nearTop || nearBottom)) {
        const rowIndex = nearTop
          ? Math.max(0, (t.parentElement?.rowIndex ?? 0) - 1)
          : (t.parentElement?.rowIndex ?? -1);
        drag.current.rowIndex = rowIndex < 0 ? 0 : rowIndex;
        drag.current.rowTargets = getRowCells(table, drag.current.rowIndex);
        drag.current.initRowH = drag.current.rowTargets.map(
          (cell) => cell.getBoundingClientRect().height,
        );
      } else {
        drag.current.rowIndex = -1;
        drag.current.rowTargets = [];
        drag.current.initRowH = [];
      }

      // 캡처 & 커서
      document.body.style.userSelect = "none";
      try {
        t.setPointerCapture?.(e.pointerId);
      } catch (e) {
        console.log("error: ", e);
      }
      if ((nearLeft && nearTop) || (nearRight && nearBottom)) {
        document.body.style.cursor = CURSOR_NWSE;
      } else if ((nearRight && nearTop) || (nearLeft && nearBottom)) {
        document.body.style.cursor = CURSOR_NESW;
      } else if (nearLeft || nearRight) {
        document.body.style.cursor = CURSOR_COL;
      } else {
        document.body.style.cursor = CURSOR_ROW;
      }

      e.preventDefault();
    };

    /** 드래그 중 */
    /** 드래그 중 */
    const onPointerMove = (e) => {
      if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;

      // --- 테이블 전체 리사이즈 ---
      if (drag.current.resizeTableX) {
        const dx = e.clientX - drag.current.startX;
        const w = Math.max(100, Math.round(drag.current.tableInitW + dx));
        drag.current.table.style.width = `${w}px`;
        drag.current.table.style.minWidth = `${w}px`;

        // 가로 리사이즈 시 후손들의 width 고정값을 즉시 auto로
        forceAxisAutoForTableDescendants(drag.current.table, "x");
      }
      if (drag.current.resizeTableY) {
        const dy = e.clientY - drag.current.startY;
        const h = Math.max(40, Math.round(drag.current.tableInitH + dy));
        drag.current.table.style.height = `${h}px`;
        drag.current.table.style.minHeight = `${h}px`;

        // 세로 리사이즈 시 후손들의 height 고정값을 즉시 auto로
        forceAxisAutoForTableDescendants(drag.current.table, "y");
      }

      // --- 컬럼(가로) 리사이즈 ---
      if (!drag.current.resizeTableX && (drag.current.useLeft || drag.current.useRight)) {
        const dx = e.clientX - drag.current.startX;
        drag.current.colTargets.forEach((cell, i) => {
          const w = Math.max(MIN_COL, Math.round(drag.current.initColW[i] + dx));
          cell.style.width = `${w}px`;
          cell.style.minWidth = `${w}px`;

          // 해당 셀의 직계 자식들 width 고정값 풀기
          forceChildrenAxisAuto(cell, "x");
        });
      }

      // --- 행(세로) 리사이즈 ---
      if (!drag.current.resizeTableY && (drag.current.useTop || drag.current.useBottom)) {
        const dy = e.clientY - drag.current.startY;
        drag.current.rowTargets.forEach((cell, i) => {
          const h = Math.max(MIN_ROW, Math.round(drag.current.initRowH[i] + dy));
          cell.style.height = `${h}px`;
          cell.style.minHeight = `${h}px`;
          const tr = cell.parentElement;
          if (tr) {
            tr.style.height = `${h}px`;
            tr.style.minHeight = `${h}px`;
          }

          // 해당 셀의 직계 자식들 height 고정값 풀기
          forceChildrenAxisAuto(cell, "y");
        });
      }

      // 오버레이 추적
      const { tableKey } = selected.current;
      if (tableKey) {
        const tableEl = editor.getElementByKey(tableKey);
        if (tableEl === drag.current.table) {
          positionOverlay(root, overlay, drag.current.table);
        }
      }
    };

    /** 커밋 */
    const commitAndReset = () => {
      if (!drag.current.active) return;

      editor.update(() => {
        // 1) 테이블 width/height 커밋 (export 보장)
        const tableKey = drag.current.table.getAttribute("data-lexical-node-key");
        if (tableKey) {
          const tableNode = $getNodeByKey(tableKey);
          console.log("테이블노드 ㅋㅋ", tableNode);
          const rect = drag.current.table.getBoundingClientRect();
          let next = tableNode?.getStyle() || "";

          console.log("rect??????", rect);

          if (drag.current.resizeTableX) {
            const pxW = Math.max(100, Math.round(rect.width));
            next = setStyleProp(next, "width", `${pxW}px`);
            next = setStyleProp(next, "min-width", `${pxW}px`);
            // 필요하면 max-width도 함께 고정
            // next = setStyleProp(next, "max-width", `${pxW}px`);
          }
          if (drag.current.resizeTableY) {
            const pxH = Math.max(40, Math.round(rect.height));
            next = setStyleProp(next, "height", `${pxH}px`);
            next = setStyleProp(next, "min-height", `${pxH}px`);
          }

          console.log("이름이 왜 넥스트?", next);

          tableNode.setStyle(next);
        }

        // 2) 열 커밋 (이미 StyledTableCellNode 패턴으로 바꾸신 부분 유지 + 약간 정리)
        if (!drag.current.resizeTableX) {
          drag.current.colTargets.forEach((cell) => {
            const key = cell.getAttribute("data-lexical-node-key");
            if (!key) return;

            const node = $getNodeByKey(key);
            if (!(node instanceof StyledTableCellNode)) return;

            const rect = cell.getBoundingClientRect();
            const px = Math.max(MIN_COL, Math.round(rect.width));
            let next = node.getStyle() || "";
            next = setStyleProp(next, "width", `${px}px`);
            next = setStyleProp(next, "min-width", `${px}px`);
            node.setStyle(next);
          });
        }

        // 3) 행 커밋 (+ 각 셀 height, 행 height 반영)
        if (!drag.current.resizeTableY) {
          drag.current.rowTargets.forEach((cell) => {
            const key = cell.getAttribute("data-lexical-node-key");
            if (!key) return;

            const node = $getNodeByKey(key);
            if (!(node instanceof StyledTableCellNode)) return;

            // 셀 높이 커밋
            const rect = cell.getBoundingClientRect();
            const py = Math.max(MIN_ROW, Math.round(rect.height));
            let cellStyle = node.getStyle() || "";
            cellStyle = setStyleProp(cellStyle, "height", `${py}px`);
            cellStyle = setStyleProp(cellStyle, "min-height", `${py}px`);
            node.setStyle(cellStyle);

            // 행 높이 커밋 (부모)
            const row = node.getParent();
            if (row instanceof StyledTableRowNode) {
              let rowStyle = row.getStyle() || "";
              rowStyle = setStyleProp(rowStyle, "height", `${py}px`);
              row.setStyle(rowStyle);
            }
          });
        }
      });

      // 리셋
      drag.current = {
        active: false,
        pointerId: null,
        table: null,
        startX: 0,
        startY: 0,
        useLeft: false,
        useRight: false,
        useTop: false,
        useBottom: false,
        resizeTableX: false,
        resizeTableY: false,
        tableInitW: 0,
        tableInitH: 0,
        colIndex: -1,
        rowIndex: -1,
        colTargets: [],
        rowTargets: [],
        initColW: [],
        initRowH: [],
      };
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // overlay 최종 위치
      const tableEl = selected.current.tableKey
        ? editor.getElementByKey(selected.current.tableKey)
        : null;
      positionOverlay(root, overlay, tableEl);
    };

    const onPointerUp = (e) => {
      if (drag.current.pointerId === e.pointerId) commitAndReset();
    };
    const onPointerCancel = (e) => {
      if (drag.current.pointerId === e.pointerId) commitAndReset();
    };
    const onLostCapture = () => commitAndReset();
    const onWindowBlur = () => commitAndReset();
    const onVisibility = () => {
      if (document.hidden) commitAndReset();
    };

    // 이벤트 등록
    root.addEventListener("pointermove", onPointerMovePreview);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("lostpointercapture", onLostCapture);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibility);

    const unlistenRoot = editor.registerRootListener((next, prev) => {
      if (prev) {
        prev.removeEventListener("pointermove", onPointerMovePreview);
        prev.removeEventListener("pointerdown", onPointerDown);
        prev.removeEventListener("lostpointercapture", onLostCapture);
      }
      if (next) {
        next.addEventListener("pointermove", onPointerMovePreview);
        next.addEventListener("pointerdown", onPointerDown);
        next.addEventListener("lostpointercapture", onLostCapture);
      }
      root = next || null;
    });

    return () => {
      removeUpdate();
      root.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);

      if (root) {
        root.removeEventListener("pointermove", onPointerMovePreview);
        root.removeEventListener("pointerdown", onPointerDown);
        root.removeEventListener("lostpointercapture", onLostCapture);
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      unlistenRoot();

      drag.current.active = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [editor]);

  return null;
}
