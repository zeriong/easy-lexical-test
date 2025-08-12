/**
 * ToolbarPlugin.jsx — JS 버전
 * - 텍스트/배경색: $patchStyleText
 * - 블록 전환: $setBlocksType + Heading/Quote
 * - 이미지 업로드: <input type="file"> + objectURL + ImageNode 삽입
 */
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  $getRoot,
  ParagraphNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";

import { $patchStyleText, $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $createImageNode } from "../nodes/ImageNode";

function Divider() {
  return <div className="divider" />;
}

const TEXT_COLORS = ["#000000", "#E11D48", "#2563EB", "#059669", "#F59E0B", "#64748B"];
const BG_COLORS = ["transparent", "#FFF1F2", "#DBEAFE", "#ECFDF5", "#FEF3C7", "#F1F5F9"];

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");

  const fileInputRef = useRef(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));

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
  const setBlock = (type) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      console.log("getSelection임 ㅋㅋ", selection);

      if (type === "paragraph") {
        console.log("Type임 ㅋㅋ ㅋㅋ", type);
        // ✅ 0.33.1 대응: ParagraphNode 직접 생성
        $setBlocksType(selection, () => new ParagraphNode());
      } else if (type === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
      } else if (type === "h1" || type === "h2" || type === "h3") {
        $setBlocksType(selection, () => $createHeadingNode(type));
      }
    });
  };

  // 텍스트/배경색
  const applyTextColor = (color) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  };

  const applyBgColor = (backgroundColor) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "background-color": backgroundColor });
      }
    });
  };

  // 이미지 업로드
  const onPickImage = () => fileInputRef.current && fileInputRef.current.click();

  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    editor.update(() => {
      const selection = $getSelection();
      const imageNode = $createImageNode(url, file.name);

      if ($isRangeSelection(selection)) {
        const top = selection.anchor.getNode().getTopLevelElementOrThrow();
        top.insertAfter(imageNode);
        imageNode.selectNext();
      } else {
        // selection 없으면 root 끝에 추가
        const root = $getRoot();
        root.append(imageNode);
      }
    });

    // 실제 운영에선 서버 업로드 후 서버 URL로 교체 권장
    // URL.revokeObjectURL(url); // 표시 직후 revoke하면 이미지가 안 보일 수 있으니 적절한 타이밍에
    e.target.value = "";
  };

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar());
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateToolbar]);

  return (
    <div className="toolbar" ref={toolbarRef}>
      {/* Undo / Redo */}
      <button
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className="toolbar-item spaced"
        aria-label="Undo"
        title="Undo"
      >
        <i className="format undo" />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className="toolbar-item"
        aria-label="Redo"
        title="Redo"
      >
        <i className="format redo" />
      </button>

      <Divider />

      {/* Bold / Italic / Underline / Strikethrough */}
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        className={"toolbar-item spaced " + (isBold ? "active" : "")}
        aria-label="Bold"
        title="Bold"
      >
        <i className="format bold" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        className={"toolbar-item spaced " + (isItalic ? "active" : "")}
        aria-label="Italic"
        title="Italic"
      >
        <i className="format italic" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        className={"toolbar-item spaced " + (isUnderline ? "active" : "")}
        aria-label="Underline"
        title="Underline"
      >
        <i className="format underline" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
        className={"toolbar-item spaced " + (isStrikethrough ? "active" : "")}
        aria-label="Strikethrough"
        title="Strikethrough"
      >
        <i className="format strikethrough" />
      </button>

      <Divider />

      {/* Align */}
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}
        className="toolbar-item spaced"
        aria-label="Left Align"
        title="Left"
      >
        <i className="format left-align" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}
        className="toolbar-item spaced"
        aria-label="Center Align"
        title="Center"
      >
        <i className="format center-align" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}
        className="toolbar-item spaced"
        aria-label="Right Align"
        title="Right"
      >
        <i className="format right-align" />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")}
        className="toolbar-item"
        aria-label="Justify Align"
        title="Justify"
      >
        <i className="format justify-align" />
      </button>

      <Divider />

      {/* Block Type */}
      <select
        aria-label="Block Type"
        className="toolbar-item spaced"
        value={blockType}
        onChange={(e) => setBlock(e.target.value)}
        title="Block type"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">H1</option>
        <option value="h2">H2</option>
        <option value="h3">H3</option>
        <option value="quote">Quote</option>
      </select>

      {/* Text Color */}
      <div className="toolbar-item spaced" aria-label="Text Color" title="Text color">
        <span style={{ marginRight: 6 }}>A</span>
        <select onChange={(e) => applyTextColor(e.target.value)} defaultValue="">
          <option disabled value="">
            Text
          </option>
          {TEXT_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Background Color */}
      <div className="toolbar-item spaced" aria-label="Background Color" title="Background color">
        <span style={{ marginRight: 6, borderBottom: "2px solid currentColor" }}>A</span>
        <select onChange={(e) => applyBgColor(e.target.value)} defaultValue="">
          <option disabled value="">
            Bg
          </option>
          {BG_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <Divider />

      {/* Image Upload */}
      <button
        onClick={onPickImage}
        className="toolbar-item spaced"
        aria-label="Insert Image"
        title="Insert image"
      >
        <i className="format image" />
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
    </div>
  );
}
