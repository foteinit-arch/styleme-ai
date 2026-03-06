import { useRef, useState, useCallback } from "react";
import AvatarPreview from "@/components/avatar/AvatarPreview";
import DraggableClothingItem from "@/components/builder/DraggableClothingItem";

export default function AvatarCanvas({ profile, placed, onUpdate, onRemove }) {
  const canvasRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const json = e.dataTransfer.getData("clothing_json");
    if (!json) return;
    const item = JSON.parse(json);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 50;
    const y = e.clientY - rect.top - 50;

    // Trigger parent to add item (already handled via ClothingPicker drag-to-canvas)
    // We need to notify parent with position
    const event = new CustomEvent("clothing-dropped", { detail: { item, x, y } });
    canvasRef.current.dispatchEvent(event);
  }, []);

  return (
    <div
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative bg-white rounded-3xl shadow-lg border-2 border-rose-100 overflow-hidden select-none"
      style={{ width: 320, height: 560 }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(circle, #f9a8d4 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

      {/* Avatar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AvatarPreview profile={profile || {}} />
      </div>

      {/* Placed clothing items */}
      {placed.map(item => (
        <DraggableClothingItem
          key={item.placedId}
          item={item}
          containerRef={canvasRef}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}

      {placed.length === 0 && (
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
          <p className="text-gray-400 text-sm">← Drag clothes here or click them</p>
        </div>
      )}
    </div>
  );
}