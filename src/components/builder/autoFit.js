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
function visibleBox(img) {
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

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return FULL_BOX;
  return { left: minX / w, top: minY / h, right: (maxX + 1) / w, bottom: (maxY + 1) / h };
}

// Natural size of an image plus the box its visible content occupies.
export async function measureImage(url) {
  if (!url) return { width: 1, height: 1, aspect: 1, content: FULL_BOX };
  if (sizeCache.has(url)) return sizeCache.get(url);

  let img = null;
  let content = FULL_BOX;
  try {
    img = await loadImage(url, true);
    content = visibleBox(img);
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
- shoulder_y: vertical position of the top of the shoulders, 0 at the top edge, 100 at the bottom edge.
- shoulder_width: width across the shoulders as a percentage of the image width.
- waist_y: vertical position of the narrowest point of the waist.
- hip_width: width across the hips as a percentage of the image width.
- ankle_y: vertical position of the ankles / where the feet meet the legs. If the photo is cropped above the feet, use 100.
- framing: "full_body" if head and feet are both visible, "three_quarter" if the person is cropped between the knees and the feet, "upper_body" if cropped at or above the waist.
- person_visible: false only when no person can be seen at all.

Estimate carefully from the actual photo. Do not default every value.`,
    file_urls: [avatarUrl],
    response_json_schema: {
      type: "object",
      properties: {
        person_visible: { type: "boolean" },
        center_x: { type: "number" },
        shoulder_y: { type: "number" },
        shoulder_width: { type: "number" },
        waist_y: { type: "number" },
        hip_width: { type: "number" },
        ankle_y: { type: "number" },
        framing: { type: "string" },
      },
      required: ["person_visible"],
    },
  });

  const body = result?.person_visible === false ? null : {
    center_x: clamp(result?.center_x ?? 50, 20, 80),
    shoulder_y: clamp(result?.shoulder_y ?? 28, 5, 60),
    shoulder_width: clamp(result?.shoulder_width ?? 40, 15, 80),
    waist_y: clamp(result?.waist_y ?? 45, 20, 75),
    hip_width: clamp(result?.hip_width ?? 42, 15, 80),
    ankle_y: clamp(result?.ankle_y ?? 92, 60, 100),
  };

  bodyCache.set(avatarUrl, body);
  return body;
}

// How each category is anchored on the body.
const FIT_RULES = {
  top:       { by: "width",  ref: "shoulder_width", factor: 1.2,  anchor: "shoulder_y", offset: 0 },
  outerwear: { by: "width",  ref: "shoulder_width", factor: 1.35, anchor: "shoulder_y", offset: -1 },
  dress:     { by: "height", from: "shoulder_y", to: "ankle_y", factor: 0.97 },
  bottom:    { by: "height", from: "waist_y", to: "ankle_y", factor: 0.97 },
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

  // Sizes are for the visible garment, as percentages of the stage.
  let contentW;
  let contentH;
  if (rule.by === "height") {
    contentH = Math.max(6, (body[rule.to] - body[rule.from]) * rule.factor);
    contentW = contentH / avatarAspect * (cw / ch) * (1 / imgRatio);
  } else {
    contentW = body[rule.ref] * rule.factor;
    contentH = contentW * avatarAspect * (ch / cw) * imgRatio;
  }
  contentW = clamp(contentW, 5, 90);

  // The image frame around that visible garment.
  const frameW = contentW / cw;
  const frameH = contentH / ch;

  const contentX = category === "bag" ? body.center_x + body.shoulder_width * 0.55 : body.center_x;
  let contentY;
  if (rule.by === "height") {
    contentY = body[rule.from] + contentH / 2;
  } else {
    contentY = rule.bottom
      ? body[rule.anchor] + rule.offset - contentH / 2
      : body[rule.anchor] + rule.offset + contentH / 2;
  }

  // Shift the frame so the visible garment sits on the body, not the padding.
  const x = contentX + (0.5 - (box.left + box.right) / 2) * frameW;
  const y = contentY + (0.5 - (box.top + box.bottom) / 2) * frameH;

  return {
    x: round1(clamp(x, 2, 98)),
    y: round1(clamp(y, 0, 100)),
    scale: Number(clamp(frameW / baseWidth, 0.25, 4).toFixed(2)),
    rotation: 0,
  };
}

// Fit one garment to the body. Returns null when the body map isn't available yet,
// so the caller can fall back to the plain default placement.
export async function fitItem(item, ctx) {
  if (!ctx?.body) return null;
  const garment = await measureImage(item.processed_image_url || item.original_image_url);
  return fitPlacement({ category: item.category, garment, avatar: ctx.avatar, body: ctx.body });
}