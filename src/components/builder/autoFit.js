import { base44 } from "@/api/base44Client";
import { CATEGORY_BASE_WIDTH } from "@/components/builder/outfitLayout";

// Auto-fit: reads the body landmarks out of the avatar photo once, then sizes and
// places each garment on that body so the user never has to drag or resize it.
//
// Cutouts are transparent PNGs with a lot of empty margin, so we also measure the
// visible part of each garment. Fitting the visible garment (not the padded frame)
// is what makes it land on the body at the right size.

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round1 = (v) => Number(v.toFixed(1));

const FULL_BOX = { left: 0, top: 0, right: 1, bottom: 1 };
const sizeCache = new Map();
const bodyCache = new Map();

function loadImage(url, cors) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

// Visible bounds of the non-transparent pixels, as fractions of the frame.
function scanVisible(img) {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const scale = Math.min(1, 200 / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const rowMin = new Array(h).fill(-1);
  const rowMax = new Array(h).fill(-1);
  let minY = h;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (rowMin[y] < 0) rowMin[y] = x;
        rowMax[y] = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxY < 0) return { box: FULL_BOX };

  let minX = w;
  let maxX = -1;
  for (let y = minY; y <= maxY; y++) {
    if (rowMin[y] < 0) continue;
    if (rowMin[y] < minX) minX = rowMin[y];
    if (rowMax[y] > maxX) maxX = rowMax[y];
  }

  return {
    box: { left: minX / w, top: minY / h, right: (maxX + 1) / w, bottom: (maxY + 1) / h },
  };
}

// Natural size of an image plus the box its visible content occupies.
export async function measureImage(url) {
  if (!url) return { width: 1, height: 1, aspect: 1, content: FULL_BOX };
  if (sizeCache.has(url)) return sizeCache.get(url);

  let img = null;
  let content = FULL_BOX;
  try {
    img = await loadImage(url, true);
    ({ box: content } = scanVisible(img));
  } catch (e) {
    // CORS or decode trouble: measure the frame only.
    img = await loadImage(url, false).catch(() => null);
  }
  if (!img) {
    const size = { width: 1, height: 1, aspect: 1, content: FULL_BOX };
    sizeCache.set(url, size);
    return size;
  }

  const size = {
    width: img.naturalWidth || 1,
    height: img.naturalHeight || 1,
    aspect: (img.naturalWidth || 1) / (img.naturalHeight || 1),
    content,
  };
  sizeCache.set(url, size);
  return size;
}

