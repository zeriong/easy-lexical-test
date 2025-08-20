// plugins/ExcelPastePlugin.jsx
import { useEffect } from "react";
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  $createLineBreakNode,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  StyledTableNode,
  StyledTableRowNode,
  StyledTableCellNode,
} from "../nodes/StyledTableNodes.js";
import { parseCssRules, mergeStyles } from "../utils/cssInline.js";

/** 블록 태그: 만나면 새 Paragraph로 분할 */
const BLOCK_TAGS = new Set([
  "p",
  "div",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
]);

const INLINE_EFFECT = (tag, el) => {
  const t = tag.toLowerCase();
  if (t === "b" || t === "strong") return "font-weight: bold;";
  if (t === "i" || t === "em") return "font-style: italic;";
  if (t === "u") return "text-decoration: underline;";
  if (t === "s" || t === "strike") return "text-decoration: line-through;";
  if (t === "sub") return "vertical-align: sub;";
  if (t === "sup") return "vertical-align: super;";
  if (t === "font") {
    const out = [];
    const color = el.getAttribute("color");
    const face = el.getAttribute("face");
    const size = el.getAttribute("size");
    if (color) out.push(`color: ${color};`);
    if (face) out.push(`font-family: ${face};`);
    if (size) {
      const px =
        size === "1"
          ? "10px"
          : size === "2"
            ? "12px"
            : size === "3"
              ? "14px"
              : size === "4"
                ? "16px"
                : size === "5"
                  ? "18px"
                  : size === "6"
                    ? "24px"
                    : "32px";
      out.push(`font-size: ${px};`);
    }
    return out.join(" ");
  }
  return "";
};

function getAlignStyleFromAttr(el) {
  const align = el.getAttribute?.("align");
  if (!align) return "";
  const v = String(align).toLowerCase();
  if (["left", "center", "right", "justify"].includes(v)) return `text-align: ${v};`;
  return "";
}
function getVAlignStyleFromAttr(el) {
  const valign = el.getAttribute?.("valign");
  if (!valign) return "";
  const v = String(valign).toLowerCase();
  // top | middle | bottom | baseline ...
  return `vertical-align: ${v};`;
}

function styleToMap(style = "") {
  const m = new Map();
  style
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const i = pair.indexOf(":");
      if (i < 0) return;
      m.set(pair.slice(0, i).trim().toLowerCase(), pair.slice(i + 1).trim());
    });
  return m;
}
function pickTextAlign(style = "") {
  const v = (styleToMap(style).get("text-align") || "").toLowerCase();
  return ["left", "right", "center", "justify"].includes(v) ? v : null;
}
function applyParagraphAlign(paragraph, styleOrFallback) {
  const align = pickTextAlign(styleOrFallback);
  if (align) {
    try {
      paragraph.setFormat(align);
    } catch (e) {
      console.log("error", e);
    }
  }
}

function isBlockTag(tag) {
  return BLOCK_TAGS.has(tag.toLowerCase());
}

