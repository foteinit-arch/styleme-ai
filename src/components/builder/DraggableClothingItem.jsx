import { useRef, useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, Check } from "lucide-react";

// ── Canvas-based warp rendering ───────────────────────────────────────────────
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

function drawWarped(canvas, imgEl, corners, imgSize) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const [tl, tr, br, bl] = corners, s = imgSize;
  if (corners.length >= 6) {
    // 6-point mesh (4 triangles): TL TR BR BL ML MR
    const ml = corners[4], mr = corners[5], sh = s / 2;
    drawAffineTriangle(ctx, imgEl, s, tl, tr, ml,  0,0,  s,0,  0,sh);
    drawAffineTriangle(ctx, imgEl, s, tr, mr, ml,  s,0,  s,sh, 0,sh);
    drawAffineTriangle(ctx, imgEl, s, ml, mr, bl,  0,sh, s,sh, 0,s);
    drawAffineTriangle(ctx, imgEl, s, mr, br, bl,  s,sh, s,s,  0,s);
  } else {
    // 4-point mesh (2 triangles) — legacy / short items
    drawAffineTriangle(ctx, imgEl, s, tl, tr, bl,  0,0, s,0, 0,s);
    drawAffineTriangle(ctx, imgEl, s, tr, br, bl,  s,0, s,s, 0,s);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DraggableClothingItem({ item, onUpdate, onRemove, containerRef, onSendToBack, onBringToFront }) {
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
  const imgRef      = useRef(null);
  const warpCanvas  = useRef(null);
  const imgLoaded   = useRef(null);
  const itemRef     = useRef(item);
  const updateRef   = useRef(onUpdate);

  useEffect(() => { itemRef.current  = item;     }, [item]);
  useEffect(() => { updateRef.current = onUpdate; }, [onUpdate]);

  const imgSrc = item.processed_image_url || item.original_image_url;
  const size   = 100 * (item.scale || 1);
  const warped = !!item.corners;

  // Centroid + bounds (for controls and bounding-box hit area)
  const centX = warped ? item.corners.reduce((s, c) => s + c.x, 0) / item.corners.length : item.x;
  const topY  = warped ? Math.min(...item.corners.map(c => c.y))       : item.y - size / 2;
  const minX  = warped ? Math.min(...item.corners.map(c => c.x))       : 0;
  const minY  = warped ? Math.min(...item.corners.map(c => c.y))       : 0;
  const maxX  = warped ? Math.max(...item.corners.map(c => c.x))       : 0;
  const maxY  = warped ? Math.max(...item.corners.map(c => c.y))       : 0;

  // ── Load image for canvas ─────────────────────────────────────────────────
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

  // Redraw warp canvas whenever corners change
  useEffect(() => {
    if (!warped || !warpCanvas.current) return;
    const cw = containerRef?.current?.offsetWidth  || 320;
    const ch = containerRef?.current?.offsetHeight || 600;
    warpCanvas.current.width  = cw;
    warpCanvas.current.height = ch;
    loadImg().then(el => {
      if (el && warpCanvas.current && item.corners) drawWarped(warpCanvas.current, el, item.corners, size);
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
      const cx = c.corners.reduce((a, p) => a + p.x, 0) / c.corners.length;
      const cy = c.corners.reduce((a, p) => a + p.y, 0) / c.corners.length;
      updateRef.current({ ...c, scale: s, corners: c.corners.map(p => ({ x: cx+(p.x-cx)*f, y: cy+(p.y-cy)*f })) });
    } else {
      updateRef.current({ ...c, scale: s });
    }
    resetHide();
  }, [resetHide]);

  // Layer via DOM order — parent reorders the placed[] array.
  // Hide controls immediately so the z-index boost drops and DOM order takes effect at once.
  const sendToBack = useCallback(() => {
    onSendToBack?.(itemRef.current.placedId);
    clearTimeout(hideTimer.current);
    setShowControls(false);
  }, [onSendToBack]);

  const bringToFront = useCallback(() => {
    onBringToFront?.(itemRef.current.placedId);
    clearTimeout(hideTimer.current);
    setShowControls(false);
  }, [onBringToFront]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = warped ? warpCanvas.current : imgRef.current;
    if (!el) return;
    const h = (e) => { e.preventDefault(); scaleBy(e.deltaY > 0 ? 0.92 : 1.08); };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [scaleBy, warped]);

  // ── Document mouse listeners ──────────────────────────────────────────────
  const onDocMove = useCallback((e) => {
    if (cornerDrag.current) {
      const { idx, sc, sv } = cornerDrag.current;
      const dx = e.clientX - sc.x, dy = e.clientY - sc.y;
      const c = itemRef.current;
      const cw = containerRef?.current?.offsetWidth  || 320;
      const ch = containerRef?.current?.offsetHeight || 600;
      const newX = Math.max(0, Math.min(cw, sv.x + dx));
      const newY = Math.max(0, Math.min(ch, sv.y + dy));
      updateRef.current({ ...c, corners: c.corners.map((p,i) => i===idx ? {x:newX, y:newY} : p) });
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
      const c = itemRef.current, si = startState.current;
      const next = { ...c, x: si.x+dx, y: si.y+dy };
      if (si.corners) next.corners = si.corners.map(p => ({ x: p.x+dx, y: p.y+dy }));
      updateRef.current(next);
    }
  }, []);

  const onDocUp = useCallback(() => {
    if (cornerDrag.current) { cornerDrag.current = null; resetHide(); return; }
    clearTimeout(longTimer.current);
    if (!hasMoved.current && dragging.current) revealControls();
    dragging.current = false;
  }, [revealControls, resetHide]);

  useEffect(() => {
    document.addEventListener("mousemove", onDocMove);
    document.addEventListener("mouseup",   onDocUp);
    return () => { document.removeEventListener("mousemove", onDocMove); document.removeEventListener("mouseup", onDocUp); };
  }, [onDocMove, onDocUp]);

  // ── Pointer down ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.target?.closest?.("[data-ctrl]")) return;
    hasMoved.current    = false;
    dragging.current    = true;
    startClient.current = { x: e.clientX, y: e.clientY };
    const c = itemRef.current;
    startState.current  = { x: c.x, y: c.y, corners: c.corners ? c.corners.map(p=>({...p})) : null };
    longTimer.current   = setTimeout(() => { if (!hasMoved.current) revealControls(); }, 600);
    e.preventDefault();
  }, [revealControls]);

  // ── Touch ─────────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX-e.touches[1].clientX, dy = e.touches[0].clientY-e.touches[1].clientY;
      pinchRef.current = { active:true, dist:Math.hypot(dx,dy), scale:itemRef.current.scale||1 };
      dragging.current = false; clearTimeout(longTimer.current); e.preventDefault();
    } else {
      onPointerDown({ clientX:e.touches[0].clientX, clientY:e.touches[0].clientY, target:e.target, preventDefault:()=>e.preventDefault() });
    }
  }, [onPointerDown]);

  const onTouchMove = useCallback((e) => {
    if (pinchRef.current.active && e.touches.length===2) {
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const s=Math.max(0.3,Math.min(4,pinchRef.current.scale*Math.hypot(dx,dy)/pinchRef.current.dist));
      updateRef.current({ ...itemRef.current, scale:s }); e.preventDefault();
    } else if (!pinchRef.current.active) {
      onDocMove({ clientX:e.touches[0].clientX, clientY:e.touches[0].clientY }); e.preventDefault();
    }
  }, [onDocMove]);

  const onTouchEnd = useCallback(() => {
    if (pinchRef.current.active) { pinchRef.current.active=false; return; }
    onDocUp();
  }, [onDocUp]);

  // ── Corner drag ───────────────────────────────────────────────────────────
  const startCornerDrag = useCallback((idx, clientX, clientY) => {
    cornerDrag.current = { idx, sc:{x:clientX,y:clientY}, sv:{...itemRef.current.corners[idx]} };
    resetHide();
  }, [resetHide]);

  // ── Fit mode ──────────────────────────────────────────────────────────────
  const enterFit = useCallback(() => {
    const c = itemRef.current;
    const cw = containerRef?.current?.offsetWidth  || 320;
    const ch = containerRef?.current?.offsetHeight || 600;
    const clampX = (x) => Math.max(0, Math.min(cw, x));
    const clampY = (y) => Math.max(0, Math.min(ch, y));
    if (!c.corners) {
      const s = 100*(c.scale||1);
      updateRef.current({ ...c, corners:[
        {x:clampX(c.x-s/2), y:clampY(c.y-s/2)}, // 0 TL — left shoulder / waist
        {x:clampX(c.x+s/2), y:clampY(c.y-s/2)}, // 1 TR — right shoulder / waist
        {x:clampX(c.x+s/2), y:clampY(c.y+s/2)}, // 2 BR — right ankle / hem
        {x:clampX(c.x-s/2), y:clampY(c.y+s/2)}, // 3 BL — left ankle / hem
        {x:clampX(c.x-s/2), y:clampY(c.y)},     // 4 ML — left knee / mid
        {x:clampX(c.x+s/2), y:clampY(c.y)},     // 5 MR — right knee / mid
      ]});
    } else if (c.corners.length === 4) {
      // Upgrade legacy 4-corner to 6-point mesh
      const [tl, tr, br, bl] = c.corners;
      updateRef.current({ ...c, corners: [
        tl, tr, br, bl,
        {x:clampX((tl.x+bl.x)/2), y:clampY((tl.y+bl.y)/2)}, // ML
        {x:clampX((tr.x+br.x)/2), y:clampY((tr.y+br.y)/2)}, // MR
      ]});
    }
    setFitMode(true); resetHide(15000);
  }, [resetHide, containerRef]);

  const exitFit = useCallback(() => { setFitMode(false); resetHide(); }, [resetHide]);

  useEffect(() => () => { clearTimeout(longTimer.current); clearTimeout(hideTimer.current); }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  // When controls are visible, boost z-index so buttons are never covered by another item.
  // Layer order is managed via DOM position in placed[] array (last = on top).
  const zIdx = showControls || fitMode ? 9999 : (item.z_index || 1);

  return (
    <>
      {/* ── Normal mode ─────────────────────────────────────────────────── */}
      {!warped && (
        <div style={{ position:"absolute", left:item.x-size/2, top:item.y-size/2, width:size, height:size, zIndex:zIdx, pointerEvents:"none", userSelect:"none", touchAction:"none" }}>
          <img
            ref={imgRef}
            src={imgSrc} alt="" draggable={false}
            onMouseDown={onPointerDown}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{ width:"100%", height:"100%", objectFit:"contain", pointerEvents:"auto", cursor:"grab", display:"block",
              transform:`rotate(${item.rotation||0}deg)`,
              filter: showControls ? "drop-shadow(0 0 8px rgba(249,115,22,0.75))" : "none" }}
          />
          {showControls && (
            <ControlsBar onScaleDown={()=>scaleBy(0.85)} onRemove={()=>onRemove(item.placedId)}
              onScaleUp={()=>scaleBy(1.15)} onFit={enterFit} onFront={bringToFront} onBack={sendToBack} fitMode={false}
              style={{ position:"absolute", top:-36, left:"50%", transform:"translateX(-50%)" }} />
          )}
        </div>
      )}

      {/* ── Warp mode ───────────────────────────────────────────────────── */}
      {warped && (
        <>
          {/* Canvas: renders the warped image, NO pointer events so it never blocks other items */}
          <canvas ref={warpCanvas} style={{ position:"absolute", left:0, top:0, width:"100%", height:"100%", zIndex:zIdx, pointerEvents:"none" }} />

          {/* Bounding-box hit area: only covers the item's actual footprint */}
          <div
            onMouseDown={onPointerDown} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{ position:"absolute", left:minX-8, top:minY-8, width:maxX-minX+16, height:maxY-minY+16, zIndex:zIdx, pointerEvents:"auto", cursor:"grab", touchAction:"none" }}
          />

          {/* Corner handles (only in fit mode) */}
          {fitMode && item.corners.map((corner, idx) => (
            <div key={idx} data-ctrl="true"
              title={["Left top","Right top","Right bottom","Left bottom","Left mid","Right mid"][idx]}
              onMouseDown={e=>{e.stopPropagation();e.preventDefault();startCornerDrag(idx,e.clientX,e.clientY);}}
              onTouchStart={e=>{e.stopPropagation();e.preventDefault();startCornerDrag(idx,e.touches[0].clientX,e.touches[0].clientY);}}
              onTouchMove={e=>{
                e.stopPropagation();e.preventDefault();
                if(cornerDrag.current?.idx===idx){
                  const dx=e.touches[0].clientX-cornerDrag.current.sc.x, dy=e.touches[0].clientY-cornerDrag.current.sc.y;
                  const c=itemRef.current;
                  updateRef.current({...c,corners:c.corners.map((p,i)=>i===idx?{x:cornerDrag.current.sv.x+dx,y:cornerDrag.current.sv.y+dy}:p)});
                }
              }}
              onTouchEnd={e=>{e.stopPropagation();cornerDrag.current=null;resetHide();}}
              style={{ position:"absolute", left:corner.x-14, top:corner.y-14, width:28, height:28, borderRadius:"50%",
                background:"#f97316", border:"3px solid white", cursor:"crosshair",
                zIndex:zIdx+1000, pointerEvents:"auto", touchAction:"none",
                boxShadow:"0 2px 10px rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}
            >
              <span style={{color:"white",fontSize:10,fontWeight:700,userSelect:"none"}}>{["↖","↗","↘","↙","◀","▶"][idx]}</span>
            </div>
          ))}

          {/* Controls bar */}
          {showControls && (
            <ControlsBar onScaleDown={()=>scaleBy(0.85)} onRemove={()=>onRemove(item.placedId)}
              onScaleUp={()=>scaleBy(1.15)} onFit={enterFit} onDone={exitFit} onFront={bringToFront} onBack={sendToBack} fitMode={fitMode}
              style={{ position:"absolute", left:centX, top:topY-36, transform:"translateX(-50%)", zIndex:zIdx+1001 }} />
          )}
        </>
      )}
    </>
  );
}

