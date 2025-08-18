import {
  $createNodeSelection,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
} from "lexical";
import { $createImageNode } from "../../nodes/ImageNode.js";
import { useEffect, useRef } from "react";
import {
  INSERT_RESIZABLE_IMAGE_COMMAND,
  UPDATE_IMAGE_SIZE_COMMAND,
} from "../../contants/common.js";
import { $createResizableImageNode, ResizableImageNode } from "../../nodes/ResizableImageNode.jsx";

export default function ImageUploadToolbar({ editor }) {
  const fileInputRef = useRef(null);

  // 이미지 업로드
  const onPickImage = () => fileInputRef.current && fileInputRef.current.click();

  // ! ============ props로 [ preUploader => src ] 받아서 있다면 createObjectURL과 분기할 수 있도록 구성 // todo
  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // * ======== 여기부터 분기 태워서 처리
    const url = URL.createObjectURL(file);

    // ? 기본 로직
    // editor.update(() => {
    //   const selection = $getSelection();
    //   const imageNode = $createImageNode(url, file.name);
    //
    //   if ($isRangeSelection(selection)) {
    //     const top = selection.anchor.getNode().getTopLevelElementOrThrow();
    //     top.insertAfter(imageNode);
    //     imageNode.selectNext();
    //   } else {
    //     // selection 없으면 root 끝에 추가
    //     const root = $getRoot();
    //     root.append(imageNode);
    //   }
    // });

    // ResizableImageNode 삽입 (DecoratorNode)
    editor.dispatchCommand(INSERT_RESIZABLE_IMAGE_COMMAND, {
      src: url,
      alt: file.name,
      // 아래 옵션은 ResizableImage props에 그대로 전달됨
      // width: 320, // initialWidth
      height: undefined, // initialHeight (비율 계산되게 비워둠)
      // minWidth: 50,
      // minHeight: 50,
      // maxWidth: 800, // 부모영역 제한과 함께 사용 가능
      maxHeight: Infinity,
      lockAspectByDefault: false,
      keepWithinParent: true,
    });

    // 실제 운영에선 서버 업로드 후 서버 URL로 교체 권장
    // URL.revokeObjectURL(url); // 표시 직후 revoke하면 이미지가 안 보일 수 있으니 적절한 타이밍에
    e.target.value = "";
  };

  useEffect(() => {
    return () => {
      // ? insert
      editor.registerCommand(
        INSERT_RESIZABLE_IMAGE_COMMAND,
        (payload) => {
          editor.update(() => {
            const node = $createResizableImageNode(payload);
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const top = selection.anchor.getNode().getTopLevelElementOrThrow();
              top.insertAfter(node);
              node.selectNext();
            } else {
              $getRoot().append(node);
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      );

      // ? resize & update
      editor.registerCommand(
        UPDATE_IMAGE_SIZE_COMMAND,
        ({ key, width, height }) => {
          editor.update(() => {
            const n = $getNodeByKey(key);
            if (n && n instanceof ResizableImageNode) {
              n.setSize(width, height);
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      );

      // ? click시 selection 등록 커맨드
      editor.registerCommand(
        CLICK_COMMAND,
        (event) => {
          const target = event.target;
          if (target && target.closest && target.closest(".resizable-image-class")) {
            const imageElem = target.closest(".resizable-image-class");
            const nodeKey = imageElem?.getAttribute("data-lexical-node-key");
            if (nodeKey) {
              editor.update(() => {
                const currentSelection = $getSelection();

                // 이미 같은 노드가 선택되어 있다면 그대로 유지
                if (
                  currentSelection &&
                  currentSelection.constructor.name === "NodeSelection" &&
                  currentSelection.has(nodeKey)
                ) {
                  return; // 재설정 안 함
                }

                // 새로 선택
                const selection = $createNodeSelection();
                selection.add(nodeKey);
                $setSelection(selection);
              });
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      );
    };
  }, [editor]);

  return (
    <>
      <button
        onClick={onPickImage}
        className="toolbar-item spaced"
        aria-label="Insert Image"
        title="Insert image"
      >
        <i className="format image-upload" />
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
    </>
  );
}
