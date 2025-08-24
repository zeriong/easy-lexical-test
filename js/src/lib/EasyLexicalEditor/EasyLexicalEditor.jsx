/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import "./styles/easy-lexical-editor.css";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

import { $getRoot, ParagraphNode, TextNode } from "lexical";
import { ImageNode } from "./nodes/ImageNode.js";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $generateHtmlFromNodes } from "@lexical/html";

import TreeViewPlugin from "./plugins/TreeViewPlugin";

import { BasicTheme } from "./contants/common.js";
import ToolbarPlugin from "./plugins/ToolbarPlugin.jsx";
import { ResizableImageNode } from "./nodes/ResizableImageNode.jsx";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import ImageDnDPlugin from "./plugins/ImageDnDPlugin.jsx";
import PasteImagePlugin from "./plugins/PasteImagePlugin.jsx";
import ExcelPastePlugin from "./plugins/ExcelPastePlugin.jsx";

import ResizableTablePlugin from "./plugins/ResizableTablePlugin.jsx";
import { buildInlineStyleImportMap } from "./utils/editorImporter.js";
import { whitelistStylesExportDOM } from "./utils/editorExporter.js";
import { StyledTableNode } from "./nodes/table/StyledTableNode.js";
import { StyledTableRowNode } from "./nodes/table/StyledTableRowNode.js";
import { StyledTableCellNode } from "./nodes/table/StyledTableCellNode.js";
import LoadingCover from "./components/LoadingCover.jsx";
import { Toasts } from "./components/Toasts.jsx";
import { useToastStore } from "./store/toastStore.jsx";
import { useEditorStore } from "./store/editorStore.js";

const exportMap = new Map([
  [ParagraphNode, whitelistStylesExportDOM],
  [TextNode, whitelistStylesExportDOM],
  [HeadingNode, whitelistStylesExportDOM],
  [QuoteNode, whitelistStylesExportDOM],
]);

/**
 * @param {Object} props
 * @param {boolean} props.showTerminal
 * @param {string} props.placeholder
 * @param {any} props.onChange
 * @param {React.CSSProperties} props.editorInnerStyle
 * @param {`${number}px` | `${number}%` | `${number}vw` | "auto"} props.editorInnerWidth
 * @param {`${number}px` | `${number}%` | `${number}vh` | "auto"} props.editorInnerHeight
 * @param {() => Promise<string>} props.saveServerFetcher
 * @param {number} props.toastShowingDuration
 * @param {string | ReactNode} props.uploadFailMessage
 * @param {boolean} props.isToastAutoHidden
 * */
export default function EasyLexicalEditor({
  showTerminal,
  placeholder = "내용을 입력해주세요.",
  onChange,
  editorInnerStyle,
  editorInnerWidth,
  editorInnerHeight = "500px",
  saveServerFetcher,
  toastShowingDuration,
  uploadFailMessage = `업로드에 실패하였습니다, 관리자에게 문의해주세요.`,
  isToastAutoHidden,
}) {
  const editorConfig = {
    html: {
      export: exportMap,
      import: buildInlineStyleImportMap(),
    },
    namespace: "Easy-Lexical-Editor",
    nodes: [
      ParagraphNode,
      TextNode,
      ImageNode,
      HeadingNode,
      QuoteNode,
      ResizableImageNode,
      // excel custom nodes
      StyledTableNode,
      StyledTableRowNode,
      StyledTableCellNode,
    ],
    onError(error) {
      throw error;
    },
    theme: BasicTheme,
  };

  const { addToast } = useToastStore();
  const { setIsLoading } = useEditorStore();

  // ? 온체인지 핸들 함수
  function handleChange(editorState, editor) {
    editorState.read(() => {
      const text = $getRoot().getTextContent(); // 순수 텍스트
      const html = $generateHtmlFromNodes(editor, null); // HTML
      const json = editorState.toJSON(); // JSON (직렬화)
      // console.log("온체인지", { text, html, json });
      onChange({ editorState, editor, text, html, json });
    });
  }

  // ? save server fetch 핸들 함수
  async function handleSaveServerFetcher() {
    try {
      setIsLoading(true);
      const saveUrl = await saveServerFetcher();
      if (saveUrl) {
        return saveUrl;
      }
    } catch (e) {
      console.error("save server error: ", e);
      addToast.warn(uploadFailMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LexicalComposer initialConfig={editorConfig}>
      {/* plugins */}
      <>
        {/* 기능 프럴그인 */}
        <OnChangePlugin onChange={handleChange} />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ResizableTablePlugin />

        {/* 파일을 필요로 하는 플러그인 */}
        <ImageDnDPlugin saveServerFetcher={handleSaveServerFetcher} />
        <PasteImagePlugin saveServerFetcher={handleSaveServerFetcher} />
        <ExcelPastePlugin saveServerFetcher={handleSaveServerFetcher} />
      </>

      <div className="editor-container">
        {/* Toolbars */}
        <ToolbarPlugin />

        {/* editor inner */}
        <div
          className="editor-inner"
          style={{
            width: editorInnerWidth,
            height: editorInnerHeight,
            ...(editorInnerStyle || {}),
          }}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input"
                aria-placeholder={placeholder}
                placeholder={<div className="editor-placeholder">{placeholder}</div>}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />

          {/* 로딩커버 */}
          <LoadingCover />

          {/* 토스트 */}
          <Toasts showingDuration={toastShowingDuration} isAutoHidden={isToastAutoHidden} />
        </div>

        {/* Test terminal Plugin */}
        {showTerminal && <TreeViewPlugin />}
      </div>
    </LexicalComposer>
  );
}
