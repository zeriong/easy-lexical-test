import { useCallback, useEffect, useState } from "react";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { TEXT_STYLE_OBJECT } from "../../contants/common.js";

export default function TextStyleToolbar({ editor }) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  // type list를 TEXT_STYLE_OBJECT의 key를 활용하기 위한 list
  const typeList = Object.entries(TEXT_STYLE_OBJECT);

  // updateToolbar 함수 내부에서 font style 반복 작업을 최적화하기 위한 함수
  const textStyleEditor = useCallback((selection, typeStr, currentStyle) => {
    const currentTextStyle = TEXT_STYLE_OBJECT[typeStr];
    if (selection.hasFormat(typeStr)) {
      if (!currentStyle.includes(currentTextStyle.style)) {
        currentStyle += `${currentTextStyle.style};`;
      }
    } else {
      currentStyle = currentStyle.replace(currentTextStyle.regexp, "");
    }
  }, []);

  // 툴바 update
  const updateToolbar = useCallback(() => {
    editor.update(() => {
      // selection
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        const hasBold = selection.hasFormat("bold");
        const hasItalic = selection.hasFormat("italic");
        const hasUnderline = selection.hasFormat("underline");
        const hasStrikethrough = selection.hasFormat("strikethrough");

        // 각 state 변경
        setIsBold(hasBold);
        setIsItalic(hasItalic);
        setIsUnderline(hasUnderline);
        setIsStrikethrough(hasStrikethrough);

        // 커서만 있고 드래그가 된 영역이 없다면 true
        const isCollapsed = selection.isCollapsed();
        // 드래그가 되어 선택된 영역이 있는 경우만 style 삽입
        if (!isCollapsed) {
          // 드래그되어 선택된 영역만 위 hasFormat과 같은 조건으로 inline-style을 추가함
          const nodes = selection.getNodes();
          // 노드를 순회하며 각 스타일을 지정
          nodes.forEach((node) => {
            if ($isTextNode(node)) {
              let currentStyle = node.getStyle() || "";

              // TEXT_STYLE_OBJECT의 key를 기반으로 순회실행
              typeList.forEach(([key]) => {
                textStyleEditor(selection, key, currentStyle);
              });

              node.setStyle(currentStyle.trim());
            }
          });
        }
      }
    });
  }, [editor]);

  /**
   * @desc argument로 전달받은 string style로 text style 변경하는 함수
   * */
  const setTextStyle = useCallback(
    /** @param {"bold" | "italic" | "underline" | "strikethrough"} textStyle */
    (textStyle) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, textStyle);
    },
    [],
  );

  useEffect(() => {
    return () => {
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      );
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setTextStyle("bold")}
        className={"toolbar-item spaced " + (isBold ? "active" : "")}
        aria-label="Bold"
        title="Bold"
      >
        <i className="format bold" />
      </button>
      <button
        onClick={() => setTextStyle("italic")}
        className={"toolbar-item spaced " + (isItalic ? "active" : "")}
        aria-label="Italic"
        title="Italic"
      >
        <i className="format italic" />
      </button>
      <button
        onClick={() => setTextStyle("underline")}
        className={"toolbar-item spaced " + (isUnderline ? "active" : "")}
        aria-label="Underline"
        title="Underline"
      >
        <i className="format underline" />
      </button>
      <button
        onClick={() => setTextStyle("strikethrough")}
        className={"toolbar-item spaced " + (isStrikethrough ? "active" : "")}
        aria-label="Strikethrough"
        title="Strikethrough"
      >
        <i className="format strikethrough" />
      </button>
    </>
  );
}
