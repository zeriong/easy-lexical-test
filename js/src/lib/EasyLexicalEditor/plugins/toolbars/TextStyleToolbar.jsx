import { useCallback, useEffect, useState } from "react";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";

export default function TextStyleToolbar({ editor }) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  // 툴바 update
  function updateToolbar() {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
    }
  }

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
