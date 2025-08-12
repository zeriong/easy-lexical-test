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

import { $getRoot, $isTextNode, isHTMLElement, ParagraphNode, TextNode } from "lexical";
import { ImageNode } from "./nodes/ImageNode.js";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $generateHtmlFromNodes } from "@lexical/html";

import TreeViewPlugin from "./plugins/TreeViewPlugin";

import { BasicTheme } from "./common/common.js";
import ToolbarPlugin from "./plugins/ToolbarPlugin.jsx";
import { parseAllowedColor, parseAllowedFontSize } from "./utils/common.js";
import { ResizableImageNode } from "./nodes/ResizableImageNode.jsx";
import ResizableImagePlugin from "./plugins/ResizableImagePlugin.jsx";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";

const removeStylesExportDOM = (editor, target) => {
  const output = target.exportDOM(editor);
  if (output && isHTMLElement(output.element)) {
    // Remove all inline styles and classes if the element is an HTMLElement
    // Children are checked as well since TextNode can be nested
    // in i, b, and strong tags.
    for (const el of [
      output.element,
      ...output.element.querySelectorAll('[style],[class],[dir="ltr"]'),
    ]) {
      el.removeAttribute("class");
      el.removeAttribute("style");
      if (el.getAttribute("dir") === "ltr") {
        el.removeAttribute("dir");
      }
    }
  }
  return output;
};

const exportMap = new Map([
  [ParagraphNode, removeStylesExportDOM],
  [TextNode, removeStylesExportDOM],
]);

const getExtraStyles = (element) => {
  // Parse styles from pasted input, but only if they match exactly the
  // sort of styles that would be produced by exportDOM
  let extraStyles = "";
  const fontSize = parseAllowedFontSize(element.style.fontSize);
  const backgroundColor = parseAllowedColor(element.style.backgroundColor);
  const color = parseAllowedColor(element.style.color);
  if (fontSize !== "" && fontSize !== "15px") {
    extraStyles += `font-size: ${fontSize};`;
  }
  if (backgroundColor !== "" && backgroundColor !== "rgb(255, 255, 255)") {
    extraStyles += `background-color: ${backgroundColor};`;
  }
  if (color !== "" && color !== "rgb(0, 0, 0)") {
    extraStyles += `color: ${color};`;
  }
  return extraStyles;
};

const constructImportMap = () => {
  const importMap = {};

  // Wrap all TextNode importers with a function that also imports
  // the custom styles implemented by the playground
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
          const extraStyles = getExtraStyles(element);
          if (extraStyles) {
            const { forChild } = output;
            return {
              ...output,
              forChild: (child, parent) => {
                const textNode = forChild(child, parent);
                if ($isTextNode(textNode)) {
                  textNode.setStyle(textNode.getStyle() + extraStyles);
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
      const html = $generateHtmlFromNodes(editor); // HTML
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
          <ResizableImagePlugin />
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
