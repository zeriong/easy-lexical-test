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
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const frameRef = useRef(null);

  const [naturalRatio, setNaturalRatio] = useState(null);
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight ?? Math.round(initialWidth * 0.666),
  });

  // Track modifier keys
  const shiftPressedRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Shift") shiftPressedRef.current = true;
    };
    const onKeyUp = (e) => {
      if (e.key === "Shift") shiftPressedRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown, { passive: true });
    window.addEventListener("keyup", onKeyUp, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Get natural image ratio when loaded
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

  // Clamp helper with parent bounds
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

  // Resize logic
  const dragState = useRef(null);

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

      const move = (ev) => {
        const current = dragState.current;
        if (!current) return;
        const dx = ev.clientX - current.startX;
        const dy = ev.clientY - current.startY;

        // rAF throttle
        if (current.raf) cancelAnimationFrame(current.raf);
        current.raf = requestAnimationFrame(() => {
          applyResize(current.handle, dx, dy, shiftPressedRef.current || lockAspectByDefault);
        });
      };

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

  return (
    <div ref={containerRef} style={styles.container}>
      <div ref={frameRef} style={{ ...styles.frame, width: size.width, height: size.height }}>
        <img ref={imgRef} src={src} alt={alt} draggable={false} style={styles.img} />

        {/* 8 handles */}
        {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((h) => (
          <div
            key={h}
            data-handle={h}
            onPointerDown={onPointerDown}
            style={{ ...styles.handle, ...handlePos[h] }}
            title={`${h.toUpperCase()} resize`}
          />
        ))}
      </div>
    </div>
  );
}

/** Inline Styles (no Tailwind dependency) */
const styles = {
  page: {
    minHeight: "100vh",
    padding: 24,
    background: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  },
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
    position: "relative",
    boxSizing: "border-box",
    border: "1px dashed #64748b",
    borderRadius: 8,
    overflow: "hidden",
    touchAction: "none", // allow pinch/drag without browser gestures breaking it
    background: "#0b1220",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    userSelect: "none",
    pointerEvents: "none",
  },
  handle: {
    position: "absolute",
    width: 12,
    height: 12,
    background: "#22d3ee",
    border: "2px solid #0b1220",
    borderRadius: 999,
    boxShadow: "0 0 0 2px rgba(34,211,238,0.3)",
    cursor: "nwse-resize",
    // increase hit area without affecting visuals
    touchAction: "none",
  },
};

const handlePos = {
  n: { top: -6, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
  s: { bottom: -6, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" },
  e: { right: -6, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
  w: { left: -6, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
  ne: { right: -6, top: -6, cursor: "nesw-resize" },
  nw: { left: -6, top: -6, cursor: "nwse-resize" },
  se: { right: -6, bottom: -6, cursor: "nwse-resize" },
  sw: { left: -6, bottom: -6, cursor: "nesw-resize" },
};