/** element에서 적용할 style 계산 */
function computeStyleForElement(el, byClass, byTag, inherited = "") {
  const tag = el.tagName?.toLowerCase?.() || "";
  const tagRule = byTag.get(tag) || "";
  const classRule = (el.getAttribute?.("class") || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((cl) => byClass.get(cl) || "")
    .join("; ");
  const inline = el.getAttribute?.("style") || "";
  const tagFx = INLINE_EFFECT(tag, el);
  const alignAttr = getAlignStyleFromAttr(el);
  const vAlignAttr = getVAlignStyleFromAttr(el);

  // last-wins 가정하에, inherited(상속) → tag/class/inline/attr 순서로
  return mergeStyles(inherited, tagRule, classRule, inline, tagFx, alignAttr, vAlignAttr);
}

/** 셀 DOM → ParagraphNode[] (TextNode.setStyle + <br> + align 적용) */
function buildParagraphsFromCellDOM(cellEl, byClass, byTag, cellStyleForFallback) {
  const paras = [];
  let curP = $createParagraphNode();

  const flush = () => {
    if (curP.getChildrenSize() > 0) {
      // 문단 정렬이 없다면 셀 스타일로 fallback
      if (!pickTextAlign(curP.getStyle?.() || "") && cellStyleForFallback) {
        applyParagraphAlign(curP, cellStyleForFallback);
      }
      paras.push(curP);
      curP = $createParagraphNode();
    }
  };

  const walk = (node, inheritedStyle = "") => {
    if (node.nodeType === Node.TEXT_NODE) {
      // 줄바꿈 이중 방지: 텍스트 내 \r?\n 제거 (줄바꿈은 <br>로만)
      const text = (node.nodeValue ?? "").replace(/\r?\n/g, "");
      if (text) {
        const t = $createTextNode(text);
        if (typeof t.setStyle === "function") t.setStyle(inheritedStyle);
        curP.append(t);
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = /** @type {HTMLElement} */ (node);
      const tag = el.tagName.toLowerCase();

      if (tag === "br") {
        curP.append($createLineBreakNode());
        return;
      }

      const nextStyle = computeStyleForElement(el, byClass, byTag, inheritedStyle);

      if (isBlockTag(tag)) {
        // 블록 경계 → 새 문단들 만들기
        flush();

        let blockP = $createParagraphNode();
        // 블록의 text-align 우선
        const blockAlign = pickTextAlign(nextStyle);
        if (blockAlign) applyParagraphAlign(blockP, nextStyle);
        else if (cellStyleForFallback) applyParagraphAlign(blockP, cellStyleForFallback);

        const pushBlockP = () => {
          if (blockP.getChildrenSize() > 0) {
            paras.push(blockP);
            blockP = $createParagraphNode();
            if (blockAlign) applyParagraphAlign(blockP, nextStyle);
            else if (cellStyleForFallback) applyParagraphAlign(blockP, cellStyleForFallback);
          }
        };

        const walkChildren = (container, inhStyle) => {
          for (const child of Array.from(container.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
              const tx = (child.nodeValue ?? "").replace(/\r?\n/g, "");
              if (tx) {
                const t = $createTextNode(tx);
                if (typeof t.setStyle === "function") t.setStyle(inhStyle);
                blockP.append(t);
              }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const ktag = child.tagName.toLowerCase();
              if (ktag === "br") {
                blockP.append($createLineBreakNode());
              } else if (isBlockTag(ktag)) {
                pushBlockP();
                walk(child, computeStyleForElement(child, byClass, byTag, inhStyle));
                pushBlockP();
              } else {
                // 인라인 요소
                const eff = computeStyleForElement(child, byClass, byTag, inhStyle);
                for (const leaf of Array.from(child.childNodes)) {
                  if (leaf.nodeType === Node.TEXT_NODE) {
                    const tx2 = (leaf.nodeValue ?? "").replace(/\r?\n/g, "");
                    if (tx2) {
                      const t = $createTextNode(tx2);
                      if (typeof t.setStyle === "function") t.setStyle(eff);
                      blockP.append(t);
                    }
                  } else if (leaf.nodeType === Node.ELEMENT_NODE) {
                    const ltag = leaf.tagName.toLowerCase();
                    if (ltag === "br") blockP.append($createLineBreakNode());
                    else walk(leaf, eff);
                  }
                }
              }
            }
          }
        };

        walkChildren(el, nextStyle);
        if (blockP.getChildrenSize() > 0) paras.push(blockP);

        // 다음 텍스트는 새로운 문단에서 시작
        curP = $createParagraphNode();
        if (cellStyleForFallback) applyParagraphAlign(curP, cellStyleForFallback);
        return;
      }

      // 인라인 요소: 스타일 상속하며 자식 순회
      for (const child of Array.from(el.childNodes)) {
        walk(child, nextStyle);
      }
    }
  };

  for (const child of Array.from(cellEl.childNodes)) {
    walk(child, "");
  }
  flush();

  if (paras.length === 0) {
    // 비어 있으면 1개 추가 + 셀 정렬 fallback
    if (cellStyleForFallback) applyParagraphAlign(curP, cellStyleForFallback);
    paras.push(curP);
  }
  return paras;
}

export default function ExcelPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerCommand(
      PASTE_COMMAND,
      (e) => {
        const html = e.clipboardData?.getData("text/html");
        const text = e.clipboardData?.getData("text/plain");

        // console.log("html: ", html);

        // ---------- Case 1: Excel HTML ----------
        if (html && html.includes("<table")) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const tableEl = doc.querySelector("table");
          const styleEl = doc.querySelector("style");
          const { byClass, byTag } = parseCssRules(styleEl?.textContent || "");

          if (tableEl) {
            editor.update(() => {
              // table style (베이스는 마지막에 넣지 않음)
              const tableStyle = mergeStyles(
                byTag.get("table") || "",
                (tableEl.getAttribute("class") || "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((cl) => byClass.get(cl) || "")
                  .join("; "),
                tableEl.getAttribute("style") || "",
              );

              const tableNode = new StyledTableNode(tableStyle);

              for (let r = 0; r < tableEl.rows.length; r++) {
                const rowEl = tableEl.rows[r];

                // 빈 행 skip
                const onlyEmpty =
                  rowEl.cells.length > 0 &&
                  Array.from(rowEl.cells).every((td) => (td.textContent || "").trim() === "");
                if (onlyEmpty) continue;

                const trStyle = mergeStyles(
                  byTag.get("tr") || "",
                  (rowEl.getAttribute("class") || "")
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((cl) => byClass.get(cl) || "")
                    .join("; "),
                  rowEl.getAttribute("style") || "",
                );
                const rowNode = new StyledTableRowNode(undefined, trStyle);

                for (let c = 0; c < rowEl.cells.length; c++) {
                  const cellEl = rowEl.cells[c];

                  // <col> width
                  let colWidth = "";
                  const colEls = tableEl.querySelectorAll("col");
                  if (colEls && colEls.length > c) {
                    const colEl = colEls[c];
                    const wAttr = colEl?.getAttribute("width");
                    const wStyle = colEl?.getAttribute("style") || "";
                    if (wStyle.includes("width")) colWidth = wStyle;
                    else if (wAttr) colWidth = `width: ${wAttr}px`;
                  }

                  // 병합 순서: 태그/클래스/인라인/align/valign/colWidth(오른쪽이 우선)
                  const cellStyle = mergeStyles(
                    byTag.get("td") || "",
                    (cellEl.getAttribute("class") || "")
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((cl) => byClass.get(cl) || "")
                      .join("; "),
                    cellEl.getAttribute("style") || "",
                    getAlignStyleFromAttr(cellEl),
                    getVAlignStyleFromAttr(cellEl),
                    colWidth,
                  );

                  const cs = parseInt(cellEl.getAttribute("colspan") || "1", 10);
                  const rs = parseInt(cellEl.getAttribute("rowspan") || "1", 10);
                  const cellNode = new StyledTableCellNode(false, cs, rs, cellStyle);

                  // 셀 DOM → Paragraph[] (정렬/스타일/줄바꿈 반영)
                  const paragraphs = buildParagraphsFromCellDOM(
                    cellEl,
                    byClass,
                    byTag,
                    cellStyle /* paragraph align fallback */,
                  );
                  paragraphs.forEach((p) => cellNode.append(p));

                  rowNode.append(cellNode);
                }

                tableNode.append(rowNode);
              }

              // selection 위치에 삽입
              const sel = $getSelection();
              if ($isRangeSelection(sel)) sel.insertNodes([tableNode]);
              else $getRoot().append(tableNode);
            });

            return true;
          }
        }

        // ---------- Case 2: TSV ----------
        if (text && text.includes("\t")) {
          const rows = text.split("\n"); // 줄바꿈 보존
          editor.update(() => {
            const tableNode = new StyledTableNode(
              "border-collapse: collapse; table-layout: fixed; width: 100%;",
            );

            rows.forEach((row) => {
              const rowNode = new StyledTableRowNode();
              row.split("\t").forEach((cellRaw) => {
                const cellNode = new StyledTableCellNode(false, 1, 1, "");
                if (cellRaw.length) {
                  const p = $createParagraphNode();
                  const parts = cellRaw.split(/\n/);
                  parts.forEach((chunk, i) => {
                    const t = $createTextNode(chunk);
                    p.append(t);
                    if (i < parts.length - 1) p.append($createLineBreakNode());
                  });
                  cellNode.append(p);
                } else {
                  cellNode.append($createParagraphNode());
                }
                rowNode.append(cellNode);
              });
              tableNode.append(rowNode);
            });

            const sel = $getSelection();
            if ($isRangeSelection(sel)) sel.insertNodes([tableNode]);
            else $getRoot().append(tableNode);
          });

          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    );

    return () => unregister();
  }, [editor]);

  return null;
}
