// SVG-based avatar that morphs based on measurements & appearance
export default function AvatarPreview({ profile = {}, overlayItems = [] }) {
  const {
    height_cm = 165,
    bust_cm = 88,
    waist_cm = 68,
    hips_cm = 94,
    skin_tone = "medium",
    hair_color = "#3b1f0a",
    body_shape = "hourglass",
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

  // Normalize measurements to SVG coordinates (viewBox 0 0 200 400)
  const heightScale = (height_cm - 140) / 70; // 0..1
  const totalH = 320 + heightScale * 40;
  const bustW = 28 + (bust_cm - 70) / 80 * 22;
  const waistW = 18 + (waist_cm - 50) / 80 * 16;
  const hipW = 30 + (hips_cm - 70) / 80 * 24;

  const cx = 100;
  const headY = 20;
  const neckY = headY + 38;
  const shoulderY = neckY + 14;
  const waistY = shoulderY + 80;
  const hipY = waistY + 50;
  const kneeY = hipY + 70;
  const footY = kneeY + (60 + heightScale * 20);

  // Body path: shoulders → waist → hips
  const bodyPath = `
    M ${cx - bustW} ${shoulderY}
    Q ${cx - waistW - 6} ${waistY - 20} ${cx - waistW} ${waistY}
    Q ${cx - waistW - 4} ${waistY + 20} ${cx - hipW} ${hipY}
    L ${cx - hipW + 10} ${kneeY}
    L ${cx - 12} ${kneeY}
    L ${cx - 10} ${waistY + 10}
    L ${cx + 10} ${waistY + 10}
    L ${cx + 12} ${kneeY}
    L ${cx + hipW - 10} ${kneeY}
    L ${cx + hipW} ${hipY}
    Q ${cx + waistW + 4} ${waistY + 20} ${cx + waistW} ${waistY}
    Q ${cx + waistW + 6} ${waistY - 20} ${cx + bustW} ${shoulderY}
    Z
  `;

  const leftLeg = `M ${cx - 12} ${kneeY} L ${cx - 14} ${footY} L ${cx - 2} ${footY} L ${cx} ${kneeY}`;
  const rightLeg = `M ${cx + 2} ${kneeY} L ${cx + 4} ${footY} L ${cx + 16} ${footY} L ${cx + 14} ${kneeY}`;
  const leftArm = `M ${cx - bustW} ${shoulderY} Q ${cx - bustW - 20} ${shoulderY + 40} ${cx - bustW - 10} ${waistY + 10}`;
  const rightArm = `M ${cx + bustW} ${shoulderY} Q ${cx + bustW + 20} ${shoulderY + 40} ${cx + bustW + 10} ${waistY + 10}`;

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

  return (
    <svg viewBox={`0 0 200 ${footY + 20}`} className="w-48" style={{ maxHeight: 360 }}>
      {/* Hair */}
      <ellipse cx={cx} cy={headY + 10} rx={22} ry={26} fill={hair_color} />
      {/* Head */}
      <ellipse cx={cx} cy={headY + 14} rx={18} ry={20} fill={skin} />
      {/* Eyes */}
      <ellipse cx={cx - 6} cy={headY + 12} rx={2.5} ry={2} fill="#333" />
      <ellipse cx={cx + 6} cy={headY + 12} rx={2.5} ry={2} fill="#333" />
      {/* Mouth */}
      <path d={`M ${cx - 5} ${headY + 22} Q ${cx} ${headY + 26} ${cx + 5} ${headY + 22}`} stroke="#c97" strokeWidth="1.5" fill="none" />
      {/* Neck */}
      <rect x={cx - 6} y={neckY - 2} width={12} height={16} rx={5} fill={skin} />
      {/* Body */}
      <path d={bodyPath} fill={skin} />
      {/* Arms */}
      <path d={leftArm} stroke={skin} strokeWidth={12} fill="none" strokeLinecap="round" />
      <path d={rightArm} stroke={skin} strokeWidth={12} fill="none" strokeLinecap="round" />
      {/* Legs */}
      <path d={leftLeg} fill={skin} />
      <path d={rightLeg} fill={skin} />
      {/* Feet */}
      <ellipse cx={cx - 8} cy={footY} rx={8} ry={4} fill={skin} />
      <ellipse cx={cx + 8} cy={footY} rx={8} ry={4} fill={skin} />
    </svg>
  );
}