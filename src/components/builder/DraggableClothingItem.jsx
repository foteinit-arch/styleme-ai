import { useRef, useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, Check } from "lucide-react";

// ── Canvas-based warp rendering ───────────────────────────────────────────────
// Draws a warped image onto a canvas using 2-triangle affine approximation.
// corners = [{x,y}×4] TL,TR,BR,BL in canvas coords; imgSize = natural square size.

function drawAffineTriangle(ctx, imgEl, imgSize, dst0, dst1, dst2, sx0, sy0, sx1, sy1, sx2, sy2) {
  const det = sx0 * (sy1 - sy2) - sx1 * (sy0 - sy2) + sx2 * (sy0 - sy1);
  if (Math.abs(det) < 1e-8) return;

  const dx0 = dst0.x, dy0 = dst0.y;
  const dx1 = dst1.x, dy1 = dst1.y;
  const dx2 = dst2.x, dy2 = dst2.y;

  const a = ((dx0 - dx2) * (sy1 - sy2) - (dx1 - dx2) * (sy0 - sy2)) / det;
  const b = ((dx1 - dx2) * (sx0 - sx2) - (dx0 - dx2) * (sx1 - sx2)) / det;
  const c = dx2 - a * sx2 - b * sy2;
  const d = ((dy0 - dy2) * (sy1 - sy2) - (dy1 - dy2) * (sy0 - sy2)) / det;
  const e = ((dy1 - dy2) * (sx0 - sx2) - (dy0 - dy2) * (sx1 - sx2)) / det;
  const f = dy2 - d * sx2 - e * sy2;

  ctx.save();
  ctx.setTransform(a, d, b, e, c, f);
  ctx.beginPath();
  ctx.moveTo(sx0, sy0);
  ctx.lineTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(imgEl, 0, 0, imgSize, imgSize);
  ctx.restore();
}

