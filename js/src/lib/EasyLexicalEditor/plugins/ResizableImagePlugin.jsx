import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_EDITOR,
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $getNodeByKey,
} from "lexical";
import { $createResizableImageNode, ResizableImageNode } from "../nodes/ResizableImageNode";
import { INSERT_RESIZABLE_IMAGE_COMMAND, UPDATE_IMAGE_SIZE_COMMAND } from "../contants/common.js";

export default function ResizableImagePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeInsert = editor.registerCommand(
      INSERT_RESIZABLE_IMAGE_COMMAND,
      (payload) => {
        editor.update(() => {
          const node = $createResizableImageNode(payload);
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const top = selection.anchor.getNode().getTopLevelElementOrThrow();
            top.insertAfter(node);
            node.selectNext();
          } else {
            $getRoot().append(node);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    const removeUpdate = editor.registerCommand(
      UPDATE_IMAGE_SIZE_COMMAND,
      ({ key, width, height }) => {
        editor.update(() => {
          const n = $getNodeByKey(key);
          if (n && n instanceof ResizableImageNode) {
            n.setSize(width, height);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    return () => {
      removeInsert();
      removeUpdate();
    };
  }, [editor]);

  return null;
}
