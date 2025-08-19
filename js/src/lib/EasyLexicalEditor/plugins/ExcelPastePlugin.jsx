import { useEffect } from "react";
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_NORMAL,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  StyledTableNode,
  StyledTableRowNode,
  StyledTableCellNode,
} from "../nodes/StyledTableNodes.js";
import { parseCssRules, mergeStyles, cleanExcelText } from "../utils/cssInline.js";

export default function ExcelPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerCommand(
      PASTE_COMMAND,
      (e) => {
        const html = e.clipboardData?.getData("text/html");
        const text = e.clipboardData?.getData("text/plain");

        console.log("html", html);

        // --- HTML (엑셀) ---
        if (html && html.includes("<table")) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const tableEl = doc.querySelector("table");
          const styleEl = doc.querySelector("style");
          const { byClass, byTag } = parseCssRules(styleEl?.textContent || "");

          if (tableEl) {
            editor.update(() => {
              const rows = tableEl.rows.length;
              const cols = Math.max(...Array.from(tableEl.rows).map((r) => r.cells.length));

              // table: tag(table) + (class 규칙) + inline
              const tableClassAttr = tableEl.getAttribute("class") || "";
              const tableClassRules = tableClassAttr
                .split(/\s+/)
                .filter(Boolean)
                .map((cl) => byClass.get(cl) || "")
                .join("; ");

              const tableStyle = mergeStyles(
                byTag.get("table") || "",
                tableClassRules,
                tableEl.getAttribute("style") || "",
              );

              // 클래스는 '저장/적용하지 않음' (요구사항)
              const tableNode = new StyledTableNode(tableStyle);

              for (let r = 0; r < rows; r++) {
                const rowEl = tableEl.rows[r];

                // 빈 행 스킵
                const texts = Array.from(rowEl.cells).map((td) =>
                  cleanExcelText(td?.innerText ?? ""),
                );
                if (texts.length && texts.every((t) => t.length === 0)) continue;

                // tr: tag(tr) + (class 규칙) + inline
                const trClassAttr = rowEl.getAttribute("class") || "";
                const trClassRules = trClassAttr
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((cl) => byClass.get(cl) || "")
                  .join("; ");

                const trStyle = mergeStyles(
                  byTag.get("tr") || "",
                  trClassRules,
                  rowEl.getAttribute("style") || "",
                );
                const rowNode = new StyledTableRowNode(undefined, trStyle);

                for (let c = 0; c < rowEl.cells.length; c++) {
                  const cellEl = rowEl.cells[c];
                  const text = cleanExcelText(cellEl?.innerText ?? "");

                  const cs = parseInt(cellEl.getAttribute("colspan") || "1", 10);
                  const rs = parseInt(cellEl.getAttribute("rowspan") || "1", 10);

                  // td: tag(td) + (class 규칙) + inline + <col> width
                  const tdBase = byTag.get("td") || "";

                  const clsAttr = (cellEl.getAttribute("class") || "").trim();
                  const classRules = clsAttr
                    ? clsAttr
                        .split(/\s+/)
                        .map((cl) => byClass.get(cl) || "")
                        .join("; ")
                    : "";

                  // <col> 기반 width 보정(간단 버전)
                  let colWidth = "";
                  const colEls = tableEl.querySelectorAll("col");
                  if (colEls && colEls.length > 0) {
                    const colEl = colEls[c];
                    if (colEl) {
                      const wAttr = colEl.getAttribute("width");
                      const wStyle = colEl.getAttribute("style") || "";
                      if (wStyle.includes("width")) {
                        colWidth = wStyle;
                      } else if (wAttr) {
                        colWidth = `width: ${wAttr}px`;
                      }
                    }
                  }

                  const cellStyle = mergeStyles(
                    tdBase,
                    classRules,
                    cellEl.getAttribute("style") || "",
                    colWidth,
                  );

                  // 클래스는 저장/적용하지 않음
                  const cellNode = new StyledTableCellNode(false, cs, rs, cellStyle);

                  if (text) {
                    const p = $createParagraphNode().append($createTextNode(text));
                    cellNode.append(p);
                  }
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

        // --- TSV fallback ---
        if (text && text.includes("\t")) {
          const rows = text.split("\n").filter(Boolean);
          editor.update(() => {
            const tableNode = new StyledTableNode(
              "border-collapse: collapse; table-layout: fixed; width: 100%;",
            );
            rows.forEach((row) => {
              const cells = row.split("\t");
              const rowNode = new StyledTableRowNode();
              cells.forEach((val) => {
                const v = cleanExcelText(val);
                const cellNode = new StyledTableCellNode(
                  false,
                  1,
                  1,
                  "border: 1px solid #cbd5e1; padding: 8px;",
                );
                if (v) cellNode.append($createParagraphNode().append($createTextNode(v)));
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
