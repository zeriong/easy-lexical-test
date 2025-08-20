// tagName → key 매핑
import { BLOCK_INLINE_STYLES } from "../contants/common.js";
import { isHTMLElement } from "lexical";
import DOMPurify from "dompurify";

const TAG_STYLE_KEY_MAP = {
  P: "paragraph",
  BLOCKQUOTE: "quote",
  H1: "h1",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  H5: "h5",
  H6: "h6",
};

// * 안전한 스타일만을 남김
export const whitelistStylesExportDOM = (editor, target) => {
  const output = target.exportDOM(editor);
  if (output && isHTMLElement(output.element)) {
    // class/dir 제거
    output.element.removeAttribute("class");
    if (output.element.getAttribute("dir") === "ltr") {
      output.element.removeAttribute("dir");
    }

    // 노드에 저장된 style 우선
    let nodeStyle = target.getStyle?.();

    // style이 비어있다면 block preset에서 가져오기
    if (!nodeStyle) {
      const key = TAG_STYLE_KEY_MAP[output.element.tagName];
      if (key && BLOCK_INLINE_STYLES[key]) {
        nodeStyle = BLOCK_INLINE_STYLES[key];
      }
    }

    if (nodeStyle) {
      // style sanitize
      const sanitized = DOMPurify.sanitize(
        `<${output.element.tagName} style="${nodeStyle}"></${output.element.tagName}>`,
        { ALLOWED_ATTR: ["style"], ALLOWED_TAGS: [output.element.tagName.toLowerCase()] },
      );

      const match = sanitized.match(/style="([^"]*)"/i);
      if (match) {
        output.element.setAttribute("style", match[1]);
      } else {
        output.element.removeAttribute("style");
      }
    }
  }
  return output;
};
