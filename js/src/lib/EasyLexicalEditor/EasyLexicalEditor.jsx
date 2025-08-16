/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import "./styles/easy-lexical-editor.css";

import DOMPurify from "dompurify";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

import { $getRoot, $isTextNode, isHTMLElement, ParagraphNode, TextNode } from "lexical";
import { ImageNode } from "./nodes/ImageNode.js";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $generateHtmlFromNodes } from "@lexical/html";

import TreeViewPlugin from "./plugins/TreeViewPlugin";

import { BasicTheme } from "./contants/common.js";
import ToolbarPlugin from "./plugins/ToolbarPlugin.jsx";
import { ResizableImageNode } from "./nodes/ResizableImageNode.jsx";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";

// * 안전한 스타일만을 남김
const whitelistStylesExportDOM = (editor, target) => {
  const output = target.exportDOM(editor);
  if (output && isHTMLElement(output.element)) {
    // class/dir 제거
    output.element.removeAttribute("class");
    if (output.element.getAttribute("dir") === "ltr") {
      output.element.removeAttribute("dir");
    }
    // 노드에 저장된 style 값 직접 세팅
    const nodeStyle = target.getStyle?.();
    if (nodeStyle) {
      // style 속성만 sanitize
      const sanitized = DOMPurify.sanitize(
        `<${output.element.tagName} style="${nodeStyle}"></${output.element.tagName}>`,
        { ALLOWED_ATTR: ["style"], ALLOWED_TAGS: [output.element.tagName.toLowerCase()] },
      );

      // 정규식으로 style 값만 추출
      const match = sanitized.match(/style="([^"]*)"/i);
      if (match) {
        output.element.setAttribute("style", match[1]);
      } else {
        output.element.removeAttribute("style");
      }
    }
  }
  // p 태그의 기본 속성을 없애기 위함
  if (output.element.tagName === "P") {
    output.element.setAttribute("style", "margin: 0;");
  }
  return output;
};

const exportMap = new Map([
  [ParagraphNode, whitelistStylesExportDOM],
  [TextNode, whitelistStylesExportDOM],
  [HeadingNode, whitelistStylesExportDOM],
  [QuoteNode, whitelistStylesExportDOM],
]);

const constructImportMap = () => {
  const importMap = {};

  for (const [tag, fn] of Object.entries(TextNode.importDOM() || {})) {
    importMap[tag] = (importNode) => {
      const importer = fn(importNode);
      if (!importer) {
        return null;
      }
      return {
        ...importer,
        conversion: (element) => {
          const output = importer.conversion(element);
          if (
            output === null ||
            output.forChild === undefined ||
            output.after !== undefined ||
            output.node !== null
          ) {
            return output;
          }

          // 원본 style 가져오기
          const originalStyle = element.getAttribute("style") || "";

          // style만 포함한 안전한 태그 생성 후 DOMPurify로 정제
          const sanitized = DOMPurify.sanitize(
            `<${element.tagName} style="${originalStyle}"></${element.tagName}>`,
            {
              ALLOWED_TAGS: [element.tagName.toLowerCase()],
              ALLOWED_ATTR: ["style"],
            },
          );

          // 정규식으로 style 값만 추출
          const match = sanitized.match(/style="([^"]*)"/i);
          const safeStyle = match ? match[1] : "";

          if (safeStyle) {
            const { forChild } = output;
            return {
              ...output,
              forChild: (child, parent) => {
                const textNode = forChild(child, parent);
                if ($isTextNode(textNode)) {
                  textNode.setStyle(safeStyle);
                }
                return textNode;
              },
            };
          }

          return output;
        },
      };
    };
  }

  return importMap;
};

/**
 * @param {Object} props
 * @param {boolean} props.showTerminal
 * @param {string} props.placeholder
 * @param {any} props.onChange
 * */
export default function EasyLexicalEditor({
  showTerminal,
  placeholder = "내용을 입력해주세요.",
  onChange,
}) {
  const editorConfig = {
    html: {
      export: exportMap,
      import: constructImportMap(),
    },
    namespace: "Easy-Lexical-Editor",
    nodes: [ParagraphNode, TextNode, ImageNode, HeadingNode, QuoteNode, ResizableImageNode],
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
      console.log("온체인지", { text, html, json });
      onChange({ editorState, editor, text, html, json });
    });
  }

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="editor-container">
        {/* Toolbars */}
        <ToolbarPlugin />

        {/* editor inner */}
        <div className="editor-inner">
          {/* plugins */}
          <OnChangePlugin onChange={handleChange} />
          <HistoryPlugin />
          <AutoFocusPlugin />
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

          {/* Test terminal Plugin */}
          {showTerminal && <TreeViewPlugin />}
        </div>
      </div>
    </LexicalComposer>
  );
}
