import { base44 } from "@/api/base44Client";

// ── Category grouping helpers ────────────────────────────────────────────────
// Builder/entity categories: top, bottom, dress, outerwear, shoes, accessory, underwear, bag
export const BODY_CATEGORIES   = ["top", "bottom", "dress", "outerwear", "underwear"];
export const ON_BODY_EXTRA     = ["shoes"]; // worn on the avatar, not "around" it
export const AROUND_CATEGORIES = ["accessory", "bag"]; // magazine-style around the avatar

export function isDress(category)     { return category === "dress"; }
export function isTop(category)       { return category === "top"; }
export function isBottom(category)    { return category === "bottom"; }
export function isShoe(category)      { return category === "shoes"; }
export function isAround(category)    { return AROUND_CATEGORIES.includes(category); }

// Given the list of currently picked items, figure out what (if anything) the
// look still needs before it is "complete".
// Returns { complete: boolean, hint: string|null }
export function getCompletionState(picked) {
  const cats = picked.map(p => p.category);
  const hasDress  = cats.includes("dress");
  const hasTop    = cats.includes("top");
  const hasBottom = cats.includes("bottom");

  // A dress is a complete one-piece look on its own.
  if (hasDress) {
    return { complete: true, hint: null };
  }

  // No body garment at all yet.
  if (!hasTop && !hasBottom) {
    // Only accessories/shoes picked — still needs a base outfit.
    if (picked.length > 0) {
      return { complete: false, hint: "Add a top and a bottom (or a dress) to complete the look" };
    }
    return { complete: false, hint: null };
  }

  if (hasTop && !hasBottom) {
    return { complete: false, hint: "Add a bottom to complete the look" };
  }
  if (hasBottom && !hasTop) {
    return { complete: false, hint: "Add a top to complete the look" };
  }

  // top + bottom present
  return { complete: true, hint: null };
}

// ── Prompt building ──────────────────────────────────────────────────────────
function measurementsBlock(profile) {
  if (!profile) return "";
  const parts = [];
  if (profile.height_cm) parts.push(`height ${profile.height_cm} cm`);
  if (profile.bust_cm)   parts.push(`bust ${profile.bust_cm} cm`);
  if (profile.waist_cm)  parts.push(`waist ${profile.waist_cm} cm`);
  if (profile.hips_cm)   parts.push(`hips ${profile.hips_cm} cm`);
  if (profile.body_shape) parts.push(`${profile.body_shape} body shape`);
  if (!parts.length) return "";
  return `The person's real body measurements are: ${parts.join(", ")}. The garments MUST be sized and fitted to match these exact body proportions — drape and fit naturally as real clothes would on this body.`;
}

// Human-readable rule describing how long/where each category sits on the body.
const CATEGORY_LENGTH_RULE = {
  top: "This is a TOP: it covers ONLY the upper body and ends around the waist or hip. It is NOT a dress and must NEVER be rendered as a dress or extended below the hip, no matter how long it looks in the product photo.",
  bottom: "This is a BOTTOM (pants/skirt/shorts): it covers ONLY the lower body from the waist down. It must NEVER be rendered as a top or a full dress.",
  dress: "This is a DRESS: a single one-piece garment covering the torso and extending downward as its photo shows.",
  outerwear: "This is OUTERWEAR: a jacket/coat/cardigan layered OVER other clothing. It is NOT a dress.",
  underwear: "This is UNDERWEAR/base layer worn closest to the body.",
  shoes: "These are SHOES worn on the feet only.",
};

// Describe garments in text (avoids passing garment photos as identity references).
async function describeGarments(items) {
  const urls = items.map(i => i.processed_image_url || i.original_image_url).filter(Boolean);
  if (!urls.length) return "";
  const list = items.map((i, n) => `${n + 1}. category="${i.category}"${i.color ? `, color ${i.color}` : ""}${i.name ? `, name "${i.name}"` : ""} — ${CATEGORY_LENGTH_RULE[i.category] || ""}`).join("\n");
  const result = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: `Look at these ${urls.length} clothing item image(s). They correspond to:\n${list}\n\nFor each item, provide an extremely detailed and precise fashion description including: exact garment type and silhouette, all colors, fabric texture, ALL distinctive details (fringe, embroidery, cutouts, ruffles, buttons, asymmetry, prints), neckline, sleeve type, hem style, length, and fit.\n\nCRITICAL: Respect the stated category for each item. The category is authoritative — describe the item strictly as that category type. A "top" must be described as a top that ends at the waist or hip (never a dress), a "bottom" only as lower-body wear, etc. If a product photo is ambiguous or appears longer than its category, still describe it according to its declared category. Number each item. Be exhaustive — miss nothing.`,
    file_urls: urls,
  });
  return typeof result === "string" ? result : JSON.stringify(result);
}

