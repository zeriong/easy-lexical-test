import { FORMAT_ELEMENT_COMMAND } from "lexical";
import { useCallback } from "react";

export default function AlignToolbar({ editor }) {
  // algin set 함수
  const setAlign = useCallback((align) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
  }, []);

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
