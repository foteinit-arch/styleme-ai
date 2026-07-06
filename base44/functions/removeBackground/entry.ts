import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// SSRF guard: block private/loopback/link-local/cloud-metadata hosts before
// delegating the URL to the third-party remove.bg API.
const BLOCKED_HOSTS = ['169.254.169.254', '169.254.170.2', 'metadata.google.internal'];
const PRIVATE_PATTERNS = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\./, /^::1$/, /^fc00:/i, /^fe80:/i];

function assertSafeUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Invalid URL'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http/https protocols allowed');
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTS.includes(hostname) || hostname === 'localhost') {
    throw new Error('Blocked host');
  }
  if (PRIVATE_PATTERNS.some(p => p.test(hostname))) {
    throw new Error('Blocked private host');
  }
  return parsed.href;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { image_url } = await req.json();
    if (!image_url) return Response.json({ error: 'image_url is required' }, { status: 400 });

    // Validate before delegating to remove.bg to prevent blind SSRF
    const safeUrl = assertSafeUrl(image_url);

    const apiKey = Deno.env.get("REMOVEBG_API_KEY");
    if (!apiKey) return Response.json({ error: 'remove.bg key not configured' }, { status: 500 });

    const formData = new FormData();
    formData.append("image_url", safeUrl);
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