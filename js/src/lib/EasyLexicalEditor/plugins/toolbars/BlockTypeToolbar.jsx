import { useCallback, useEffect, useState } from "react";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { BLOCK_INLINE_STYLES } from "../../contants/common.js";

export default function BlockTypeToolbar({ editor }) {
  const [blockType, setBlockType] = useState("paragraph");

  // update toolbar
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow();

      const type = element.getType(); // "paragraph" | "heading" | "quote" | ...
      if (type === "heading" && typeof element.getTag === "function") {
        setBlockType(element.getTag()); // "h1" | "h2" | "h3"
      } else {
        setBlockType(type); // "paragraph" | "quote" 등
      }
    }
  }, []);

  // 블록 타입 전환
  const setBlock = ({ target: { value: type } }) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      // nodeCreator 구분
      const creator = () => {
        if (type === "paragraph") return $createParagraphNode();
        if (type === "quote") return $createQuoteNode();
        return $createHeadingNode(type);
      };

      $setBlocksType(selection, () => {
        const node = creator();
        node.setStyle(BLOCK_INLINE_STYLES[type]);
        return node;
      });
    });
  };

  useEffect(() => {
    return () => {
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar());
      });
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      );
    };
  }, [editor]);

  return (
    <>
      <select
        aria-label="Block Type"
        className="toolbar-item spaced"
        value={blockType}
        onChange={setBlock}
        title="Block type"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">H1</option>
        <option value="h2">H2</option>
        <option value="h3">H3</option>
        <option value="quote">Quote</option>
      </select>
    </>
  );
}
