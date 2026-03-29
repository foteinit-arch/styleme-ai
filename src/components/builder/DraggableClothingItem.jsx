import { useRef, useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

export default function DraggableClothingItem({ item, onUpdate, onRemove }) {
  const [showControls, setShowControls] = useState(false);

  const dragging    = useRef(false);
  const hasMoved    = useRef(false);
  const startPos    = useRef({ x: 0, y: 0 });
  const startItem   = useRef({ x: 0, y: 0 });
  const pinchRef    = useRef({ active: false, startDist: 0, startScale: 1 });
  const longTimer   = useRef(null);
  const hideTimer   = useRef(null);
  const imgRef      = useRef(null);

  // Keep latest values in refs so document-level listeners never go stale
  const itemRef     = useRef(item);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { itemRef.current = item; },     [item]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const img  = item.processed_image_url || item.original_image_url;
  const size = 100 * (item.scale || 1);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const revealControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const bumpHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const toggleLayer = useCallback(() => {
    const cur = itemRef.current;
    onUpdateRef.current({ ...cur, z_index: (cur.z_index || 1) > 10 ? 1 : Date.now() });
  }, []);

  const scaleBy = useCallback((factor) => {
    const cur = itemRef.current;
    const newScale = Math.max(0.3, Math.min(4, (cur.scale || 1) * factor));
    onUpdateRef.current({ ...cur, scale: newScale });
    bumpHide();
  }, [bumpHide]);

  // ── Non-passive wheel zoom (desktop) ─────────────────────────────────────
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const handler = (e) => { e.preventDefault(); scaleBy(e.deltaY > 0 ? 0.92 : 1.08); };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [scaleBy]);

  // ── Document-level mouse drag ─────────────────────────────────────────────
  const getPos = (e) =>
    e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
               : { x: e.clientX,           y: e.clientY           };

  const onPointerDown = useCallback((e) => {
    if (e.target.closest("[data-ctrl]")) return;
    hasMoved.current  = false;
    dragging.current  = true;
    const pos         = getPos(e);
    startPos.current  = pos;
    startItem.current = { x: itemRef.current.x, y: itemRef.current.y };

    longTimer.current = setTimeout(() => {
      if (!hasMoved.current) revealControls();
    }, 600);

    e.preventDefault();
  }, [revealControls]);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current || pinchRef.current.active) return;
    const pos = getPos(e);
    const dx  = pos.x - startPos.current.x;
    const dy  = pos.y - startPos.current.y;

    if (!hasMoved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasMoved.current = true;
      clearTimeout(longTimer.current);
    }

    if (hasMoved.current) {
      const cur = itemRef.current;
      onUpdateRef.current({ ...cur, x: startItem.current.x + dx, y: startItem.current.y + dy });
    }
    e.preventDefault();
  }, []);

  const onPointerUp = useCallback(() => {
    clearTimeout(longTimer.current);
    if (!hasMoved.current && dragging.current) toggleLayer();
    dragging.current = false;
  }, [toggleLayer]);

  // Attach document listeners so drag works even when mouse leaves the image
  useEffect(() => {
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup",   onPointerUp);
    return () => {
      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseup",   onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  // ── Touch (pinch-to-zoom) ─────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { active: true, startDist: Math.hypot(dx, dy), startScale: itemRef.current.scale || 1 };
      dragging.current = false;
      clearTimeout(longTimer.current);
      e.preventDefault();
    } else {
      onPointerDown(e);
    }
  }, [onPointerDown]);

  const onTouchMove = useCallback((e) => {
    if (pinchRef.current.active && e.touches.length === 2) {
      const dx    = e.touches[0].clientX - e.touches[1].clientX;
      const dy    = e.touches[0].clientY - e.touches[1].clientY;
      const ratio = Math.hypot(dx, dy) / pinchRef.current.startDist;
      const s     = Math.max(0.3, Math.min(4, pinchRef.current.startScale * ratio));
      onUpdateRef.current({ ...itemRef.current, scale: s });
      e.preventDefault();
    } else if (!pinchRef.current.active) {
      onPointerMove(e);
    }
  }, [onPointerMove]);

  const onTouchEnd = useCallback((e) => {
    if (pinchRef.current.active) { pinchRef.current.active = false; return; }
    onPointerUp(e);
  }, [onPointerUp]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(longTimer.current);
    clearTimeout(hideTimer.current);
  }, []);

  return (
    <div
      style={{
        position:      "absolute",
        left:          item.x - size / 2,
        top:           item.y - size / 2,
        width:         size,
        height:        size,
        zIndex:        item.z_index || 1,
        pointerEvents: "none",
        userSelect:    "none",
        touchAction:   "none",
      }}
    >
      <img
        ref={imgRef}
        src={img}
        alt=""
        draggable={false}
        onMouseDown={onPointerDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width:         "100%",
          height:        "100%",
          objectFit:     "contain",
          pointerEvents: "auto",
          cursor:        "grab",
          transform:     `rotate(${item.rotation || 0}deg)`,
          filter:        showControls ? "drop-shadow(0 0 8px rgba(249,115,22,0.8))" : "none",
          display:       "block",
        }}
      />

      {/* Controls: appear on long-press (600ms hold), auto-hide after 4s */}
      {showControls && (
        <div
          data-ctrl="true"
          style={{
            position:      "absolute",
            top:           -20,
            left:          "50%",
            transform:     "translateX(-50%)",
            display:       "flex",
            gap:           8,
            zIndex:        999999,
            pointerEvents: "auto",
            touchAction:   "none",
          }}
        >
          <button data-ctrl="true" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
            onClick={() => scaleBy(0.85)} style={btn("#111")} title="Smaller">
            <ZoomOut size={13} />
          </button>
          <button data-ctrl="true" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
            onClick={() => onRemove(item.placedId)} style={btn("#ef4444")} title="Remove">
            <X size={13} />
          </button>
          <button data-ctrl="true" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
            onClick={() => scaleBy(1.15)} style={btn("#111")} title="Bigger">
            <ZoomIn size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function btn(bg) {
  return {
    width: 28, height: 28, borderRadius: "50%",
    background: bg, color: "white",
    border: "2px solid white",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  };
}
