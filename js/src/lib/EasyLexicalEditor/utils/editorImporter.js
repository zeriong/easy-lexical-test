// editor config 쪽
import DOMPurify from "dompurify";
import { TextNode, $isTextNode } from "lexical";

function sanitizeStyle(style = "") {
  // 필요한 속성만 남기고 간단히 정제
  const allowed =
    /^(color|background-color|font-weight|font-style|text-decoration(-line)?|font-size|font-family|letter-spacing|line-height|white-space|word-break|text-transform|vertical-align)\s*:/i;
  return style
    .split(";")
    .map((s) => s.trim())
    .filter((s) => allowed.test(s))
    .join("; ");
}

function wrapImporter(orig) {
  return (el) => {
    const importer = orig ? orig(el) : { conversion: () => ({ forChild: (c) => c }) };
    if (!importer) return null;
    return {
      ...importer,
      conversion: (element) => {
        const res = importer.conversion(element);
        if (!res) return res;

        const raw = element.getAttribute?.("style") || "";
        // DOMPurify로 style만 통과
        const safe = sanitizeStyle(
          DOMPurify.sanitize(`<span style="${raw}"></span>`, {
            ALLOWED_TAGS: ["span"],
            ALLOWED_ATTR: ["style"],
          }).match(/style="([^"]*)"/i)?.[1] || "",
        );
        if (!safe || !res.forChild) return res;

        return {
          ...res,
          forChild: (child, parent) => {
            const out = res.forChild(child, parent);
            if ($isTextNode(out)) {
              const prev = out.getStyle?.() || "";
              const merged = [prev, safe].filter(Boolean).join("; ");
              out.setStyle(merged);
            }
            return out;
          },
        };
      },
    };
  };
}

export function buildInlineStyleImportMap() {
  const base = TextNode.importDOM ? TextNode.importDOM() : {};
  const tags = [
    "span",
    "font",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "strike",
    "mark",
    "code",
    "sub",
    "sup",
  ];
  const map = {};
  tags.forEach((t) => (map[t] = wrapImporter(base?.[t])));
  return map;
}