function drawWarped(canvas, imgEl, corners, imgSize) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const [tl, tr, br, bl] = corners;
  const s = imgSize;
  // Triangle 1: TL–TR–BL
  drawAffineTriangle(ctx, imgEl, s, tl, tr, bl, 0, 0, s, 0, 0, s);
  // Triangle 2: TR–BR–BL
  drawAffineTriangle(ctx, imgEl, s, tr, br, bl, s, 0, s, s, 0, s);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DraggableClothingItem({ item, onUpdate, onRemove, containerRef }) {
  const [showControls, setShowControls] = useState(false);
  const [fitMode,      setFitMode]      = useState(false);

  const dragging    = useRef(false);
  const hasMoved    = useRef(false);
  const startClient = useRef({ x: 0, y: 0 });
  const startState  = useRef({ x: 0, y: 0, corners: null });
  const pinchRef    = useRef({ active: false, dist: 0, scale: 1 });
  const cornerDrag  = useRef(null);
  const longTimer   = useRef(null);
  const hideTimer   = useRef(null);
  const imgRef      = useRef(null);   // used for normal mode & image loading
  const warpCanvas  = useRef(null);   // canvas element for warp mode
  const imgLoaded   = useRef(null);   // cached HTMLImageElement for canvas drawing
  const itemRef     = useRef(item);
  const updateRef   = useRef(onUpdate);

  useEffect(() => { itemRef.current  = item;     }, [item]);
  useEffect(() => { updateRef.current = onUpdate; }, [onUpdate]);

  const imgSrc = item.processed_image_url || item.original_image_url;
  const size   = 100 * (item.scale || 1);
  const warped = !!item.corners;

  // Centroid + topmost Y for controls positioning
  const centX = warped ? item.corners.reduce((s, c) => s + c.x, 0) / 4 : item.x;
  const topY  = warped ? Math.min(...item.corners.map(c => c.y))       : item.y - size / 2;

  // ── Load image for canvas drawing ─────────────────────────────────────────
  const loadImg = useCallback(() => {
    if (imgLoaded.current?.src?.endsWith(imgSrc)) return Promise.resolve(imgLoaded.current);
    return new Promise((resolve) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload  = () => { imgLoaded.current = el; resolve(el); };
      el.onerror = () => resolve(null);
      el.src = imgSrc;
    });
  }, [imgSrc]);

  // ── Redraw warped canvas whenever corners change ───────────────────────────
  useEffect(() => {
    if (!warped || !warpCanvas.current) return;
    // Get canvas dimensions from container, or fall back to 320×600
    const cw = containerRef?.current?.offsetWidth  || 320;
    const ch = containerRef?.current?.offsetHeight || 600;
    warpCanvas.current.width  = cw;
    warpCanvas.current.height = ch;
    loadImg().then(el => {
      if (el && warpCanvas.current && item.corners) {
        drawWarped(warpCanvas.current, el, item.corners, size);
      }
    });
  }, [warped, item.corners, size, loadImg, containerRef]);

  // ── Timers ────────────────────────────────────────────────────────────────
  const resetHide = useCallback((ms = 5000) => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { setShowControls(false); setFitMode(false); }, ms);
  }, []);

  const revealControls = useCallback(() => { setShowControls(true); resetHide(); }, [resetHide]);

  // ── Scale ─────────────────────────────────────────────────────────────────
  const scaleBy = useCallback((f) => {
    const c = itemRef.current;
    const s = Math.max(0.3, Math.min(4, (c.scale || 1) * f));
    if (c.corners) {
      const cx = c.corners.reduce((a, p) => a + p.x, 0) / 4;
      const cy = c.corners.reduce((a, p) => a + p.y, 0) / 4;
      updateRef.current({ ...c, scale: s, corners: c.corners.map(p => ({ x: cx + (p.x - cx) * f, y: cy + (p.y - cy) * f })) });
    } else {
      updateRef.current({ ...c, scale: s });
    }
    resetHide();
  }, [resetHide]);

  // ── Layer toggle (single tap) ─────────────────────────────────────────────
  const toggleLayer = useCallback(() => {
    const c = itemRef.current;
    updateRef.current({ ...c, z_index: (c.z_index || 1) > 10 ? 1 : Date.now() });
  }, []);

  // ── Wheel zoom (non-passive) ──────────────────────────────────────────────
  useEffect(() => {
    const el = warped ? warpCanvas.current : imgRef.current;
    if (!el) return;
    const h = (e) => { e.preventDefault(); scaleBy(e.deltaY > 0 ? 0.92 : 1.08); };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [scaleBy, warped]);

  // ── Document mouse (item drag + corner drag) ──────────────────────────────
  const onDocMove = useCallback((e) => {
    if (cornerDrag.current) {
      const { idx, sc, sv } = cornerDrag.current;
      const dx = e.clientX - sc.x, dy = e.clientY - sc.y;
      const c = itemRef.current;
      updateRef.current({ ...c, corners: c.corners.map((p, i) => i === idx ? { x: sv.x + dx, y: sv.y + dy } : p) });
      return;
    }
    if (!dragging.current || pinchRef.current.active) return;
    const dx = e.clientX - startClient.current.x;
    const dy = e.clientY - startClient.current.y;
    if (!hasMoved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasMoved.current = true;
      clearTimeout(longTimer.current);
    }
    if (hasMoved.current) {
      const c  = itemRef.current;
      const si = startState.current;
      const next = { ...c, x: si.x + dx, y: si.y + dy };
      if (si.corners) next.corners = si.corners.map(p => ({ x: p.x + dx, y: p.y + dy }));
      updateRef.current(next);
    }
  }, []);

  const onDocUp = useCallback(() => {
    if (cornerDrag.current) { cornerDrag.current = null; resetHide(); return; }
    clearTimeout(longTimer.current);
    if (!hasMoved.current && dragging.current) toggleLayer();
    dragging.current = false;
  }, [toggleLayer, resetHide]);

  useEffect(() => {
    document.addEventListener("mousemove", onDocMove);
    document.addEventListener("mouseup",   onDocUp);
    return () => { document.removeEventListener("mousemove", onDocMove); document.removeEventListener("mouseup", onDocUp); };
  }, [onDocMove, onDocUp]);

  // ── Pointer down (on img or canvas) ──────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.target.closest("[data-ctrl]")) return;
    hasMoved.current    = false;
    dragging.current    = true;
    startClient.current = { x: e.clientX, y: e.clientY };
    const c = itemRef.current;
    startState.current  = { x: c.x, y: c.y, corners: c.corners ? c.corners.map(p => ({ ...p })) : null };
    longTimer.current   = setTimeout(() => { if (!hasMoved.current) revealControls(); }, 600);
    e.preventDefault();
  }, [revealControls]);

  // ── Touch ─────────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { active: true, dist: Math.hypot(dx, dy), scale: itemRef.current.scale || 1 };
      dragging.current = false;
      clearTimeout(longTimer.current);
      e.preventDefault();
    } else {
      onPointerDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, target: e.target, preventDefault: () => e.preventDefault() });
    }
  }, [onPointerDown]);

  const onTouchMove = useCallback((e) => {
    if (pinchRef.current.active && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const s  = Math.max(0.3, Math.min(4, pinchRef.current.scale * Math.hypot(dx, dy) / pinchRef.current.dist));
      updateRef.current({ ...itemRef.current, scale: s });
      e.preventDefault();
    } else if (!pinchRef.current.active) {
      onDocMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
      e.preventDefault();
    }
  }, [onDocMove]);

  const onTouchEnd = useCallback(() => {
    if (pinchRef.current.active) { pinchRef.current.active = false; return; }
    onDocUp();
  }, [onDocUp]);

  // ── Corner drag ───────────────────────────────────────────────────────────
  const startCornerDrag = useCallback((idx, clientX, clientY) => {
    const c = itemRef.current;
    cornerDrag.current = { idx, sc: { x: clientX, y: clientY }, sv: { ...c.corners[idx] } };
    resetHide();
  }, [resetHide]);

  // ── Fit mode ──────────────────────────────────────────────────────────────
  const enterFit = useCallback(() => {
    const c = itemRef.current;
    if (!c.corners) {
      const s = 100 * (c.scale || 1);
      updateRef.current({ ...c, corners: [
        { x: c.x - s / 2, y: c.y - s / 2 }, // TL — left shoulder
        { x: c.x + s / 2, y: c.y - s / 2 }, // TR — right shoulder
        { x: c.x + s / 2, y: c.y + s / 2 }, // BR — right hip
        { x: c.x - s / 2, y: c.y + s / 2 }, // BL — left hip
      ]});
    }
    setFitMode(true);
    resetHide(15000);
  }, [resetHide]);

  const exitFit = useCallback(() => { setFitMode(false); resetHide(); }, [resetHide]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => { clearTimeout(longTimer.current); clearTimeout(hideTimer.current); }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Normal mode: regular img */}
      {!warped && (
        <div style={{
          position:      "absolute",
          left:          item.x - size / 2,
          top:           item.y - size / 2,
          width:         size,
          height:        size,
          zIndex:        item.z_index || 1,
          pointerEvents: "none",
          userSelect:    "none",
          touchAction:   "none",
        }}>
          <img
            ref={imgRef}
            src={imgSrc}
            alt=""
            draggable={false}
            onMouseDown={onPointerDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              width:         "100%",
              height:        "100%",
              objectFit:     "contain",
              pointerEvents: "auto",
              cursor:        "grab",
              display:       "block",
              transform:     `rotate(${item.rotation || 0}deg)`,
              filter:        showControls ? "drop-shadow(0 0 8px rgba(249,115,22,0.75))" : "none",
            }}
          />

          {showControls && (
            <ControlsBar
              onScaleDown={() => scaleBy(0.85)}
              onRemove={() => onRemove(item.placedId)}
              onScaleUp={() => scaleBy(1.15)}
              onFit={enterFit}
              fitMode={false}
              style={{ position: "absolute", top: -36, left: "50%", transform: "translateX(-50%)" }}
            />
          )}
        </div>
      )}

      {/* Warp mode: canvas for rendering + handles */}
      {warped && (
        <>
          {/* Canvas renders the warped image — covers full avatar area */}
          <canvas
            ref={warpCanvas}
            onMouseDown={onPointerDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position:      "absolute",
              left:          0,
              top:           0,
              width:         "100%",
              height:        "100%",
              zIndex:        item.z_index || 1,
              pointerEvents: "auto",
              cursor:        "grab",
              touchAction:   "none",
            }}
          />

          {/* Corner handles */}
          {fitMode && item.corners.map((corner, idx) => (
            <div
              key={idx}
              data-ctrl="true"
              title={["Left shoulder","Right shoulder","Right hip","Left hip"][idx]}
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); startCornerDrag(idx, e.clientX, e.clientY); }}
              onTouchStart={e => { e.stopPropagation(); e.preventDefault(); startCornerDrag(idx, e.touches[0].clientX, e.touches[0].clientY); }}
              onTouchMove={e => {
                e.stopPropagation(); e.preventDefault();
                if (cornerDrag.current?.idx === idx) {
                  const dx = e.touches[0].clientX - cornerDrag.current.sc.x;
                  const dy = e.touches[0].clientY - cornerDrag.current.sc.y;
                  const c = itemRef.current;
                  updateRef.current({ ...c, corners: c.corners.map((p, i) => i === idx ? { x: cornerDrag.current.sv.x + dx, y: cornerDrag.current.sv.y + dy } : p) });
                }
              }}
              onTouchEnd={e => { e.stopPropagation(); cornerDrag.current = null; resetHide(); }}
              style={{
                position:       "absolute",
                left:           corner.x - 14,
                top:            corner.y - 14,
                width:          28,
                height:         28,
                borderRadius:   "50%",
                background:     "#f97316",
                border:         "3px solid white",
                cursor:         "crosshair",
                zIndex:         (item.z_index || 1) + 1000,
                pointerEvents:  "auto",
                touchAction:    "none",
                boxShadow:      "0 2px 10px rgba(0,0,0,0.4)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontSize: 10, fontWeight: 700, userSelect: "none" }}>
                {["↖","↗","↘","↙"][idx]}
              </span>
            </div>
          ))}

          {/* Controls */}
          {showControls && (
            <ControlsBar
              onScaleDown={() => scaleBy(0.85)}
              onRemove={() => onRemove(item.placedId)}
              onScaleUp={() => scaleBy(1.15)}
              onFit={enterFit}
              onDone={exitFit}
              fitMode={fitMode}
              style={{
                position:  "absolute",
                left:      centX,
                top:       topY - 36,
                transform: "translateX(-50%)",
                zIndex:    (item.z_index || 1) + 1001,
              }}
            />
          )}
        </>
      )}
    </>
  );
}

