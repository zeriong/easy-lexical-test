import { useCallback } from "react";
import { $getSelection, $isRangeSelection } from "lexical";
import { $patchStyleText } from "@lexical/selection";

export default function TextBackgroundColorToolbar({ editor, bgColors }) {
  // 배경색 컬러 적용 함수
  const updateTextBgColor = useCallback(({ target: { value: backgroundColor } }) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "background-color": backgroundColor });
      }
    });
  }, []);

  return (
    <div className="toolbar-item spaced" aria-label="Background Color" title="Background color">
      <span style={{ marginRight: 6, borderBottom: "2px solid currentColor" }}>A</span>
      <select onChange={updateTextBgColor} defaultValue="">
        {bgColors.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
