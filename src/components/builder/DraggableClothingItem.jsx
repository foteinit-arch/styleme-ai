import { useRef, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

export default function DraggableClothingItem({ item, containerRef, onUpdate, onRemove }) {
  const [showDelete, setShowDelete] = useState(false);

  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startItem = useRef({ x: 0, y: 0 });
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1 });
  const longPressTimer = useRef(null);
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const deleteTimer = useRef(null);

  const img = item.processed_image_url || item.original_image_url;
  const size = 100 * (item.scale || 1);

  // Show red X for 3 seconds then auto-hide
  const revealDelete = useCallback(() => {
    setShowDelete(true);
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    deleteTimer.current = setTimeout(() => setShowDelete(false), 3000);
  }, []);

  // Single tap → toggle layer (front / back)
  const toggleLayer = useCallback(() => {
    const currentZ = item.z_index || 1;
    const newZ = currentZ > 10 ? 1 : Date.now();
    onUpdate({ ...item, z_index: newZ });
  }, [item, onUpdate]);

  const handleTap = useCallback(() => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);

    if (tapCount.current >= 3) {
      tapCount.current = 0;
      revealDelete();
      return;
    }

    tapTimer.current = setTimeout(() => {
      if (tapCount.current === 1) toggleLayer();
      tapCount.current = 0;
    }, 320);
  }, [toggleLayer, revealDelete]);

  // ── Pointer helpers ──────────────────────────────────────────────────────
  const getPos = (e) =>
    e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
               : { x: e.clientX,           y: e.clientY           };

  const onDown = (e) => {
    if (e.target.closest("[data-del]")) return;
    hasMoved.current = false;
    dragging.current = true;
    const pos = getPos(e);
    startPos.current = pos;
    startItem.current = { x: item.x, y: item.y };

    // Long-press → reveal delete
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) revealDelete();
    }, 600);

    e.preventDefault();
  };

  const onMove = (e) => {
    if (!dragging.current) return;
    const pos = getPos(e);
    const dx = pos.x - startPos.current.x;
    const dy = pos.y - startPos.current.y;

    if (!hasMoved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasMoved.current = true;
      clearTimeout(longPressTimer.current);
    }

    if (hasMoved.current) {
      onUpdate({ ...item, x: startItem.current.x + dx, y: startItem.current.y + dy });
    }
    e.preventDefault();
  };

  const onUp = (e) => {
    clearTimeout(longPressTimer.current);
    if (!hasMoved.current) handleTap();
    dragging.current = false;
    e.preventDefault();
  };

  // ── Pinch-to-zoom (touch only) ───────────────────────────────────────────
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { active: true, startDist: Math.hypot(dx, dy), startScale: item.scale || 1 };
      dragging.current = false;
      clearTimeout(longPressTimer.current);
      e.preventDefault();
    } else {
      onDown(e);
    }
  };

  const onTouchMove = (e) => {
    if (pinchRef.current.active && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const ratio = Math.hypot(dx, dy) / pinchRef.current.startDist;
      const newScale = Math.max(0.3, Math.min(4, pinchRef.current.startScale * ratio));
      onUpdate({ ...item, scale: newScale });
      e.preventDefault();
    } else if (!pinchRef.current.active) {
      onMove(e);
    }
  };

  const onTouchEnd = (e) => {
    if (pinchRef.current.active) { pinchRef.current.active = false; return; }
    onUp(e);
  };

  // ── Mouse-wheel zoom (desktop) ───────────────────────────────────────────
  const onWheel = (e) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(4, (item.scale || 1) * delta));
    onUpdate({ ...item, scale: newScale });
    e.preventDefault();
  };

  useEffect(() => () => {
    clearTimeout(longPressTimer.current);
    clearTimeout(tapTimer.current);
    clearTimeout(deleteTimer.current);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: item.x - size / 2,
        top: item.y - size / 2,
        width: size,
        height: size,
        zIndex: item.z_index || 1,
        pointerEvents: "none",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <img
        src={img}
        alt=""
        draggable={false}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "auto",
          cursor: "grab",
          transform: `rotate(${item.rotation || 0}deg)`,
          filter: showDelete
            ? "drop-shadow(0 0 8px rgba(239,68,68,0.9))"
            : "none",
          display: "block",
        }}
      />

      {showDelete && (
        <button
          data-del="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(item.placedId); }}
          style={{
            position: "absolute",
            top: -14,
            right: -14,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "#ef4444",
            color: "white",
            border: "2px solid white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 999999,
            pointerEvents: "auto",
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
