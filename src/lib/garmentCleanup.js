import { base44 } from "@/api/base44Client";

// Prompt used to turn a photo of a garment worn by a person into a
// clean "ghost mannequin" product shot with nobody inside it.
export const GHOST_MANNEQUIN_PROMPT = `Convert this photo into a clean e-commerce "ghost mannequin" product image of the garment alone.

- Show ONLY the garment, shaped as if worn by an invisible mannequin: no person, no face, no head, no hair, no hands, no arms, no legs, no feet, no visible skin anywhere.
- Keep the garment itself EXACTLY as it is: same design, cut, color, fabric, pattern, print, buttons, seams, labels, trims and proportions. Do not restyle, recolor, recrop the design or invent details.
- Fill any opening where a body would show (neckline, sleeves, hems) with the garment's own fabric or empty white space - never with skin.
- Shoes and bags: show the item alone, nothing inside or around it.
- Place it centered on a pure white (#ffffff) background, soft even studio lighting, no shadows, no props, no text, no watermarks.`;

// True when a human being (or part of one) is visible in the photo.
export async function detectPerson(imageUrl) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Look closely at this clothing photo and decide whether any part of a human being is visible: a face, head, hair, hands, arms, legs, feet, or bare skin showing through or around the garment.

Answer has_person = true only when a person or part of a person can be seen.
Answer has_person = false for a garment on a hanger, a flat lay, an empty mannequin, or a plain product shot with nobody in it.`,
    file_urls: [imageUrl],
    response_json_schema: {
      type: "object",
      properties: {
        has_person: { type: "boolean" },
        what_is_visible: { type: "string" },
      },
      required: ["has_person"],
    },
  });
  return Boolean(result?.has_person);
}

// Re-draw the photo as an invisible-mannequin product shot. Returns the new URL.
export async function makeGhostMannequin(imageUrl) {
  const { url } = await base44.integrations.Core.GenerateImage({
    prompt: GHOST_MANNEQUIN_PROMPT,
    existing_image_urls: [imageUrl],
  });
  return url;
}

// Only photos with a person in them get re-drawn; everything else keeps its
// original pixels so flat lays and hanger shots stay true to the real garment.
export async function prepareGarmentImage(imageUrl) {
  let hasPerson = true;
  try {
    hasPerson = await detectPerson(imageUrl);
  } catch (e) {
    // Detection failed: fall back to the old behaviour and clean the photo anyway.
    // eslint-disable-next-line no-console
    console.warn("[garmentCleanup] person detection failed:", e?.message);
    hasPerson = true;
  }

  if (!hasPerson) return { garmentUrl: imageUrl, personRemoved: false };

  const url = await makeGhostMannequin(imageUrl);
  return { garmentUrl: url || imageUrl, personRemoved: Boolean(url) };
}