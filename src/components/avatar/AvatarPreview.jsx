import { useRef } from "react";
import DraggableClothingItem from "@/components/builder/DraggableClothingItem";

export default function AvatarCanvas({ profile, placed, onUpdate, onRemove }) {
  const canvasRef = useRef(null);
  const photoUrl = profile?.avatar_photo_url;

  if (!photoUrl) {
    return (
      <div style={{ width: 320, height: 600, borderRadius: 24, border: "2px dashed #f9a8b8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#fff5f6" }}>
        <span style={{ fontSize: 48 }}>📸</span>
        <p style={{ color: "#be185d", fontWeight: 600, textAlign: "center", padding: "0 24px" }}>Upload your photo first</p>
        <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "0 24px" }}>Go to My Avatar → Body Photo</p>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      style={{ position: "relative", width: 320, height: 600, borderRadius: 24, overflow: "hidden", flexShrink: 0 }}
    >
      <img
        src={photoUrl}
        alt="avatar"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      />
      {placed && placed.map(item => (
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