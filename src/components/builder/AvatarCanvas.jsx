import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CATEGORY_BASE_WIDTH } from "@/components/builder/outfitLayout";
import { measureImage } from "@/components/builder/autoFit";

const MIN_SCALE = 0.1;
const MAX_SCALE = 12;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function AvatarCanvas({ profile, picked, onUpdate, onRemove }) {
  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;
  const stageRef = useRef(null);
  const pointersRef = useRef({});   // pointerId -> { x, y, placedId, target }
  const gestureRef = useRef(null);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const [activeId, setActiveId] = useState(null);
  const [avatarAspect, setAvatarAspect] = useState(null);
  // Visible bounds of each garment cutout, so the handles sit on the clothes and
  // never out in the transparent margin of the image.
  const [boxes, setBoxes] = useState({});
  const measuredRef = useRef(new Set());

  useEffect(() => {
    if (!avatarUrl) return;
    const img = new Image();
    img.onload = () => setAvatarAspect(img.naturalWidth / img.naturalHeight || 1);
    img.src = avatarUrl;
  }, [avatarUrl]);

  useEffect(() => {
    const urls = Array.from(new Set(
      picked.map(p => p.processed_image_url || p.original_image_url).filter(Boolean)
    ));
    urls.forEach(async (url) => {
      if (measuredRef.current.has(url)) return;
      measuredRef.current.add(url);
      const m = await measureImage(url).catch(() => null);
      if (!m) return;
      setBoxes(prev => ({
        ...prev,
        [url]: { box: m.content, ratio: (m.height || 1) / (m.width || 1) },
      }));
    });
  }, [picked]);

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

  // Where the visible garment sits on the stage, in percentages of the stage.
  const contentRect = (item) => {
    if (!item) return null;
    const url = item.processed_image_url || item.original_image_url;
    const measured = boxes[url];
    const box = measured?.box || { left: 0, top: 0, right: 1, bottom: 1 };
    const ratio = measured?.ratio ?? 1;
    const baseWidth = CATEGORY_BASE_WIDTH[item.category] ?? 30;
    const scale = item.scale ?? 1;
    const stretch = item.stretch ?? 1;
    const frameW = baseWidth * scale;
    const frameH = frameW * (avatarAspect || 0.66) * ratio;
    const width = (box.right - box.left) * frameW;
    const height = (box.bottom - box.top) * frameH * stretch;
    const centerX = (item.x ?? 50) + (0.5 - (box.left + box.right) / 2) * frameW;
    const centerY = (item.y ?? 50) + (0.5 - (box.top + box.bottom) / 2) * frameH * stretch;
    const left = clamp(centerX - width / 2, 0, 100);
    const top = clamp(centerY - height / 2, 0, 100);
    return {
      left,
      top,
      width: Math.min(width, 100 - left),
      height: Math.min(height, 100 - top),
    };
  };

  const activeItem = picked.find(p => p.placedId === activeId) || null;
  const activeRect = contentRect(activeItem);

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
          const stretch = item.stretch ?? 1;
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
                transform: `translate(-50%, -50%) scale(${scale}) scaleY(${stretch})`,
                transformOrigin: "center",
                zIndex: 10 + (item.z_index || 0),
                touchAction: "none",
              }}
            >
              {img ? (
                <img src={img} alt={item.name} className="block w-full h-auto pointer-events-none" draggable={false} />
              ) : (
                <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-3xl pointer-events-none">👗</div>
              )}
            </div>
          );
        })}

        {/* Handles for the selected piece, pinned to the visible garment so they
            always stay inside the builder. */}
        {activeItem && activeRect && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${activeRect.left}%`,
              top: `${activeRect.top}%`,
              width: `${activeRect.width}%`,
              height: `${activeRect.height}%`,
              zIndex: 60,
            }}
          >
            <div className="absolute inset-0 rounded-md border border-dashed border-[#e8b820]/70" />
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onRemove(activeItem.placedId); }}
              title="Remove"
              className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white border-2 border-white flex items-center justify-center pointer-events-auto"
            >
              <X className="w-3 h-3" />
            </button>
            <div
              data-handle="true"
              onPointerDown={(e) => startGesture(e, activeItem)}
              onPointerMove={moveGesture}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              title="Resize"
              className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-[#e8b820] border-2 border-white cursor-nwse-resize pointer-events-auto"
              style={{ touchAction: "none" }}
            />
          </div>
        )}
      </div>

      <p className="text-white/40 text-xs font-body text-center">
        Drag a piece to move it · pinch or drag the corner dot to resize
      </p>
    </div>
  );
}