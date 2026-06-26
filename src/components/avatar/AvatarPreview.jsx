export default function AvatarPreview({ profile }) {
  const photoUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;

  if (!photoUrl) {
    return (
      <div style={{ width: 320, height: 600, borderRadius: 24, border: "2px dashed rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "rgba(255,255,255,0.03)" }}>
        <span style={{ fontSize: 48 }}>📸</span>
        <p style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, textAlign: "center", padding: "0 24px" }}>Upload your photo first</p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "0 24px" }}>Add a body photo to see your avatar</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: 320, height: 600, borderRadius: 24, overflow: "hidden", flexShrink: 0, background: "#111" }}>
      <img
        src={photoUrl}
        alt="avatar"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      />
    </div>
  );
}