// ── Controls bar ──────────────────────────────────────────────────────────────
function ControlsBar({ onScaleDown, onRemove, onScaleUp, onFit, onDone, onFront, onBack, fitMode, style }) {
  return (
    <div data-ctrl="true" style={{ display:"flex", gap:7, pointerEvents:"auto", touchAction:"none", ...style }}>
      {fitMode ? (
        <Btn bg="#22c55e" onClick={onDone} wide><Check size={12}/><span style={{fontSize:11,fontWeight:600,marginLeft:4}}>Done</span></Btn>
      ) : (
        <>
          <Btn bg="#111"    onClick={onScaleDown} title="Smaller"><ZoomOut   size={13}/></Btn>
          <Btn bg="#ef4444" onClick={onRemove}    title="Remove"><X          size={13}/></Btn>
          <Btn bg="#111"    onClick={onScaleUp}   title="Bigger"><ZoomIn     size={13}/></Btn>
          <Btn bg="#111"    onClick={onBack}      title="Send to back"><span  style={{fontSize:13,fontWeight:700,lineHeight:1}}>↓</span></Btn>
          <Btn bg="#111"    onClick={onFront}     title="Bring to front"><span style={{fontSize:13,fontWeight:700,lineHeight:1}}>↑</span></Btn>
          <Btn bg="#f97316" onClick={onFit}       title="Fit to body"><Maximize2 size={13}/></Btn>
        </>
      )}
    </div>
  );
}

function Btn({ bg, onClick, title, children, wide }) {
  return (
    <button data-ctrl="true" onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}
      onClick={onClick} title={title}
      style={{ width:wide?"auto":28, height:28, padding:wide?"0 10px":0, borderRadius:14,
        background:bg, color:"white", border:"2px solid white",
        display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
        boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}>
      {children}
    </button>
  );
}
