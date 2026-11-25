import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai@6.45.0';

// How each garment category is actually worn, so the render layers pieces correctly.
const ROLES = {
  underwear: "worn as the innermost base layer",
  top: "worn on the upper body",
  bottom: "worn on the lower body",
  dress: "worn as a one-piece dress covering the torso and legs",
  outerwear: "worn as the outermost layer, over everything else",
  shoes: "worn on the feet",
  bag: "held in one hand at hip level",
  accessory: "worn as an accessory",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { avatar_url, items = [] } = await req.json();
    if (!avatar_url) return Response.json({ error: 'avatar_url is required' }, { status: 400 });

    const garments = items
      .filter((i) => i?.image_url)
      .slice(0, 6);
    if (garments.length === 0) {
      return Response.json({ error: 'Pick at least one garment first' }, { status: 400 });
    }

    const garmentLines = garments
      .map((g, i) => {
        const role = ROLES[g.category] || "worn as part of the outfit";
        return `- IMAGE ${i + 2}: ${g.name || g.category} — ${role}. Reproduce this exact garment: same colour, fabric, print, cut and details.`;
      })
      .join("\n");

    const prompt = [
      "Virtual try-on photo editing task.",
      "IMAGE 1 is the person. Keep their face, hair, skin tone, body shape, height and pose exactly as they are, in the same setting, with the same full-body framing (head to feet) and the same lighting.",
      "Remove the clothing the person is currently wearing and dress them only in the garments shown in the other images:",
      garmentLines,
      "Layer the pieces the way they would really be worn, in this order: base layer closest to the body, then top and bottom or dress, then outerwear, shoes on the feet, bags held at hip level.",
      "The garments must sit on the person's body with realistic proportions, drape and fabric folds. None of the person's own clothing may remain visible. Do not add any other clothing, logos or text.",
      "Photorealistic, sharp focus, natural lighting, no illustration or CGI look.",
    ].join("\n");

    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    const client = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers, maxRetries: 0 });

    const { data } = await client.images.generate({
      model: "automatic",
      prompt,
      n: 1,
      response_format: "url",
      aspect_ratio: "3:4",
      resolution: "1K",
      reference_image_urls: [avatar_url, ...garments.map((g) => g.image_url)],
    });

    const image_url = data?.[0]?.url;
    if (!image_url) return Response.json({ error: 'No image was returned' }, { status: 502 });

    return Response.json({ image_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});