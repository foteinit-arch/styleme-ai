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
     style={{ position: "relative", width: "100%", maxWidth: 320, height: 600, overflow: "visible", borderRadius: 24 }}
    >
      {(profile?.avatar_generated_url || profile?.avatar_photo_url) && (
        <img
          src={profile.avatar_generated_url || profile.avatar_photo_url}
          alt="avatar"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }}
        />
      )}

      {placed.map(item => (
        <DraggableClothingItem
          key={item.placedId}
          item={item}
          containerRef={canvasRef}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}