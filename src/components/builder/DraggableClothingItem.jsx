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

  // Calculate fixed toolbar position
  const getToolbarStyle = () => {
    const canvasRect = containerRef.current?.getBoundingClientRect();
    if (!canvasRect) return {};
    const itemScreenX = canvasRect.left + item.x;
    const itemScreenY = canvasRect.top + (item.y - size / 2);
    const toolbarTop = Math.max(8, itemScreenY - 36);
    return {
      position: 'fixed',
      top: toolbarTop,
      left: itemScreenX,
      transform: 'translateX(-50%)',
      zIndex: 99999,
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      background: 'white',
      borderRadius: '9999px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      padding: '4px 8px',
      border: '1px solid #ffe4e6',
      whiteSpace: 'nowrap',
    };
  };

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
        <div data-control="true" style={getToolbarStyle()}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#fb7185', paddingRight: '4px' }}>{item.name}</span>
          <button data-control="true" onClick={() => scaleBy(-0.15)} style={{ padding: '4px', borderRadius: '9999px', cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <ZoomOut size={14} color="#4b5563" />
          </button>
          <button data-control="true" onClick={() => scaleBy(0.15)} style={{ padding: '4px', borderRadius: '9999px', cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <ZoomIn size={14} color="#4b5563" />
          </button>
          <button data-control="true" onClick={rotate} style={{ padding: '4px', borderRadius: '9999px', cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <RotateCw size={14} color="#4b5563" />
          </button>
          <button data-control="true" onClick={() => onUpdate(item.placedId, { z_index: Date.now() })} style={{ padding: '4px', borderRadius: '9999px', cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <ChevronUp size={14} color="#4b5563" />
          </button>
          <button data-control="true" onClick={() => onUpdate(item.placedId, { z_index: 0 })} style={{ padding: '4px', borderRadius: '9999px', cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <ChevronDown size={14} color="#4b5563" />
          </button>
          <button data-control="true" onClick={() => onRemove(item.placedId)} style={{ padding: '4px', borderRadius: '9999px', cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <X size={14} color="#f87171" />
          </button>
        </div>
      )}
    </div>
  );
}
