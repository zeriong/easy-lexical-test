import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * ResizableImage — pure React, no deps
 * - Drag corners/edges to resize an <img>
 * - Shift = lock aspect ratio while resizing
 * - Stays within parent by default
 * - Touch + mouse via Pointer Events
 * - requestAnimationFrame for smoothness
 */

export default function ResizableImage({
  src,
  alt,
  initialWidth = 300,
  initialHeight,
  minWidth = 50,
  minHeight = 50,
  maxWidth = Infinity,
  maxHeight = Infinity,
  lockAspectByDefault = false,
  keepWithinParent = true,
  onResize,
  onResizeEnd,
}) {
  // handle point가 가지게 될 className
  const HANDLER_POINT_CLASS_NAME = "easy_lexical_image_handle_point";

  // image를 비교하기 위해 id 저장
  const imgIdRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const frameRef = useRef(null);

  // Resize drag logic state
  const dragState = useRef(null);

  // Track modifier flag
  const isShiftPressedRef = useRef(false);
  // 기존의 이미지가 가지고 있던 ratio
  const [naturalRatio, setNaturalRatio] = useState(null);
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight ?? Math.round(initialWidth * 0.666),
  });
  // resizable 여부 state
  const [isResizable, setIsResizable] = useState(false);

  // ? 이미지 클릭 시 고유 className과 일치한 경우
  const resizableSwitch = (event) => {
    if (event.target.className === HANDLER_POINT_CLASS_NAME) {
      return;
    }

    // 아이디가 동일한 경우 resizable 상태가 됨
    if (imgIdRef.current === event.target.id) {
      setIsResizable(true);
    } else {
      setIsResizable(false);
    }
  };

  // ? 사이즈 보정 함수
  const clampSize = useCallback(
    (w, h) => {
      const parent = containerRef.current?.getBoundingClientRect();
      const framePad = 0; // we can expand if we add borders

      let maxW = maxWidth;
      let maxH = maxHeight;

      if (keepWithinParent && parent) {
        maxW = Math.min(maxW, parent.width - framePad);
        maxH = Math.min(maxH, parent.height - framePad);
      }

      const width = Math.min(Math.max(w, minWidth), maxW);
      const height = Math.min(Math.max(h, minHeight), maxH);
      return { width, height };
    },
    [keepWithinParent, maxWidth, maxHeight, minWidth, minHeight],
  );

  // ? 최종 resize 적용 함수
  const applyResize = useCallback(
    (handle, dx, dy, lockAspect) => {
      const current = dragState.current;
      if (!current) return;

      let { startW, startH, aspect } = current;
      let w = startW;
      let h = startH;

      // Determine change by handle
      if (handle.includes("e")) w = startW + dx;
      if (handle.includes("w")) w = startW - dx;
      if (handle.includes("s")) h = startH + dy;
      if (handle.includes("n")) h = startH - dy;

      if (lockAspect && (aspect ?? naturalRatio)) {
        const ratio = aspect ?? naturalRatio;
        // Fit to whichever delta is more dominant
        if (handle === "e" || handle === "w") {
          h = w / ratio;
        } else if (handle === "n" || handle === "s") {
          w = h * ratio;
        } else {
          // corner: choose direction preserving the larger absolute scale change
          const byWidth = { width: w, height: w / ratio };
          const byHeight = { width: h * ratio, height: h };
          // pick result that is closer to original drag intent
          const chooseByWidth = Math.abs(w - startW) >= Math.abs(h - startH);
          ({ width: w, height: h } = chooseByWidth ? byWidth : byHeight);
        }
      }

      const clamped = clampSize(w, h);
      setSize(clamped);
      onResize?.(clamped);
    },
    [clampSize, naturalRatio, onResize],
  );

  // ? resize point mouseDown 함수
  const onPointerDown = useCallback(
    (e) => {
      const handle = e.currentTarget.dataset.handle || "se";
      const frame = frameRef.current;
      const startRect = frame.getBoundingClientRect();

      frame.setPointerCapture(e.pointerId);
      document.body.style.userSelect = "none"; // prevent text selection

      dragState.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: startRect.width,
        startH: startRect.height,
        aspect: naturalRatio,
      };

      // ! 이동 함수
      const move = (ev) => {
        const current = dragState.current;
        if (!current) return;
        const dx = ev.clientX - current.startX;
        const dy = ev.clientY - current.startY;

        // rAF throttle ( animation을 활용하여 Layout 과정을 건너뛰고 composite에서 해결 )
        if (current.raf) cancelAnimationFrame(current.raf);
        current.raf = requestAnimationFrame(() => {
          applyResize(current.handle, dx, dy, isShiftPressedRef.current || lockAspectByDefault);
        });
      };

      // ! 마우스 업
      const up = () => {
        const current = dragState.current;
        if (!current) return;
        if (current.raf) cancelAnimationFrame(current.raf);
        dragState.current = null;
        document.body.style.userSelect = "";
        onResizeEnd?.(size);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };

      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerup", up, { once: true });
      window.addEventListener("pointercancel", up, { once: true });
    },
    [applyResize, lockAspectByDefault, naturalRatio, onResizeEnd, size],
  );

  // * init effect
  useEffect(() => {
    // ! 기본 keyDown/up 이벤트 등록
    const onKeyDown = (e) => {
      if (e.key === "Shift") isShiftPressedRef.current = true;
    };
    const onKeyUp = (e) => {
      if (e.key === "Shift") isShiftPressedRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown, { passive: true });
    window.addEventListener("keyup", onKeyUp, { passive: true });

    window.addEventListener("pointerdown", resizableSwitch, { passive: true });

    // ! document 기반으로 같은 className이 있는지 재귀적으로 확인하며 없는 고유 클래스 네임을 생성하여 적용
    function createUniqueClassName() {
      const newId = `easy-lexical-image-wrapper_${Date.now() + Math.random()}`;
      const isExists = document.getElementById(newId);
      if (!isExists) {
        // id 저장( 이미지를 개별로 핸들링 가능하도록 )
        imgIdRef.current = newId;
        imgRef.current.id = newId;
        return;
      }
      createUniqueClassName();
    }
    // id가 혹시나 중복된다면 재귀적으로 없을 때까지 만듦
    createUniqueClassName();

    // cleanup
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerdown", resizableSwitch);
    };
  }, []);

  // * Get natural image ratio when loaded
  useLayoutEffect(() => {
    const img = new Image();
    img.src = src;
    img
      .decode?.()
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        const ratio =
          img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null;
        setNaturalRatio(ratio);
        if (!initialHeight && ratio) {
          setSize((s) => ({ width: s.width, height: Math.round(s.width / ratio) }));
        }
      });
  }, [src]);

  return (
    <div
      ref={frameRef}
      style={{
        ...styles.frame,
        ...(isResizable ? styles.resizableFrame : {}),
        width: size.width,
        height: size.height,
      }}
    >
      <img ref={imgRef} src={src} alt={alt} draggable={false} style={styles.img} />

      {/* 8 handles */}
      {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((h) => (
        <div
          key={h}
          data-handle={h}
          onPointerDown={onPointerDown}
          style={isResizable ? { ...styles.handleWrapper, ...handlePos[h] } : {}}
          title={`${h.toUpperCase()} resize`}
          className={HANDLER_POINT_CLASS_NAME}
        >
          <div style={isResizable ? { ...styles.handle } : {}} />
        </div>
      ))}
    </div>
  );
}

