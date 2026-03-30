import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import AvatarPreview from "@/components/avatar/AvatarPreview";
import DraggableClothingItem from "@/components/builder/DraggableClothingItem";

// ── Canvas drawing helpers (mirrors DraggableClothingItem logic) ──────────────
function drawAffineTriangle(ctx, imgEl, imgSize, dst0, dst1, dst2, sx0, sy0, sx1, sy1, sx2, sy2) {
  const det = sx0 * (sy1 - sy2) - sx1 * (sy0 - sy2) + sx2 * (sy0 - sy1);
  if (Math.abs(det) < 1e-8) return;
  const dx0=dst0.x, dy0=dst0.y, dx1=dst1.x, dy1=dst1.y, dx2=dst2.x, dy2=dst2.y;
  const a = ((dx0-dx2)*(sy1-sy2)-(dx1-dx2)*(sy0-sy2))/det;
  const b = ((dx1-dx2)*(sx0-sx2)-(dx0-dx2)*(sx1-sx2))/det;
  const c = dx2-a*sx2-b*sy2;
  const d = ((dy0-dy2)*(sy1-sy2)-(dy1-dy2)*(sy0-sy2))/det;
  const e = ((dy1-dy2)*(sx0-sx2)-(dy0-dy2)*(sx1-sx2))/det;
  const f = dy2-d*sx2-e*sy2;
  ctx.save();
  ctx.setTransform(a, d, b, e, c, f);
  ctx.beginPath(); ctx.moveTo(sx0,sy0); ctx.lineTo(sx1,sy1); ctx.lineTo(sx2,sy2); ctx.closePath();
  ctx.clip();
  ctx.drawImage(imgEl, 0, 0, imgSize, imgSize);
  ctx.restore();
}

function drawWarpedToCanvas(canvas, imgEl, corners, imgSize, flipX) {
  // Does NOT clearRect — safe to use on shared offscreen canvas via temp canvas
  const ctx = canvas.getContext("2d");
  let c = corners;
  if (flipX) {
    const cx = c.reduce((s, p) => s + p.x, 0) / c.length;
    c = c.map(p => ({ x: 2 * cx - p.x, y: p.y }));
  }
  const [tl, tr, br, bl] = c, s = imgSize;
  if (c.length >= 6) {
    const ml = c[4], mr = c[5], sh = s / 2;
    drawAffineTriangle(ctx, imgEl, s, tl, tr, ml,  0,0,  s,0,  0,sh);
    drawAffineTriangle(ctx, imgEl, s, tr, mr, ml,  s,0,  s,sh, 0,sh);
    drawAffineTriangle(ctx, imgEl, s, ml, mr, bl,  0,sh, s,sh, 0,s);
    drawAffineTriangle(ctx, imgEl, s, mr, br, bl,  s,sh, s,s,  0,s);
  } else {
    drawAffineTriangle(ctx, imgEl, s, tl, tr, bl,  0,0, s,0, 0,s);
    drawAffineTriangle(ctx, imgEl, s, tr, br, bl,  s,0, s,s, 0,s);
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
const AvatarCanvas = forwardRef(function AvatarCanvas(
  { profile, placed, onUpdate, onRemove, onSendToBack, onBringToFront },
  ref
) {
  const canvasRef = useRef(null);

  // Expose captureSnapshot to parent via ref
  useImperativeHandle(ref, () => ({
    async captureSnapshot() {
      const container = canvasRef.current;
      if (!container) return null;
      const w = 320;
      const h = 600;

      const offscreen = document.createElement("canvas");
      offscreen.width  = w;
      offscreen.height = h;
      const ctx = offscreen.getContext("2d");

      // 1. Draw avatar background (replicate object-fit:cover + object-position:top)
      const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;
      if (avatarUrl) {
        const avatarImg = await loadImage(avatarUrl);
        if (avatarImg) {
          const iw = avatarImg.naturalWidth;
          const ih = avatarImg.naturalHeight;
          const scale = Math.max(w / iw, h / ih);
          const dw = iw * scale;
          const dh = ih * scale;
          const dx = (w - dw) / 2;
          const dy = 0; // object-position: top
          ctx.drawImage(avatarImg, dx, dy, dw, dh);
        }
      }

      // 2. Draw placed items in array order (= z-order)
      for (const item of placed) {
        const imgSrc = item.processed_image_url || item.original_image_url;
        if (!imgSrc) continue;
        const imgEl = await loadImage(imgSrc);
        if (!imgEl) continue;

        const size = 100 * (item.scale || 1);

        if (item.corners) {
          // Warped item: render to temp canvas first so we don't clear offscreen
          const tmp = document.createElement("canvas");
          tmp.width  = w;
          tmp.height = h;
          drawWarpedToCanvas(tmp, imgEl, item.corners, size, item.flipX);
          ctx.drawImage(tmp, 0, 0);
        } else {
          // Normal item: replicate the CSS transform/position
          const isShoe  = item.category === "shoes";
          const centerX = item.x;
          const centerY = isShoe ? item.y - size / 2 : item.y;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
          if (item.flipX) ctx.scale(-1, 1);
          ctx.drawImage(imgEl, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
      }

      try {
        return offscreen.toDataURL("image/png");
      } catch {
        // CORS tainted canvas — fall back to null
        return null;
      }
    },
  }));

  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const json = e.dataTransfer.getData("clothing_json");
    if (!json) return;
    const item = JSON.parse(json);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 50;
    const y = e.clientY - rect.top  - 50;
    const event = new CustomEvent("clothing-dropped", { detail: { item, x, y } });
    canvasRef.current.dispatchEvent(event);
  }, []);

  return (
    <div
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: "relative", width: "100%", maxWidth: 320, height: 600, overflow: "visible", borderRadius: 24, isolation: "isolate" }}
    >
      {(profile?.avatar_generated_url || profile?.avatar_photo_url) && (
        <img
          src={profile.avatar_generated_url || profile.avatar_photo_url}
          alt="avatar"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      )}

      {placed.map(item => (
        <DraggableClothingItem
          key={item.placedId}
          item={item}
          containerRef={canvasRef}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onSendToBack={onSendToBack}
          onBringToFront={onBringToFront}
          profile={profile}
        />
      ))}
    </div>
  );
});

export default AvatarCanvas;