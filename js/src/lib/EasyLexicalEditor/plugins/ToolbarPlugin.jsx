/**
 * ToolbarPlugin.jsx — JS 버전
 * - 텍스트/배경색: $patchStyleText
 * - 블록 전환: $setBlocksType + Heading/Quote
 * - 이미지 업로드: <input type="file"> + objectURL + ImageNode 삽입
 */
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef } from "react";
import ImageUploadToolbar from "./toolbars/ImageUploadToolbar.jsx";
import UndoAndRedoToolbar from "./toolbars/UndoAndRedoToolbar.jsx";
import TextStyleToolbar from "./toolbars/TextStyleToolbar.jsx";
import BlockTypeToolbar from "./toolbars/BlockTypeToolbar.jsx";
import TextColorToolbar from "./toolbars/TextColorToolbar.jsx";
import TextBackgroundColorToolbar from "./toolbars/TextBackgroundColorToolbar.jsx";
import AlignToolbar from "./toolbars/AlignToolbar.jsx";

function Divider() {
  return <div className="divider" />;
}

export default function ToolbarPlugin({ textColors, bgColors }) {
  // default text colors
  const TEXT_COLORS = textColors || [
    "#000000",
    "#E11D48",
    "#2563EB",
    "#059669",
    "#F59E0B",
    "#64748B",
  ];
  // default bg colors
  const BG_COLORS = bgColors || [
    "transparent",
    "#FFF1F2",
    "#DBEAFE",
    "#ECFDF5",
    "#FEF3C7",
    "#F1F5F9",
  ];

  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);

  return (
    <div className="toolbar" ref={toolbarRef}>
      {/* Undo / Redo */}
      <UndoAndRedoToolbar editor={editor} />

      <Divider />

      {/* Bold / Italic / Underline / Strikethrough */}
      <TextStyleToolbar editor={editor} />

      <Divider />

      {/* Align */}
      <AlignToolbar editor={editor} />

      <Divider />

      {/* Block Type */}
      <BlockTypeToolbar editor={editor} />

      {/* Text Color */}
      <TextColorToolbar editor={editor} textColors={TEXT_COLORS} />

      {/* Background Color */}
      <TextBackgroundColorToolbar editor={editor} bgColors={BG_COLORS} />

      <Divider />

      {/* Image Upload */}
      <ImageUploadToolbar editor={editor} />
    </div>
  );
}
