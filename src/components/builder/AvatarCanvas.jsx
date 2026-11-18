import { useRef, useState } from "react";
import { X } from "lucide-react";
import { CATEGORY_BASE_WIDTH } from "@/components/builder/outfitLayout";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function AvatarCanvas({ profile, picked, onUpdate, onRemove }) {
  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;
  const stageRef = useRef(null);
  const pointersRef = useRef({});   // pointerId -> { x, y, placedId, target }
  const gestureRef = useRef(null);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const [activeId, setActiveId] = useState(null);

  if (!avatarUrl) {
    return (
      <div className="w-full max-w-[320px] h-[520px] rounded-3xl border-2 border-dashed border-white/15 flex items-center justify-center">
        <p className="text-white/40 text-sm text-center px-6 font-body">
          Set up your avatar first to start building outfits
        </p>
      </div>
    );
  }

  const samePointers = (placedId) =>
    Object.values(pointersRef.current).filter(p => p.placedId === placedId);

  const centerPx = (item) => {
    const rect = stageRef.current.getBoundingClientRect();
    return {
      x: rect.left + (rect.width * (item.x ?? 50)) / 100,
      y: rect.top + (rect.height * (item.y ?? 50)) / 100,
    };
  };

  const startGesture = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    pointersRef.current[e.pointerId] = {
      x: e.clientX, y: e.clientY, placedId: item.placedId, target,
    };
    setActiveId(item.placedId);

    const pts = samePointers(item.placedId);
    if (pts.length === 1) {
      const center = centerPx(item);
      gestureRef.current = {
        placedId: item.placedId,
        mode: e.target?.dataset?.handle ? "handle" : "drag",
        startX: e.clientX,
        startY: e.clientY,
        itemX: item.x ?? 50,
        itemY: item.y ?? 50,
        startScale: item.scale ?? 1,
        center,
        startRadius: Math.hypot(e.clientX - center.x, e.clientY - center.y) || 1,
      };
    } else if (pts.length === 2) {
      const [a, b] = pts;
      gestureRef.current = {
        placedId: item.placedId,
        mode: "pinch",
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startScale: item.scale ?? 1,
      };
    }
  };

  const moveGesture = (e) => {
    const pointer = pointersRef.current[e.pointerId];
    if (!pointer) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;

    const g = gestureRef.current;
    if (!g) return;

    if (g.mode === "drag") {
      const rect = stageRef.current.getBoundingClientRect();
      onUpdate(g.placedId, {
        x: Math.round(clamp(g.itemX + ((e.clientX - g.startX) / rect.width) * 100, -5, 105)),
        y: Math.round(clamp(g.itemY + ((e.clientY - g.startY) / rect.height) * 100, -5, 105)),
      });
      return;
    }

    if (g.mode === "handle") {
      const radius = Math.hypot(e.clientX - g.center.x, e.clientY - g.center.y);
      const next = clamp((g.startScale * radius) / g.startRadius, MIN_SCALE, MAX_SCALE);
      onUpdate(g.placedId, { scale: Number(next.toFixed(2)) });
      return;
    }

    if (g.mode === "pinch") {
      const pts = samePointers(g.placedId);
      if (pts.length < 2) return;
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const next = clamp((g.startScale * dist) / g.startDist, MIN_SCALE, MAX_SCALE);
      onUpdate(g.placedId, { scale: Number(next.toFixed(2)) });
    }
  };

  const endGesture = (e) => {
    const pointer = pointersRef.current[e.pointerId];
    if (pointer?.target) {
      try { pointer.target.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    delete pointersRef.current[e.pointerId];

    const g = gestureRef.current;
    if (!g) return;
    const remaining = samePointers(g.placedId);
    if (!remaining.length) {
      gestureRef.current = null;
      return;
    }
    // One finger left after a pinch — carry on as a drag from where it is.
    if (remaining.length === 1) {
      const item = pickedRef.current.find(p => p.placedId === g.placedId);
      if (item) {
        gestureRef.current = {
          ...g,
          mode: "drag",
          startX: remaining[0].x,
          startY: remaining[0].y,
          itemX: item.x ?? 50,
          itemY: item.y ?? 50,
        };
      }
    }
  };

  return (
    <div className="w-full max-w-[340px] mx-auto flex flex-col items-center gap-3">
      <div
        ref={stageRef}
        onClick={() => setActiveId(null)}
        className="relative w-full rounded-3xl overflow-hidden bg-white select-none"
        style={{ touchAction: "none" }}
      >
        <img src={avatarUrl} alt="avatar" className="block w-full h-auto" draggable={false} />

        {picked.map(item => {
          const img = item.processed_image_url || item.original_image_url;
          const scale = item.scale ?? 1;
          const isActive = activeId === item.placedId;
          return (
            <div
              key={item.placedId}
              onPointerDown={(e) => startGesture(e, item)}
              onPointerMove={moveGesture}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              onClick={(e) => e.stopPropagation()}
              className={`absolute ${isActive ? "cursor-grabbing" : "cursor-grab"}`}
              style={{
                left: `${item.x ?? 50}%`,
                top: `${item.y ?? 50}%`,
                width: `${CATEGORY_BASE_WIDTH[item.category] ?? 30}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: "center",
                zIndex: 10 + (item.z_index || 0),
                touchAction: "none",
                outline: isActive ? "1px dashed rgba(232,184,32,0.9)" : "none",
                outlineOffset: 4,
              }}
            >
              {img ? (
                <img src={img} alt={item.name} className="block w-full h-auto pointer-events-none" draggable={false} />
              ) : (
                <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-3xl pointer-events-none">👗</div>
              )}

              {isActive && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onRemove(item.placedId); }}
                    title="Remove"
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white border-2 border-white flex items-center justify-center"
                    style={{ transform: `scale(${1 / scale})`, transformOrigin: "top right" }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div
                    data-handle="true"
                    onPointerDown={(e) => startGesture(e, item)}
                    onPointerMove={moveGesture}
                    onPointerUp={endGesture}
                    onPointerCancel={endGesture}
                    title="Resize"
                    className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-[#e8b820] border-2 border-white cursor-nwse-resize"
                    style={{ transform: `scale(${1 / scale})`, transformOrigin: "bottom right", touchAction: "none" }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-white/40 text-xs font-body text-center">
        Drag a piece to move it · pinch or drag the corner dot to resize
      </p>
    </div>
  );
}