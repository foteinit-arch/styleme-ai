import { useRef, useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

export default function DraggableClothingItem({ item, containerRef, onUpdate, onRemove }) {
  const [selected, setSelected] = useState(false);
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startItem = useRef({ x: 0, y: 0 });
  const itemRef = useRef(null);
  // Pinch-to-zoom tracking
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1 });

  const img = item.processed_image_url || item.original_image_url;
  const size = 100 * (item.scale || 1);

  const handleMouseDown = (e) => {
    if (e.target.closest("[data-control]")) return;
    e.preventDefault();
    setSelected(true);
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startItem.current = { x: item.x, y: item.y };
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const container = containerRef.current;
    if (!container) return;
    const maxX = container.clientWidth - size;
    const maxY = container.clientHeight - size;
    const newX = Math.max(0, Math.min(maxX, startItem.current.x + dx));
    const newY = Math.max(0, Math.min(maxY, startItem.current.y + dy));
    onUpdate(item.placedId, { x: newX, y: newY });
  }, [item.placedId, item.x, item.y, size, containerRef, onUpdate]);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (itemRef.current && !itemRef.current.contains(e.target)) {
        setSelected(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Touch support
  const handleTouchStart = (e) => {
    if (e.target.closest("[data-control]")) return;
    e.preventDefault();
    setSelected(true);
    const touch = e.touches[0];
    dragging.current = true;
    startPos.current = { x: touch.clientX, y: touch.clientY };
    startItem.current = { x: item.x, y: item.y };
  };

  const handleTouchMove = useCallback((e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - startPos.current.x;
    const dy = touch.clientY - startPos.current.y;
    const container = containerRef.current;
    if (!container) return;
    const newX = Math.max(0, Math.min(container.clientWidth - size, startItem.current.x + dx));
    const newY = Math.max(0, Math.min(container.clientHeight - size, startItem.current.y + dy));
    onUpdate(item.placedId, { x: newX, y: newY });
  }, [item.placedId, size, containerRef, onUpdate]);

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchRef.current.active = false;
    }
    if (e.touches.length === 0) {
      dragging.current = false;
    }
  };

  const handleTouchStartWithPinch = (e) => {
    if (e.touches.length === 2) {
      // Start pinch
      e.preventDefault();
      dragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        active: true,
        startDist: Math.sqrt(dx * dx + dy * dy),
        startScale: item.scale || 1,
      };
      setSelected(true);
    } else {
      handleTouchStart(e);
    }
  };

  const handleTouchMoveWithPinch = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(0.3, Math.min(3, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      onUpdate(item.placedId, { scale: newScale });
    } else {
      handleTouchMove(e);
    }
  }, [handleTouchMove, item.placedId, item.scale, onUpdate]);

  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;
    el.addEventListener("touchmove", handleTouchMoveWithPinch, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMoveWithPinch);
  }, [handleTouchMoveWithPinch]);

  const scaleBy = (delta) => onUpdate(item.placedId, { scale: Math.max(0.3, Math.min(3, (item.scale || 1) + delta)) });
  const rotate = () => onUpdate(item.placedId, { rotation: ((item.rotation || 0) + 45) % 360 });

  return (
    <div
      ref={itemRef}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{
        left: item.x,
        top: item.y,
        width: size,
        height: size,
        zIndex: (item.z_index || 0) + 10,
        transform: `rotate(${item.rotation || 0}deg)`,
        touchAction: "none",
        backgroundColor: 'transparent',
        mixBlendMode: 'multiply',
        outline: selected ? '2px solid #fb7185' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStartWithPinch}
      onTouchEnd={handleTouchEnd}
      onClick={() => setSelected(s => !s)}
    >
      {img ? (
        <img src={img} alt={item.name} className="w-full h-full object-contain pointer-events-none" style={{ mixBlendMode: 'darken', backgroundColor: 'transparent' }} draggable={false} />
      ) : (
        <div className="w-full h-full bg-transparent rounded-lg flex items-center justify-center text-2xl">👗</div>
      )}

      {/* Controls */}
      {selected && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-full shadow-lg px-2 py-1 border border-rose-100" data-control="true">
          <button data-control="true" onClick={() => scaleBy(-0.15)} className="p-1 rounded-full hover:bg-rose-50">
            <ZoomOut className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button data-control="true" onClick={() => scaleBy(0.15)} className="p-1 rounded-full hover:bg-rose-50">
            <ZoomIn className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button data-control="true" onClick={rotate} className="p-1 rounded-full hover:bg-rose-50">
            <RotateCw className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button data-control="true" onClick={() => onRemove(item.placedId)} className="p-1 rounded-full hover:bg-red-50">
            <X className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}