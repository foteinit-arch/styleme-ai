import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { image_url } = await req.json();

    if (!image_url) {
      return Response.json({ error: 'image_url is required' }, { status: 400 });
    }

    // Fetch the image server-side (no CORS restrictions)
    const res = await fetch(image_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': new URL(image_url).origin,
      },
    });

    if (!res.ok) {
      return Response.json({ error: `Failed to fetch image: ${res.status}` }, { status: 400 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    const blob = new Blob([buffer], { type: contentType });
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const file = new File([blob], `proxied.${ext}`, { type: contentType });

    // Upload to base44 storage
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});