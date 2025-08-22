import { useEffect } from "react";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
} from "lexical";
import { $createResizableImageNode } from "../nodes/ResizableImageNode.jsx";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

/**
 * @param {Object} props
 * @param {() => Promise<string>} props.saveServerFetcher
 * */
export default function PasteImagePlugin({ saveServerFetcher }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removePasteImage = editor.registerCommand(
      PASTE_COMMAND,
      (e) => {
        const clipboardData = e.clipboardData;
        const file = clipboardData?.files[0];

        if (clipboardData && file && file.type.includes("image")) {
          editor.update(() => {
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
          });
        }
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      removePasteImage();
    };
  }, [editor]);
  return null;
}