// Build the layering / tucking guidance from the set of body garments.
function layeringGuidance(bodyItems) {
  const cats = bodyItems.map(i => i.category);
  const notes = [];
  if (cats.includes("top") && cats.includes("bottom")) {
    notes.push("Style the top and bottom together in the most natural, flattering way for these specific garments (decide tucked, half-tucked, or untucked based on the garment types).");
  }
  if (cats.includes("outerwear")) {
    notes.push("Layer the outerwear naturally over the other garments.");
  }
  return notes.join(" ");
}

// Collect the photo URLs of the garments worn on the body (for scoring/refs).
export function wornGarmentUrls(picked) {
  return picked
    .filter(p => BODY_CATEGORIES.includes(p.category) || p.category === "shoes")
    .map(i => i.processed_image_url || i.original_image_url)
    .filter(Boolean);
}

// Generate the avatar wearing the current body+shoe selection.
// `around` items are NOT painted on the body — they are returned for the
// magazine-style layout in the UI.
export async function generateLook({ profile, picked, avatarDescription, extraEmphasis = "" }) {
  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;

  const wornItems = picked.filter(p => BODY_CATEGORIES.includes(p.category) || p.category === "shoes");
  const garmentDescription = await describeGarments(wornItems);
  const layering = layeringGuidance(wornItems);
  const measurements = measurementsBlock(profile);
  const emphasisBlock = extraEmphasis ? ` ${extraEmphasis}` : "";

  // Collect the actual garment photos so the image model can copy each garment
  // visually (image-to-image), instead of relying on a text description alone.
  // Reference image 1 is always the person (identity); references 2+ are the
  // exact garments, in the same order as the rules below.
  const garmentUrls = wornItems
    .map(i => i.processed_image_url || i.original_image_url)
    .filter(Boolean);
  const referenceImages = avatarUrl ? [avatarUrl, ...garmentUrls] : [...garmentUrls];

  // Explicit per-item category enforcement so the model never reinterprets
  // a garment as a different type (e.g. a long top rendered as a dress).
  // Each rule cites the exact reference image the garment is shown in.
  const refOffset = avatarUrl ? 2 : 1; // first garment ref index
  const categoryRules = wornItems
    .map((i, n) => `Item ${n + 1} — ${i.category}${i.name ? ` ("${i.name}")` : ""}, shown in REFERENCE IMAGE ${refOffset + n}: ${CATEGORY_LENGTH_RULE[i.category] || ""}`)
    .join("\n");

  // Generation only runs on a COMPLETE look (a dress, or top+bottom), so there
  // is no "missing layer" to fill. Keep an explicit no-invention instruction.
  const missingLayerRule = "Render ONLY the garments described above. Do NOT add, invent, or substitute any garment that was not provided.";

  const prompt = `You are generating a professional fashion photo by combining several reference images.

REFERENCE IMAGE 1 is a specific real person. You MUST reproduce that EXACT person — identical face structure, skin tone, hair color and style, eye color, and body proportions. Do NOT substitute a different person or model.

REFERENCE IMAGES 2 AND ONWARD are the EXACT garments the person must wear. Reproduce each garment FAITHFULLY and LITERALLY from its reference image — copy the precise shape, silhouette, color, pattern, print, fabric texture, fringe/embroidery/cutouts, neckline, sleeves, hem and all distinctive details EXACTLY as shown. Do NOT redesign, stylize, simplify, or invent a similar-looking garment. The garment in the output must be visually identical to the one in its reference image.

TEXTURE AND PATTERN FIDELITY (critical): Reproduce the garment's surface EXACTLY as in its reference image. If the fabric has a lace, burnout, embroidered, beaded, sequinned, woven, or printed pattern, copy that SAME pattern with the same motif, scale, density and placement — do NOT smooth it into a plain fabric or substitute a generic texture. Match fringe/tassel length, density and the exact asymmetry of the hem. Match the precise shade and any tonal variation of the color. Preserve every distinctive construction detail (keyhole, slits, seams, panels) in the same position. Treat the garment reference like a fabric swatch to be copied, not reinterpreted.

GARMENT MAPPING AND STRICT TYPE RULES (the cited reference image is the source of truth for each garment's appearance; the category rule governs how it sits on the body):
${categoryRules}

Supplementary written descriptions (use only to reinforce, never to override the reference photos):
${garmentDescription}

${missingLayerRule}

${layering}

${measurements}

${avatarDescription ? `Person description for reference image 1: ${avatarDescription}` : ""}

Requirements:
- The person's face and physical appearance MUST exactly match REFERENCE IMAGE 1
- Each garment MUST visually match its cited reference image precisely — same exact garment, not a lookalike
- Each garment MUST be rendered as its stated category/type and length — NEVER convert a top into a dress, never extend a top below the hip, never merge separate garments into a one-piece
- Garments MUST be fitted to the person's real body proportions, draping naturally
- Pure white background
- Full body visible from top of head to feet, no cropping
- Professional fashion editorial photo style${emphasisBlock}`;

  const { url } = await base44.integrations.Core.GenerateImage({
    prompt,
    existing_image_urls: referenceImages,
  });
  return url;
}

