import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// SSRF guard: block requests to private/loopback/link-local/cloud-metadata hosts
const BLOCKED_HOSTS = ['169.254.169.254', '169.254.170.2', 'metadata.google.internal'];
const PRIVATE_PATTERNS = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\./, /^::1$/, /^fc00:/i, /^fe80:/i];

async function assertSafeUrl(url) {
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
  // Resolve DNS and check the IP isn't private — prevents DNS rebinding tricks
  try {
    const addrs = await Deno.resolveDns(hostname, 'A');
    const ipv6 = await Deno.resolveDns(hostname, 'AAAA').catch(() => []);
    const allIps = [...addrs, ...ipv6];
    if (allIps.some(ip => BLOCKED_HOSTS.includes(ip) || PRIVATE_PATTERNS.some(p => p.test(ip)))) {
      throw new Error('Resolved to private IP');
    }
  } catch (e) {
    if (e.message.startsWith('Blocked') || e.message.startsWith('Resolved') || e.message === 'Invalid URL') throw e;
    // DNS resolution failed — let fetch handle it
  }
  return parsed.href;
}

async function isDirectImageUrl(url) {
  // Check if the URL looks like a direct image (common image CDN patterns or extensions)
  const imageExtensions = /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i;
  const imageCdns = /\/(cdn|media|images?|static|assets?|upload|photos?)\//i;
  return imageExtensions.test(url) || imageCdns.test(url);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { image_url } = await req.json();

    if (!image_url) {
      return Response.json({ error: 'image_url is required' }, { status: 400 });
    }

    let finalImageUrl = await assertSafeUrl(image_url);

    // Try to fetch directly first
    const tryFetch = async (rawUrl) => {
      const url = await assertSafeUrl(rawUrl);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) throw new Error('not-image');
      return res;
    };

    let imageRes = null;

    // If it looks like a direct image URL, try fetching it
    if (await isDirectImageUrl(image_url)) {
      try {
        imageRes = await tryFetch(image_url);
      } catch { /* fall through to AI extraction */ }
    }

    // If not a direct image or fetch failed, use AI to extract the product image URL from the page
    if (!imageRes) {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `I need the direct image URL for the main product photo on this page. Look at the page source/metadata and return ONLY the absolute URL of the largest/main product image (must end in .jpg, .jpeg, .png, .webp or contain image CDN patterns). No explanation, just the URL. Page: ${image_url}`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });
      const extracted = (typeof result === 'string' ? result : '').trim().split('\n')[0].trim();
      if (extracted && extracted.startsWith('http')) {
        try {
          finalImageUrl = await assertSafeUrl(extracted);
        } catch {
          return Response.json({ error: 'Could not access the image. Please right-click the product image on the website, select "Copy image address", and paste that URL instead.' }, { status: 400 });
        }
        try {
          imageRes = await tryFetch(finalImageUrl);
        } catch {
          return Response.json({ error: 'Could not access the image. Please right-click the product image on the website, select "Copy image address", and paste that URL instead.' }, { status: 400 });
        }
      } else {
        return Response.json({ error: 'Could not find a product image at this URL. Please right-click the product image on the website, select "Copy image address", and paste that URL instead.' }, { status: 400 });
      }
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imageRes.arrayBuffer();
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