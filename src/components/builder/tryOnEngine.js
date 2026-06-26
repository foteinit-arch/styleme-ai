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

// Describe garments in text (avoids passing garment photos as identity references).
async function describeGarments(items) {
  const urls = items.map(i => i.processed_image_url || i.original_image_url).filter(Boolean);
  if (!urls.length) return "";
  const list = items.map((i, n) => `${n + 1}. ${i.category}${i.color ? ` in ${i.color}` : ""}${i.name ? ` — "${i.name}"` : ""}`).join("\n");
  const result = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: `Look at these ${urls.length} clothing item image(s). They correspond to:\n${list}\n\nFor each item, provide an extremely detailed and precise fashion description including: exact garment type and silhouette, all colors, fabric texture, ALL distinctive details (fringe, embroidery, cutouts, ruffles, buttons, asymmetry, prints), neckline, sleeve type, hem style, length, and fit. Number each item. Be exhaustive — miss nothing.`,
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

  const prompt = `You are generating a professional fashion photo. The reference image shows a specific real person. You MUST reproduce that exact person — identical face structure, skin tone, hair color and style, eye color, and body proportions. Do NOT substitute a different person or model.

The person should be wearing EXACTLY this outfit — reproduce every detail faithfully:
${garmentDescription}

${layering}

${measurements}

${avatarDescription ? `Person description for reference: ${avatarDescription}` : ""}

Requirements:
- Face and physical appearance MUST exactly match the reference image person
- Garments MUST match the descriptions precisely — do not simplify or omit distinctive details
- Garments MUST be fitted to the person's real body proportions, draping naturally
- Pure white background
- Full body visible from top of head to feet, no cropping
- Professional fashion editorial photo style${emphasisBlock}`;

  const { url } = await base44.integrations.Core.GenerateImage({
    prompt,
    existing_image_urls: avatarUrl ? [avatarUrl] : [],
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

// Quality gate (kept consistent with existing TryOnModal scoring).
export async function scoreResult(avatarUrl, generatedUrl) {
  try {
    const scores = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `Compare image 1 (original avatar) and image 2 (AI-generated try-on result). Score each dimension from 1 to 10 as integers: identity_match (face/hair/skin/body — 10 identical), garment_visible (clothes clearly visible/well-rendered), full_body_framing (full body head to toe, no cropping). Return ONLY a JSON object with keys: identity_match, garment_visible, full_body_framing.`,
      file_urls: [avatarUrl, generatedUrl],
      response_json_schema: {
        type: "object",
        properties: {
          identity_match: { type: "integer" },
          garment_visible: { type: "integer" },
          full_body_framing: { type: "integer" },
        },
      },
    });
    return scores;
  } catch {
    return { identity_match: 10, garment_visible: 10, full_body_framing: 10 };
  }
}

export function buildEmphasis(scores) {
  const failing = [];
  if ((scores?.identity_match ?? 10) < 7) failing.push("CRITICAL: The output person MUST have the identical face, hair, and skin tone as the person in the reference image. Do not change any facial features.");
  if ((scores?.garment_visible ?? 10) < 7) failing.push("Make sure the outfit is clearly visible and well-rendered on the person.");
  if ((scores?.full_body_framing ?? 10) < 7) failing.push("Show the complete full body from head to feet without any cropping.");
  return failing.join(" ");
}
