import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { image_url } = await req.json();
    if (!image_url) return Response.json({ error: 'image_url is required' }, { status: 400 });

    const apiKey = Deno.env.get("REMOVEBG_API_KEY");
    if (!apiKey) return Response.json({ error: 'remove.bg key not configured' }, { status: 500 });

    const formData = new FormData();
    formData.append("image_url", image_url);
    formData.append("size", "auto");

    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: formData,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return Response.json({ error: `remove.bg failed (${res.status})`, detail }, { status: res.status });
    }

    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': blob.type || 'image/png' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});