/** Inline Styles (no Tailwind dependency) */
const styles = {
  h1: { fontSize: 22, margin: 0, marginBottom: 12, fontWeight: 700 },
  note: { opacity: 0.9, marginBottom: 16, lineHeight: 1.6 },
  stage: {
    width: "100%",
    height: 480,
    background: "#0b1220",
    border: "1px solid #1f2a44",
    borderRadius: 12,
    padding: 16,
    display: "grid",
    placeItems: "center",
  },
  container: {
    width: "100%",
    height: "100%",
    position: "relative",
    display: "grid",
    placeItems: "center",
  },
  frame: {
    maxWidth: "100%",
    position: "relative",
    boxSizing: "border-box",
    cursor: "pointer",
    touchAction: "none", // allow pinch/drag without browser gestures breaking it
  },
  resizableFrame: {
    border: "1px dashed #64748b",
  },
  img: {
    width: "100%",
    height: "100%",
    display: "block",
    userSelect: "none",
  },
  handleWrapper: {
    padding: "10px",
    position: "absolute",
    cursor: "nwse-resize",
    touchAction: "none",
  },
  handle: {
    width: 8,
    height: 8,
    background: "#22d3ee",
  },
};

const handlePos = {
  n: { top: -15, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
  s: { bottom: -15, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
  e: { right: -15, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
  w: { left: -15, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
  ne: { right: -15, top: -15, cursor: "nesw-resize" },
  nw: { left: -15, top: -15, cursor: "nwse-resize" },
  se: { right: -15, bottom: -15, cursor: "nwse-resize" },
  sw: { left: -15, bottom: -15, cursor: "nesw-resize" },
};
