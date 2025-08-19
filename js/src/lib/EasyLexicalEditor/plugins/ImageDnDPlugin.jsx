import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  DROP_COMMAND,
} from "lexical";
import { $createResizableImageNode } from "../nodes/ResizableImageNode.jsx";

export default function ImageDnDPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeDnDFile = editor.registerCommand(
      DROP_COMMAND,
      (e) => {
        const dataTransfer = e.dataTransfer;
        const file = dataTransfer?.files[0];

        if (dataTransfer && file) {
          const node = $createResizableImageNode({
            ...file,
            src: URL.createObjectURL(file),
          });

          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            const top = anchorNode.getTopLevelElement();

            if (top) {
              // top-level 엘리먼트가 있으면 그 뒤에 삽입
              top.insertAfter(node);
            } else {
              // 없으면 root에 삽입
              $getRoot().append(node);
            }

            node.selectNext();
          } else {
            // selection이 range가 아니면 그냥 root에 삽입
            $getRoot().append(node);
          }
        }
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      removeDnDFile();
    };
  }, [editor]);

  return null;
}
