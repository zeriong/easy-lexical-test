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
import {
  StyledTableCellNode,
  StyledTableNode,
  StyledTableRowNode,
} from "./nodes/StyledTableNodes.js";
import ResizableTablePlugin from "./plugins/ResizableTablePlugin.jsx";
import { buildInlineStyleImportMap } from "./utils/editorImporter.js";
import { whitelistStylesExportDOM } from "./utils/editorExporter.js";

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
 * */
export default function EasyLexicalEditor({
  showTerminal,
  placeholder = "내용을 입력해주세요.",
  onChange,
  editorInnerStyle,
  editorInnerWidth,
  editorInnerHeight = "500px",
  saveServerFetcher,
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

  function handleChange(editorState, editor) {
    editorState.read(() => {
      const text = $getRoot().getTextContent(); // 순수 텍스트
      const html = $generateHtmlFromNodes(editor, null); // HTML
      const json = editorState.toJSON(); // JSON (직렬화)
      // console.log("온체인지", { text, html, json });
      onChange({ editorState, editor, text, html, json });
    });
  }

  return (
    <LexicalComposer initialConfig={editorConfig}>
      {/* plugins */}
      <>
        <OnChangePlugin onChange={handleChange} />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ImageDnDPlugin />
        <PasteImagePlugin />
        <ExcelPastePlugin />
        <ResizableTablePlugin />
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
        </div>

        {/* Test terminal Plugin */}
        {showTerminal && <TreeViewPlugin />}
      </div>
    </LexicalComposer>
  );
}