// Where the body sits in the avatar photo, as percentages of the image.
export async function detectBody(avatarUrl) {
  if (!avatarUrl) return null;
  if (bodyCache.has(avatarUrl)) return bodyCache.get(avatarUrl);

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are measuring a photo of a person for a virtual fitting. All answers are percentages of the IMAGE, never pixels.

- center_x: horizontal centre of the person's body, 0 at the left edge, 100 at the right edge.
- head_top_y: vertical position of the top of the head.
- shoulder_y: vertical position of the top of the shoulders.
- shoulder_width: width across the shoulders as a percentage of the image width.
- waist_y: vertical position of the narrowest point of the waist.
- waist_width: width across the waist as a percentage of the image width.
- hip_width: width across the hips as a percentage of the image width.
- ankle_y: vertical position of the ankles / where the feet meet the legs. If the photo is cropped above the feet, use 100.
- feet_y: vertical position of the bottom of the feet or shoes.
- framing: "full_body" if head and feet are both visible, "three_quarter" if the person is cropped between the knees and the feet, "upper_body" if cropped at or above the waist.
- person_visible: false only when no person can be seen at all.

Estimate carefully from the actual photo. Do not default every value.`,
    file_urls: [avatarUrl],
    response_json_schema: {
      type: "object",
      properties: {
        person_visible: { type: "boolean" },
        center_x: { type: "number" },
        head_top_y: { type: "number" },
        shoulder_y: { type: "number" },
        shoulder_width: { type: "number" },
        waist_y: { type: "number" },
        waist_width: { type: "number" },
        hip_width: { type: "number" },
        ankle_y: { type: "number" },
        feet_y: { type: "number" },
        framing: { type: "string" },
      },
      required: ["person_visible"],
    },
  });

  let body = null;
  if (result?.person_visible !== false) {
    const framing = result?.framing || "full_body";
    const headTop = clamp(result?.head_top_y ?? 4, 0, 60);
    const feetY = clamp(result?.feet_y ?? 97, 40, 100);
    const shoulderWidth = clamp(result?.shoulder_width ?? 40, 15, 80);
    const hipWidth = clamp(result?.hip_width ?? 42, 15, 80);

    let shoulderY = clamp(result?.shoulder_y ?? 28, 5, 60);
    let waistY = clamp(result?.waist_y ?? 45, 20, 75);
    let ankleY = clamp(result?.ankle_y ?? 92, 60, 100);

    // Standing figures follow head-count proportions closely, so a single misread
    // landmark is pulled back into the plausible band for that body.
    const bodyHeight = feetY - headTop;
    if (framing === "full_body" && bodyHeight > 20) {
      shoulderY = clamp(shoulderY, headTop + bodyHeight * 0.15, headTop + bodyHeight * 0.24);
      waistY = clamp(waistY, headTop + bodyHeight * 0.32, headTop + bodyHeight * 0.46);
      ankleY = clamp(ankleY, headTop + bodyHeight * 0.88, feetY);
    }

    body = {
      center_x: clamp(result?.center_x ?? 50, 20, 80),
      shoulder_y: shoulderY,
      shoulder_width: shoulderWidth,
      waist_y: waistY,
      waist_width: clamp(result?.waist_width ?? hipWidth * 0.85, 10, 80),
      hip_width: hipWidth,
      ankle_y: ankleY,
    };
  }

  bodyCache.set(avatarUrl, body);
  return body;
}

// How each category is anchored on the body. Short pieces are sized by a body width
// (shoulders, hips). Long pieces (dresses, trousers) are sized by how much of the body
// they cover: the hem lands on the ankle and the width follows the cutout's own shape,
// so nothing gets squashed into a narrow strip.
const FIT_RULES = {
  top:       { by: "width",  ref: "shoulder_width", factor: 1.2,  anchor: "shoulder_y", offset: 0 },
  outerwear: { by: "width",  ref: "shoulder_width", factor: 1.35, anchor: "shoulder_y", offset: -1 },
  dress:     { by: "height", span: ["shoulder_y", "ankle_y"], anchor: "shoulder_y", maxW: 1.8,  minW: 0.95 },
  bottom:    { by: "height", span: ["waist_y", "ankle_y"],    anchor: "waist_y",    maxW: 1.6,  minW: 0.9 },
  underwear: { by: "width",  ref: "hip_width",      factor: 0.95, anchor: "waist_y",    offset: -1 },
  shoes:     { by: "width",  ref: "hip_width",      factor: 0.55, anchor: "ankle_y",    offset: 1, bottom: true },
  bag:       { by: "width",  ref: "shoulder_width", factor: 0.42, anchor: "waist_y",    offset: 12 },
  accessory: { by: "width",  ref: "shoulder_width", factor: 0.32, anchor: "shoulder_y", offset: -2 },
};

export function fitPlacement({ category, garment, avatar, body }) {
  const baseWidth = CATEGORY_BASE_WIDTH[category] ?? 30;
  const rule = FIT_RULES[category];
  if (!rule || !body) return null;

  const box = garment?.content || FULL_BOX;
  const cw = Math.max(0.05, box.right - box.left);
  const ch = Math.max(0.05, box.bottom - box.top);
  const imgRatio = (garment?.height || 1) / (garment?.width || 1);
  const avatarAspect = avatar?.aspect || 1;

  // Sizes are for the whole image frame, as percentages of the stage.
  let frameW;
  let frameH;
  const stretch = 1;

  if (rule.by === "height") {
    // Height first: the piece covers the body from its anchor down to the ankle. The
    // width then comes from the cutout's own shape, so a dress keeps its real
    // silhouette instead of being stretched or squeezed to hit a width.
    const shape = cw / (ch * imgRatio); // visible width / height of the garment
    let spanH = Math.max(8, body[rule.span[1]] - body[rule.span[0]]);
    let spanW = (spanH * shape) / avatarAspect;

    // Guard rails: nothing wider than a generous skirt, nothing thinner than the waist.
    const maxW = body.hip_width * rule.maxW;
    const minW = (body.waist_width ?? body.hip_width * 0.8) * rule.minW;
    if (spanW > maxW) {
      spanW = maxW;
      spanH = (spanW * avatarAspect) / shape;
    } else if (spanW < minW) {
      spanW = minW;
      spanH = (spanW * avatarAspect) / shape;
    }
    frameW = spanW / cw;
  } else {
    const contentW = clamp(body[rule.ref] * rule.factor, 5, 90);
    frameW = contentW / cw;
  }

  // A narrow cutout needs a large scale. The frame is taken from the scale we end up
  // with, so the clamp can never shrink the garment after it has been sized.
  const scale = Number(clamp(frameW / baseWidth, 0.1, 12).toFixed(2));
  frameW = baseWidth * scale;
  frameH = frameW * avatarAspect * imgRatio;

  const contentH = frameH * ch * stretch;
  const contentX = category === "bag" ? body.center_x + body.shoulder_width * 0.55 : body.center_x;
  let contentY;
  if (rule.by === "height") {
    // Top of the garment sits on its body landmark.
    contentY = body[rule.anchor] + contentH / 2;
  } else {
    contentY = rule.bottom
      ? body[rule.anchor] + rule.offset - contentH / 2
      : body[rule.anchor] + rule.offset + contentH / 2;
  }

  // Shift the frame so the visible garment sits on the body, not the padding.
  const x = contentX + (0.5 - (box.left + box.right) / 2) * frameW;
  const y = contentY + (0.5 - (box.top + box.bottom) / 2) * frameH * stretch;

  return {
    x: round1(clamp(x, 2, 98)),
    y: round1(clamp(y, 0, 100)),
    scale,
    rotation: 0,
    stretch,
  };
}

// Fit one garment to the body. Returns null when the body map isn't available yet,
// so the caller can fall back to the plain default placement.
export async function fitItem(item, ctx) {
  if (!ctx?.body) return null;
  const garment = await measureImage(item.processed_image_url || item.original_image_url);
  return fitPlacement({ category: item.category, garment, avatar: ctx.avatar, body: ctx.body });
}