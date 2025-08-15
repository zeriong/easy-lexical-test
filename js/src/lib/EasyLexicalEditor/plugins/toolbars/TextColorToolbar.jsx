import { $patchStyleText } from "@lexical/selection";
import { $getSelection, $isRangeSelection } from "lexical";
import { useCallback } from "react";

export default function TextColorToolbar({ editor, textColors }) {
  // 텍스트 컬러 스타일 적용 함수
  const updateTextColor = useCallback(({ target: { value: color } }) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  }, []);

  // todo: 색상 선택창을 더해서 선택하고 적용 시 localstorage에 컬러 저장해버리기

  return (
    <div className="toolbar-item spaced" aria-label="Text Color" title="Text color">
      {/* text color icon */}
      <span style={{ marginRight: 6 }}>A</span>

      {/* color select  */}
      <select onChange={updateTextColor} defaultValue="">
        {textColors.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>
    </div>
  );
}
