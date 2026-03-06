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
    <svg viewBox="0 0 120 320" className="w-40" style={{ maxHeight: 380 }}>
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
      {/* torso shape */}
      <path
        d={`M ${cx - 22} 68 
            Q ${cx - 24} 100 ${cx - 16} 128 
            Q ${cx - 10} 138 ${cx} 138 
            Q ${cx + 10} 138 ${cx + 16} 128 
            Q ${cx + 24} 100 ${cx + 22} 68 
            Q ${cx + 14} 63 ${cx} 63 
            Q ${cx - 14} 63 ${cx - 22} 68 Z`}
        fill="url(#bodyGrad)"
      />
      {/* collar bone hint */}
      <path d={`M ${cx - 13} 65 Q ${cx} 68 ${cx + 13} 65`} stroke={shadow} strokeWidth="0.7" fill="none" opacity="0.5" />

      {/* ── ARMS ── */}
      {/* left upper arm */}
      <path d={`M ${cx - 22} 68 Q ${cx - 34} 82 ${cx - 30} 108`} stroke={skin} strokeWidth="13" fill="none" strokeLinecap="round" />
      {/* left forearm */}
      <path d={`M ${cx - 30} 108 Q ${cx - 28} 128 ${cx - 26} 140`} stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />
      {/* left hand */}
      <ellipse cx={cx - 26} cy={143} rx={5} ry={6} fill={skin} />

      {/* right upper arm */}
      <path d={`M ${cx + 22} 68 Q ${cx + 34} 82 ${cx + 30} 108`} stroke={skin} strokeWidth="13" fill="none" strokeLinecap="round" />
      {/* right forearm */}
      <path d={`M ${cx + 30} 108 Q ${cx + 28} 128 ${cx + 26} 140`} stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />
      {/* right hand */}
      <ellipse cx={cx + 26} cy={143} rx={5} ry={6} fill={skin} />

      {/* ── HIPS / PELVIS ── */}
      <path
        d={`M ${cx - 16} 128 Q ${cx - 20} 148 ${cx - 18} 158 Q ${cx - 8} 162 ${cx} 162 Q ${cx + 8} 162 ${cx + 18} 158 Q ${cx + 20} 148 ${cx + 16} 128 Z`}
        fill={skin}
      />

      {/* ── LEGS ── */}
      {/* left thigh */}
      <path d={`M ${cx - 18} 158 Q ${cx - 18} 202 ${cx - 14} 220`} stroke={skin} strokeWidth="14" fill="none" strokeLinecap="round" />
      {/* left shin */}
      <path d={`M ${cx - 14} 220 Q ${cx - 12} 250 ${cx - 11} 268`} stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />

      {/* right thigh */}
      <path d={`M ${cx + 18} 158 Q ${cx + 18} 202 ${cx + 14} 220`} stroke={skin} strokeWidth="14" fill="none" strokeLinecap="round" />
      {/* right shin */}
      <path d={`M ${cx + 14} 220 Q ${cx + 12} 250 ${cx + 11} 268`} stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />

      {/* ── FEET ── */}
      <ellipse cx={cx - 11} cy={272} rx={8} ry={5} fill={skin} />
      <ellipse cx={cx - 14} cy={274} rx={5} ry={3.5} fill={shadow} opacity="0.4" />
      <ellipse cx={cx + 11} cy={272} rx={8} ry={5} fill={skin} />
      <ellipse cx={cx + 14} cy={274} rx={5} ry={3.5} fill={shadow} opacity="0.4" />
    </svg>
  );
}