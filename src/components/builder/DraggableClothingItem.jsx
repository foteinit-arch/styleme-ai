import { useRef, useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, Check } from "lucide-react";

// ── Perspective math ──────────────────────────────────────────────────────────
// Solve an 8×8 linear system via Gaussian elimination (for homography)
function solve8(A, b) {
  const n = 8;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let max = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[max][c])) max = r;
    [M[c], M[max]] = [M[max], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// Build a CSS matrix3d that maps a (size × size) square to 4 arbitrary corners
// corners = [{x,y}, {x,y}, {x,y}, {x,y}]  →  TL, TR, BR, BL (canvas coords)
function warpTransform(size, corners) {
  const src = [[0,0],[size,0],[size,size],[0,size]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = src[i];
    const [dx, dy] = [corners[i].x, corners[i].y];
    A.push([sx,sy,1,0,0,0,-sx*dx,-sy*dx]); b.push(dx);
    A.push([0,0,0,sx,sy,1,-sx*dy,-sy*dy]); b.push(dy);
  }
  try {
    const h = solve8(A, b);
    if (h.some(v => !isFinite(v))) return "none";
    // CSS matrix3d is column-major 4×4; maps to: [h00,h10,0,h20, h01,h11,0,h21, 0,0,1,0, h02,h12,0,1]
    return `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`;
  } catch {
    return "none";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DraggableClothingItem({ item, onUpdate, onRemove }) {
  const [showControls, setShowControls] = useState(false);
  const [fitMode,      setFitMode]      = useState(false);

  const dragging    = useRef(false);
  const hasMoved    = useRef(false);
  const startClient = useRef({ x: 0, y: 0 });
  const startState  = useRef({ x: 0, y: 0, corners: null });
  const pinchRef    = useRef({ active: false, dist: 0, scale: 1 });
  const cornerDrag  = useRef(null); // { idx, startClient, startVal }
  const longTimer   = useRef(null);
  const hideTimer   = useRef(null);
  const imgRef      = useRef(null);
  const itemRef     = useRef(item);
  const updateRef   = useRef(onUpdate);

  useEffect(() => { itemRef.current  = item;     }, [item]);
  useEffect(() => { updateRef.current = onUpdate; }, [onUpdate]);

  const img    = item.processed_image_url || item.original_image_url;
  const size   = 100 * (item.scale || 1);
  const warped = !!item.corners;

  // centroid + topmost Y for controls positioning in warp mode
  const centX = warped ? item.corners.reduce((s, c) => s + c.x, 0) / 4 : item.x;
  const topY  = warped ? Math.min(...item.corners.map(c => c.y))       : item.y - size / 2;

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

  // ── Non-passive wheel zoom ────────────────────────────────────────────────
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const h = (e) => { e.preventDefault(); scaleBy(e.deltaY > 0 ? 0.92 : 1.08); };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [scaleBy]);

  // ── Document-level mouse (handles both item drag and corner drag) ──────────
  const onDocMove = useCallback((e) => {
    if (cornerDrag.current) {
      const { idx, startClient: sc, startVal: sv } = cornerDrag.current;
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
      const c = itemRef.current;
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
    return () => {
      document.removeEventListener("mousemove", onDocMove);
      document.removeEventListener("mouseup",   onDocUp);
    };
  }, [onDocMove, onDocUp]);

  // ── Image pointer down ────────────────────────────────────────────────────
  const onImgDown = useCallback((e) => {
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
      onImgDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, target: e.target, preventDefault: () => e.preventDefault() });
    }
  }, [onImgDown]);

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

  // ── Corner drag helpers ───────────────────────────────────────────────────
  const startCornerDrag = useCallback((idx, clientX, clientY) => {
    const c = itemRef.current;
    cornerDrag.current = { idx, startClient: { x: clientX, y: clientY }, startVal: { ...c.corners[idx] } };
    resetHide();
  }, [resetHide]);

  // ── Fit mode ──────────────────────────────────────────────────────────────
  const enterFit = useCallback(() => {
    const c = itemRef.current;
    if (!c.corners) {
      const s = 100 * (c.scale || 1);
      updateRef.current({ ...c, corners: [
        { x: c.x - s / 2, y: c.y - s / 2 }, // TL (left shoulder)
        { x: c.x + s / 2, y: c.y - s / 2 }, // TR (right shoulder)
        { x: c.x + s / 2, y: c.y + s / 2 }, // BR (right hip)
        { x: c.x - s / 2, y: c.y + s / 2 }, // BL (left hip)
      ]});
    }
    setFitMode(true);
    resetHide(10000);
  }, [resetHide]);

  const exitFit = useCallback(() => { setFitMode(false); resetHide(); }, [resetHide]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => { clearTimeout(longTimer.current); clearTimeout(hideTimer.current); }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={warped
      ? { position: "absolute", left: 0, top: 0, width: 0, height: 0, zIndex: item.z_index || 1, pointerEvents: "none", overflow: "visible" }
      : { position: "absolute", left: item.x - size / 2, top: item.y - size / 2, width: size, height: size, zIndex: item.z_index || 1, pointerEvents: "none", userSelect: "none", touchAction: "none", overflow: "visible" }
    }>
      {/* Clothing image */}
      <img
        ref={imgRef}
        src={img}
        alt=""
        draggable={false}
        onMouseDown={onImgDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position:        "absolute",
          left:            0,
          top:             0,
          width:           size,
          height:          size,
          objectFit:       "contain",
          pointerEvents:   "auto",
          cursor:          "grab",
          userSelect:      "none",
          touchAction:     "none",
          display:         "block",
          transformOrigin: "0 0",
          transform:       warped ? warpTransform(size, item.corners) : `rotate(${item.rotation || 0}deg)`,
          filter:          showControls ? "drop-shadow(0 0 8px rgba(249,115,22,0.75))" : "none",
        }}
      />

      {/* Corner handles — only visible in fit mode */}
      {fitMode && warped && item.corners.map((corner, idx) => (
        <div
          key={idx}
          data-ctrl="true"
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); startCornerDrag(idx, e.clientX, e.clientY); }}
          onTouchStart={e => { e.stopPropagation(); e.preventDefault(); startCornerDrag(idx, e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchMove={e => {
            e.stopPropagation(); e.preventDefault();
            if (cornerDrag.current?.idx === idx) {
              const dx = e.touches[0].clientX - cornerDrag.current.startClient.x;
              const dy = e.touches[0].clientY - cornerDrag.current.startClient.y;
              const c = itemRef.current;
              updateRef.current({ ...c, corners: c.corners.map((p, i) => i === idx ? { x: cornerDrag.current.startVal.x + dx, y: cornerDrag.current.startVal.y + dy } : p) });
            }
          }}
          onTouchEnd={e => { e.stopPropagation(); cornerDrag.current = null; resetHide(); }}
          title={["Left shoulder","Right shoulder","Right hip","Left hip"][idx]}
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
            zIndex:         999999,
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

      {/* Controls bar — appears on long-press */}
      {showControls && (
        <div
          data-ctrl="true"
          style={{
            position:      "absolute",
            left:          warped ? centX : "50%",
            top:           warped ? topY - 36 : -36,
            transform:     "translateX(-50%)",
            display:       "flex",
            gap:           7,
            zIndex:        999999,
            pointerEvents: "auto",
            touchAction:   "none",
          }}
        >
          {fitMode ? (
            /* Done button */
            <CtrlBtn bg="#22c55e" onClick={exitFit} wide>
              <Check size={12} /><span style={{ fontSize: 11, fontWeight: 600, marginLeft: 4 }}>Done</span>
            </CtrlBtn>
          ) : (
            <>
              <CtrlBtn bg="#111"    onClick={() => scaleBy(0.85)}        title="Smaller"><ZoomOut   size={13} /></CtrlBtn>
              <CtrlBtn bg="#ef4444" onClick={() => onRemove(item.placedId)} title="Remove"><X        size={13} /></CtrlBtn>
              <CtrlBtn bg="#111"    onClick={() => scaleBy(1.15)}        title="Bigger"><ZoomIn    size={13} /></CtrlBtn>
              <CtrlBtn bg="#f97316" onClick={enterFit}                   title="Fit to body"><Maximize2 size={13} /></CtrlBtn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ bg, onClick, title, children, wide }) {
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
