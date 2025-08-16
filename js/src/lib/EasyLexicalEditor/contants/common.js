/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export const BasicTheme = {
  code: "editor-code",
  heading: {
    h1: "editor-heading-h1",
    h2: "editor-heading-h2",
    h3: "editor-heading-h3",
    h4: "editor-heading-h4",
    h5: "editor-heading-h5",
    h6: "editor-heading-h6",
  },
  image: "editor-image",
  link: "editor-link",
  list: {
    listitem: "editor-listitem",
    nested: {
      listitem: "editor-nested-listitem",
    },
    ol: "editor-list-ol",
    ul: "editor-list-ul",
  },
  ltr: "ltr",
  paragraph: "editor-paragraph",
  placeholder: "editor-placeholder",
  quote: "editor-quote",
  rtl: "rtl",
  text: {
    bold: "editor-text-bold",
    code: "editor-text-code",
    hashtag: "editor-text-hashtag",
    italic: "editor-text-italic",
    overflowed: "editor-text-overflowed",
    strikethrough: "editor-text-strikethrough",
    underline: "editor-text-underline",
    underlineStrikethrough: "editor-text-underlineStrikethrough",
  },
};

// 블럭들이 가지게 될 스타일 지정
// 기존 스타일 프리셋
export const BLOCK_INLINE_STYLES = {
  paragraph: "font-size:16px;line-height:1.5;margin:0;",
  quote:
    "margin:12px 0;padding-left:12px;border-left:4px solid #e5e7eb;color:#475569;font-style:italic;line-height:1.6;",
  h1: "font-size:32px;line-height:1.3;font-weight:700;margin:24px 0 16px;",
  h2: "font-size:28px;line-height:1.35;font-weight:700;margin:20px 0 14px;",
  h3: "font-size:24px;line-height:1.4;font-weight:600;margin:18px 0 12px;",
  h4: "font-size:20px;line-height:1.45;font-weight:600;margin:16px 0 10px;",
  h5: "font-size:18px;line-height:1.5;font-weight:500;margin:14px 0 8px;",
  h6: "font-size:16px;line-height:1.5;font-weight:500;margin:12px 0 6px;",
};

export const TEXT_STYLE_OBJECT = {
  bold: { style: "font-weight: bold", regexp: /font-weight:\s*bold;?/g },
  italic: { style: "font-style: italic", regexp: /font-style:\s*italic;?/g },
  underline: { style: "text-decoration: underline", regexp: /text-decoration:\s*underline;?/g },
  strikethrough: {
    style: "text-decoration: line-through",
    regexp: /text-decoration:\s*line-through;?/g,
  },
};

import { createCommand } from "lexical";

export const INSERT_RESIZABLE_IMAGE_COMMAND = createCommand("INSERT_RESIZABLE_IMAGE");
export const UPDATE_IMAGE_SIZE_COMMAND = createCommand("UPDATE_IMAGE_SIZE");
