import { useCallback } from "react";
import { $getSelection, $isRangeSelection, FORMAT_ELEMENT_COMMAND } from "lexical";

// style 문자열 → 객체
function parseStyle(str) {
  const out = {};
  (str || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const idx = pair.indexOf(":");
      if (idx === -1) return;
      const k = pair.slice(0, idx).trim().toLowerCase();
      const v = pair.slice(idx + 1).trim();
      out[k] = v;
    });
  return out;
}

function stringifyStyle(obj) {
  return Object.keys(obj)
    .sort()
    .map((k) => `${k}: ${obj[k]}`)
    .join("; ");
}

function upsertStyleProp(styleStr, key, value) {
  const map = parseStyle(styleStr);
  if (!value) {
    delete map[key];
  } else {
    map[key] = value;
  }
  return stringifyStyle(map);
}

export default function AlignToolbar({ editor }) {
  const setAlign = useCallback(
    (align) => {
      // 1) 기본 Lexical align 기능 실행
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);

      // 2) 추가적으로 인라인 style 업데이트
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const topBlocks = new Map();

        if (selection.isCollapsed()) {
          const anchor = selection.anchor.getNode();
          const top = anchor.getTopLevelElementOrThrow?.();
          if (top) topBlocks.set(top.getKey(), top);
        } else {
          selection.getNodes().forEach((n) => {
            const top = n.getTopLevelElementOrThrow?.();
            if (top && !topBlocks.has(top.getKey())) {
              topBlocks.set(top.getKey(), top);
            }
          });
        }

        topBlocks.forEach((block) => {
          if (typeof block.getStyle === "function" && typeof block.setStyle === "function") {
            const prev = block.getStyle() || "";
            const next = upsertStyleProp(prev, "text-align", align);
            block.setStyle(next);
          }
        });
      });
    },
    [editor],
  );

  return (
    <>
      <button
        onClick={() => setAlign("left")}
        className="toolbar-item spaced"
        aria-label="Left Align"
        title="Left"
      >
        <i className="format left-align" />
      </button>
      <button
        onClick={() => setAlign("center")}
        className="toolbar-item spaced"
        aria-label="Center Align"
        title="Center"
      >
        <i className="format center-align" />
      </button>
      <button
        onClick={() => setAlign("right")}
        className="toolbar-item spaced"
        aria-label="Right Align"
        title="Right"
      >
        <i className="format right-align" />
      </button>
      <button
        onClick={() => setAlign("justify")}
        className="toolbar-item"
        aria-label="Justify Align"
        title="Justify"
      >
        <i className="format justify-align" />
      </button>
    </>
  );
}
