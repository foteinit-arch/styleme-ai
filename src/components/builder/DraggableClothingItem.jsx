import { useRef, useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, ChevronUp, ChevronDown } from "lucide-react";

export default function DraggableClothingItem({ item, containerRef, onUpdate, onRemove }) {
  const [selected, setSelected] = useState(false);
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startItem = useRef({ x: 0, y: 0 });
  const itemRef = useRef(null);
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
    onUpdate(item.placedId, {
      x: startItem.current.x + dx,
      y: startItem.current.y + dy,
    });
  }, [item.placedId, onUpdate]);

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
    onUpdate(item.placedId, {
      x: startItem.current.x + dx,
      y: startItem.current.y + dy,
    });
  }, [item.placedId, onUpdate]);

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) pinchRef.current.active = false;
    if (e.touches.length === 0) dragging.current = false;
  };

  const handleTouchStartWithPinch = (e) => {
    if (e.touches.length === 2) {
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
      const newScale = Math.max(0.3, Math.min(5, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      onUpdate(item.placedId, { scale: newScale });
    } else {
      handleTouchMove(e);
    }
  }, [handleTouchMove, item.placedId, onUpdate]);

  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;
    el.addEventListener("touchmove", handleTouchMoveWithPinch, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMoveWithPinch);
  }, [handleTouchMoveWithPinch]);

  const rotate = () => onUpdate(item.placedId, { rotation: ((item.rotation || 0) + 45) % 360 });
  const scaleBy = (delta) => onUpdate(item.placedId, { scale: Math.max(0.3, Math.min(5, (item.scale || 1) + delta)) });

  return (
    <div
      ref={itemRef}
      className="absolute"
      style={{
        left: item.x - size / 2,
        top: item.y - size / 2,
        width: size,
        height: size,
        zIndex: (item.z_index || 0) + 10,
        transform: `rotate(${item.rotation || 0}deg)`,
        touchAction: "none",
        pointerEvents: 'none',
      }}
    >
      {img ? (
        <img
          src={img}
          alt={item.name}
          className="w-full h-full object-contain"
          style={{ 
           pointerEvents: 'auto', 
           cursor: 'grab',
          filter: selected ? 'drop-shadow(0 0 4px #fb7185)' : 'none'
        }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStartWithPinch}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => { if (e.target.closest("[data-control]")) return; setSelected(true); }}
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-full bg-transparent rounded-lg flex items-center justify-center text-2xl"
          style={{ 
            pointerEvents: 'auto', 
            cursor: 'grab',
           filter: selected ? 'drop-shadow(0 0 4px #fb7185)' : 'none'
        }}

          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStartWithPinch}
          onTouchEnd={handleTouchEnd}
          onClick={() => setSelected(true)}
        >👗</div>
      )}

      {selected && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-full shadow-lg px-2 py-1 border border-rose-100"
          data-control="true"
          style={{ pointerEvents: 'auto' }}
        >
         <span className="text-xs font-medium text-rose-400 px-1">{item.name}</span>
          <button data-control="true" onClick={() => scaleBy(-0.15)} className="p-1 rounded-full hover:bg-rose-50">
            <ZoomOut className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button data-control="true" onClick={() => scaleBy(0.15)} className="p-1 rounded-full hover:bg-rose-50">
            <ZoomIn className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button data-control="true" onClick={rotate} className="p-1 rounded-full hover:bg-rose-50">
            <RotateCw className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button data-control="true" onClick={() => onUpdate(item.placedId, { z_index: Date.now() })} className="p-1 rounded-full hover:bg-rose-50">
            <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button data-control="true" onClick={() => onUpdate(item.placedId, { z_index: 0 })} className="p-1 rounded-full hover:bg-rose-50">
            <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button data-control="true" onClick={() => onRemove(item.placedId)} className="p-1 rounded-full hover:bg-red-50">
            <X className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}
