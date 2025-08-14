/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const MIN_ALLOWED_FONT_SIZE = 8;
const MAX_ALLOWED_FONT_SIZE = 72;

// 폰트사이즈 파서
export function parseAllowedFontSize(input) {
  const match = input.match(/^(\d+(?:\.\d+)?)px$/);
  if (match) {
    const n = Number(match[1]);
    if (n >= MIN_ALLOWED_FONT_SIZE && n <= MAX_ALLOWED_FONT_SIZE) {
      return input;
    }
  }
  return "";
}

// 컬러 파서
export function parseAllowedColor(input) {
  return /^rgb\(\d+, \d+, \d+\)$/.test(input) ? input : "";
}

// 문자열 style → 객체 변환 함수
export function styleStringToObject(styleString) {
  if (!styleString) return {};
  return styleString
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .reduce((acc, rule) => {
      const [prop, value] = rule.split(":");
      if (prop && value) {
        acc[prop.trim()] = value.trim();
      }
      return acc;
    }, {});
}