// ── Controls bar ──────────────────────────────────────────────────────────────
function ControlsBar({ onScaleDown, onRemove, onScaleUp, onFit, onDone, fitMode, style }) {
  return (
    <div
      data-ctrl="true"
      style={{ display: "flex", gap: 7, pointerEvents: "auto", touchAction: "none", ...style }}
    >
      {fitMode ? (
        <Btn bg="#22c55e" onClick={onDone} wide>
          <Check size={12} /><span style={{ fontSize: 11, fontWeight: 600, marginLeft: 4 }}>Done</span>
        </Btn>
      ) : (
        <>
          <Btn bg="#111"    onClick={onScaleDown} title="Smaller"><ZoomOut   size={13} /></Btn>
          <Btn bg="#ef4444" onClick={onRemove}    title="Remove"><X          size={13} /></Btn>
          <Btn bg="#111"    onClick={onScaleUp}   title="Bigger"><ZoomIn     size={13} /></Btn>
          <Btn bg="#f97316" onClick={onFit}       title="Fit to body"><Maximize2 size={13} /></Btn>
        </>
      )}
    </div>
  );
}

function Btn({ bg, onClick, title, children, wide }) {
  return (
    <button
      data-ctrl="true"
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      onClick={onClick}
      title={title}
      style={{
        width:          wide ? "auto" : 28,
        height:         28,
        padding:        wide ? "0 10px" : 0,
        borderRadius:   14,
        background:     bg,
        color:          "white",
        border:         "2px solid white",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         "pointer",
        boxShadow:      "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </button>
  );
}
