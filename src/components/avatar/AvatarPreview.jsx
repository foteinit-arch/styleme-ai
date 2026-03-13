export default function AvatarPreview({ profile = {}, overlayItems = [] }) {
  const {
    skin_tone = "medium",
    hair_color = "#3b1f0a",
    avatar_photo_url,
  } = profile;

  const skinColors = {
    light: "#FDDBB4",
    "medium-light": "#F5C5A3",
    medium: "#D4956A",
    "medium-dark": "#A0694A",
    dark: "#6B3F2A",
  };
  const skin = skinColors[skin_tone] || skinColors.medium;
  const shadow = skinColors[skin_tone] === skinColors.light ? "#e8b48a" : "#8a5030";

  // ── Body proportion calculations ──
  const { bust_cm = 90, waist_cm = 70, hips_cm = 96, height_cm = 168 } = profile;

  // Linear interpolation helper
  const lerp = (val, inMin, inMax, outMin, outMax) => {
    const t = Math.max(0, Math.min(1, (val - inMin) / (inMax - inMin)));
    return outMin + t * (outMax - outMin);
  };

  const shoulderHW = lerp(bust_cm, 60, 140, 15, 25);   // half-width at shoulders
  const waistHW    = lerp(waist_cm, 50, 130, 10, 30);  // half-width at waist
  const hipHW      = lerp(hips_cm,  70, 150, 18, 36);  // half-width at hips

  // Leg length based on height (legs start at y=158, end at y=268 by default → span 110px)
  const legSpan = lerp(height_cm, 140, 210, 85, 130);
  const thighEnd  = 158 + legSpan * 0.55;  // ~60% thigh
  const shinEnd   = 158 + legSpan;         // full leg end
  const footY     = shinEnd + 4;

  // Torso bottom y stays fixed relative to waist/hip; torso starts at y=63
  const torsoTop = 63;
  const torsoBottom = 128; // where torso meets hip
  const hipBottom   = 158;

  // Arm start follows shoulder width
  const armStartX = shoulderHW + 2;

  if (avatar_photo_url) {
    return (
      <div className="relative flex flex-col items-center">
        <div className="relative w-48 h-80 rounded-2xl overflow-hidden border-2 border-rose-200 shadow">
          <img src={avatar_photo_url} alt="avatar" className="w-full h-full object-cover object-top" />
        </div>
        {overlayItems.map((item, i) => (
          <img
            key={i}
            src={item.processed_image_url || item.original_image_url}
            alt="clothing"
            className="absolute pointer-events-none"
            style={{
              left: item.x || "10%",
              top: item.y || "20%",
              width: (item.scale || 1) * 80,
              transform: `rotate(${item.rotation || 0}deg)`,
              zIndex: item.z_index || 1,
            }}
          />
        ))}
        <p className="mt-3 text-xs text-gray-400">Photo uploaded ✓</p>
      </div>
    );
  }

  // viewBox 0 0 120 320
  const cx = 60;

  return (
    <svg viewBox={`0 0 120 ${Math.ceil(footY + 20)}`} className="w-40" style={{ maxHeight: 420 }}>
      <defs>
        <radialGradient id="faceGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={shadow} />
        </radialGradient>
        <radialGradient id="bodyGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={shadow} />
        </radialGradient>
      </defs>

      {/* ── HAIR (back layer) ── */}
      <ellipse cx={cx} cy={28} rx={21} ry={25} fill={hair_color} />
      {/* hair sides */}
      <ellipse cx={cx - 18} cy={38} rx={5} ry={14} fill={hair_color} />
      <ellipse cx={cx + 18} cy={38} rx={5} ry={14} fill={hair_color} />

      {/* ── HEAD ── */}
      <ellipse cx={cx} cy={32} rx={18} ry={21} fill="url(#faceGrad)" />

      {/* ── EARS ── */}
      <ellipse cx={cx - 17} cy={35} rx={3} ry={4.5} fill={skin} />
      <ellipse cx={cx + 17} cy={35} rx={3} ry={4.5} fill={skin} />

      {/* ── EYEBROWS ── */}
      <path d={`M ${cx - 9} 24 Q ${cx - 6} 22 ${cx - 3} 24`} stroke={hair_color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d={`M ${cx + 3} 24 Q ${cx + 6} 22 ${cx + 9} 24`} stroke={hair_color} strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── EYES ── */}
      {/* whites */}
      <ellipse cx={cx - 6} cy={29} rx={4} ry={3} fill="white" />
      <ellipse cx={cx + 6} cy={29} rx={4} ry={3} fill="white" />
      {/* irises */}
      <circle cx={cx - 6} cy={29} r={2.2} fill="#5b7fa6" />
      <circle cx={cx + 6} cy={29} r={2.2} fill="#5b7fa6" />
      {/* pupils */}
      <circle cx={cx - 6} cy={29} r={1.1} fill="#222" />
      <circle cx={cx + 6} cy={29} r={1.1} fill="#222" />
      {/* upper eyelid lines */}
      <path d={`M ${cx - 10} 27 Q ${cx - 6} 25.5 ${cx - 2} 27`} stroke="#555" strokeWidth="0.8" fill="none" />
      <path d={`M ${cx + 2} 27 Q ${cx + 6} 25.5 ${cx + 10} 27`} stroke="#555" strokeWidth="0.8" fill="none" />

      {/* ── NOSE ── */}
      <path d={`M ${cx} 32 L ${cx - 2.5} 38 Q ${cx} 39.5 ${cx + 2.5} 38`} stroke={shadow} strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* ── LIPS ── */}
      {/* upper lip */}
      <path d={`M ${cx - 5} 43 Q ${cx - 2.5} 41.5 ${cx} 43 Q ${cx + 2.5} 41.5 ${cx + 5} 43`} fill="#c4705a" />
      {/* lower lip */}
      <path d={`M ${cx - 5} 43 Q ${cx} 47 ${cx + 5} 43`} fill="#d4826b" />
      {/* lip line */}
      <line x1={cx - 5} y1={43} x2={cx + 5} y2={43} stroke="#a0523e" strokeWidth="0.5" />

      {/* ── NECK ── */}
      <rect x={cx - 6} y={51} width={12} height={13} rx={4} fill={skin} />

      {/* ── SHOULDERS / TORSO ── */}
      <path
        d={`M ${cx - armStartX} ${torsoTop + 5}
            Q ${cx - armStartX - 2} ${(torsoTop + torsoBottom) / 2} ${cx - waistHW} ${torsoBottom - 5}
            Q ${cx - waistHW + 2} ${torsoBottom + 5} ${cx} ${torsoBottom + 5}
            Q ${cx + waistHW - 2} ${torsoBottom + 5} ${cx + waistHW} ${torsoBottom - 5}
            Q ${cx + armStartX + 2} ${(torsoTop + torsoBottom) / 2} ${cx + armStartX} ${torsoTop + 5}
            Q ${cx + shoulderHW} ${torsoTop} ${cx} ${torsoTop}
            Q ${cx - shoulderHW} ${torsoTop} ${cx - armStartX} ${torsoTop + 5} Z`}
        fill="url(#bodyGrad)"
      />
      {/* collar bone hint */}
      <path d={`M ${cx - shoulderHW + 4} ${torsoTop + 2} Q ${cx} ${torsoTop + 5} ${cx + shoulderHW - 4} ${torsoTop + 2}`} stroke={shadow} strokeWidth="0.7" fill="none" opacity="0.5" />

      {/* ── ARMS ── */}
      {/* left upper arm */}
      <path d={`M ${cx - armStartX} ${torsoTop + 5} Q ${cx - armStartX - 12} ${torsoTop + 19} ${cx - armStartX - 8} ${torsoTop + 45}`} stroke={skin} strokeWidth="13" fill="none" strokeLinecap="round" />
      {/* left forearm */}
      <path d={`M ${cx - armStartX - 8} ${torsoTop + 45} Q ${cx - armStartX - 6} ${torsoTop + 65} ${cx - armStartX - 4} ${torsoTop + 77}`} stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />
      {/* left hand */}
      <ellipse cx={cx - armStartX - 4} cy={torsoTop + 80} rx={5} ry={6} fill={skin} />

      {/* right upper arm */}
      <path d={`M ${cx + armStartX} ${torsoTop + 5} Q ${cx + armStartX + 12} ${torsoTop + 19} ${cx + armStartX + 8} ${torsoTop + 45}`} stroke={skin} strokeWidth="13" fill="none" strokeLinecap="round" />
      {/* right forearm */}
      <path d={`M ${cx + armStartX + 8} ${torsoTop + 45} Q ${cx + armStartX + 6} ${torsoTop + 65} ${cx + armStartX + 4} ${torsoTop + 77}`} stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />
      {/* right hand */}
      <ellipse cx={cx + armStartX + 4} cy={torsoTop + 80} rx={5} ry={6} fill={skin} />

      {/* ── HIPS / PELVIS ── */}
      <path
        d={`M ${cx - waistHW} ${torsoBottom - 5} Q ${cx - hipHW - 2} ${(torsoBottom + hipBottom) / 2} ${cx - hipHW + 2} ${hipBottom} Q ${cx - 8} ${hipBottom + 4} ${cx} ${hipBottom + 4} Q ${cx + 8} ${hipBottom + 4} ${cx + hipHW - 2} ${hipBottom} Q ${cx + hipHW + 2} ${(torsoBottom + hipBottom) / 2} ${cx + waistHW} ${torsoBottom - 5} Z`}
        fill={skin}
      />

      {/* ── LEGS ── */}
      {/* left thigh */}
      <path d={`M ${cx - hipHW + 2} ${hipBottom} Q ${cx - hipHW + 2} ${(hipBottom + thighEnd) / 2} ${cx - hipHW + 6} ${thighEnd}`} stroke={skin} strokeWidth="14" fill="none" strokeLinecap="round" />
      {/* left shin */}
      <path d={`M ${cx - hipHW + 6} ${thighEnd} Q ${cx - hipHW + 8} ${(thighEnd + shinEnd) / 2} ${cx - hipHW + 9} ${shinEnd}`} stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />

      {/* right thigh */}
      <path d={`M ${cx + hipHW - 2} ${hipBottom} Q ${cx + hipHW - 2} ${(hipBottom + thighEnd) / 2} ${cx + hipHW - 6} ${thighEnd}`} stroke={skin} strokeWidth="14" fill="none" strokeLinecap="round" />
      {/* right shin */}
      <path d={`M ${cx + hipHW - 6} ${thighEnd} Q ${cx + hipHW - 8} ${(thighEnd + shinEnd) / 2} ${cx + hipHW - 9} ${shinEnd}`} stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />

      {/* ── FEET ── */}
      <ellipse cx={cx - hipHW + 9} cy={footY} rx={8} ry={5} fill={skin} />
      <ellipse cx={cx - hipHW + 6} cy={footY + 2} rx={5} ry={3.5} fill={shadow} opacity="0.4" />
      <ellipse cx={cx + hipHW - 9} cy={footY} rx={8} ry={5} fill={skin} />
      <ellipse cx={cx + hipHW - 6} cy={footY + 2} rx={5} ry={3.5} fill={shadow} opacity="0.4" />
    </svg>
  );
}