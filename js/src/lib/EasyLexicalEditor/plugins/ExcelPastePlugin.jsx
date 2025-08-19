import { useEffect } from "react";
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_NORMAL,
} from "lexical";
import {
  $createTableNodeWithDimensions,
  $createTableCellNode,
  $createTableRowNode,
} from "@lexical/table";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

// 공백을 살제하기 위한 함수
function cleanExcelText(text) {
  return text.replace(/\u00A0/g, " ").trim();
}

export default function ExcelPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeExcelPaste = editor.registerCommand(
      PASTE_COMMAND,
      (e) => {
        const html = e.clipboardData?.getData("text/html");
        const text = e.clipboardData?.getData("text/plain");

        // ---------- Case 1: HTML table ----------
        if (html && html.includes("<table")) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const tableEl = doc.querySelector("table");

          if (tableEl) {
            editor.update(() => {
              const rows = tableEl.rows.length;
              const cols = Math.max(...Array.from(tableEl.rows).map((r) => r.cells.length));

              const tableNode = $createTableNodeWithDimensions(0, cols);

              for (let r = 0; r < rows; r++) {
                const rowEl = tableEl.rows[r];
                const cellTexts = Array.from(rowEl.cells).map((c) =>
                  cleanExcelText(c.innerText ?? ""),
                );

                // 행 전체 공백이면 skip
                const isRowEmpty = cellTexts.every((txt) => txt.length === 0);
                if (isRowEmpty) continue;

                const rowNode = $createTableRowNode();

                for (let c = 0; c < rowEl.cells.length; c++) {
                  const cellEl = rowEl.cells[c];
                  const cellText = cleanExcelText(cellEl.innerText ?? "");

                  const colspan = parseInt(cellEl.getAttribute("colspan") || "1", 10);
                  const rowspan = parseInt(cellEl.getAttribute("rowspan") || "1", 10);

                  // 병합 정보를 반영해서 cellNode 생성
                  const cellNode = $createTableCellNode(false, colspan, rowspan);

                  if (cellText.length > 0) {
                    const paragraph = $createParagraphNode().append($createTextNode(cellText));
                    cellNode.append(paragraph);
                  }
                  rowNode.append(cellNode);
                }

                tableNode.append(rowNode);
              }

              $getRoot().append(tableNode);
            });
            return true;
          }
        }

        // ---------- Case 2: Plain text (TSV) ----------
        if (text && text.includes("\t")) {
          const rows = text.split("\n").filter(Boolean);

          editor.update(() => {
            const rawCols = rows[0].split("\t").length;
            const tableNode = $createTableNodeWithDimensions(0, rawCols);

            rows.forEach((row) => {
              const cells = row.split("\t");
              const cellTexts = cells.map((c) => cleanExcelText(c));

              // 행 전체 공백이면 skip
              const isRowEmpty = cellTexts.every((txt) => txt.length === 0);
              if (isRowEmpty) return;

              const rowNode = $createTableRowNode();
              cellTexts.forEach((cellText) => {
                const cellNode = $createTableCellNode(false, 1, 1); // TSV는 병합정보 없음
                if (cellText.length > 0) {
                  const paragraph = $createParagraphNode().append($createTextNode(cellText));
                  cellNode.append(paragraph);
                }
                rowNode.append(cellNode);
              });
              tableNode.append(rowNode);
            });

            $getRoot().append(tableNode);
          });

          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    );

    return () => {
      removeExcelPaste();
    };
  }, [editor]);

  return null;
}