// Reuse the existing avatar-description step (kept identical to TryOnModal).
export async function generateAvatarDescription(avatarUrl) {
  if (!avatarUrl) return "";
  const result = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: `Look at this image and write a detailed physical description of the person shown. Cover ALL of these attributes in a single structured paragraph: face shape; skin tone (be specific); hair color, length, style, texture; eye color; eyebrow shape; approximate age range; body proportions and build; height impression; posture and current pose. Be precise. This description will be used to reproduce this exact person in a new AI image.`,
    file_urls: [avatarUrl],
  });
  return typeof result === "string" ? result : JSON.stringify(result);
}

// Quality gate. Compares the result against BOTH the avatar (identity) and the
// actual garment photos (garment fidelity), so a poor texture/pattern match can
// trigger a targeted retry.
export async function scoreResult(avatarUrl, generatedUrl, garmentUrls = []) {
  try {
    const fileUrls = [avatarUrl, generatedUrl, ...garmentUrls];
    const garmentNote = garmentUrls.length
      ? ` Images 3 onward are the ACTUAL garment reference photos. Also score garment_match (1-10): how faithfully the clothing in image 2 reproduces the EXACT garments in images 3+ — same silhouette, color, and especially the same surface pattern/texture, fringe and distinctive details (10 = visually identical garment, not just similar).`
      : "";
    const props = {
      identity_match: { type: "integer" },
      garment_visible: { type: "integer" },
      full_body_framing: { type: "integer" },
    };
    if (garmentUrls.length) props.garment_match = { type: "integer" };
    const scores = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `Compare image 1 (original avatar) and image 2 (AI-generated try-on result). Score each dimension from 1 to 10 as integers: identity_match (face/hair/skin/body — 10 identical), garment_visible (clothes clearly visible/well-rendered), full_body_framing (full body head to toe, no cropping).${garmentNote} Return ONLY a JSON object with keys: identity_match, garment_visible, full_body_framing${garmentUrls.length ? ", garment_match" : ""}.`,
      file_urls: fileUrls,
      response_json_schema: { type: "object", properties: props },
    });
    return scores;
  } catch {
    return { identity_match: 10, garment_visible: 10, full_body_framing: 10, garment_match: 10 };
  }
}

export function buildEmphasis(scores) {
  const failing = [];
  if ((scores?.identity_match ?? 10) < 7) failing.push("CRITICAL: The output person MUST have the identical face, hair, and skin tone as the person in the reference image. Do not change any facial features.");
  if ((scores?.garment_visible ?? 10) < 7) failing.push("Make sure the outfit is clearly visible and well-rendered on the person.");
  if ((scores?.full_body_framing ?? 10) < 7) failing.push("Show the complete full body from head to feet without any cropping.");
  if ((scores?.garment_match ?? 10) < 8) failing.push("CRITICAL GARMENT FIDELITY: The clothing did NOT closely enough match the garment reference photos. Reproduce the EXACT garment from its reference image — copy the precise surface pattern/texture (lace, burnout, embroidery, weave or print) with the same motif, scale and density, the exact fringe length and hem asymmetry, the precise color shade, and every distinctive detail. Do NOT smooth, simplify, or substitute a generic fabric.");
  return failing.join(" ");
}
