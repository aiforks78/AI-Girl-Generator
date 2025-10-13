export interface Env {
  GIRL_R2: any; // R2Bucket type only available in Cloudflare Workers runtime
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string; // store as encrypted Worker secret
}

const LOOKUP_CACHE_TTL_MS = 30_000;
const LOOKUP_CACHE_NEGATIVE_TTL_MS = 5_000;

interface LookupCacheEntry {
  value: { key: string; contentType?: string } | null;
  expires: number;
}

const lookupCache = new Map<string, LookupCacheEntry>();

function getLookupCache(id: string) {
  const entry = lookupCache.get(id);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    lookupCache.delete(id);
    return null;
  }
  return entry.value;
}

function setLookupCache(id: string, value: { key: string; contentType?: string } | null, ttl: number) {
  lookupCache.set(id, { value, expires: Date.now() + ttl });
  if (lookupCache.size > 10_000) {
    const entries = Array.from(lookupCache.entries());
    entries.sort((a, b) => a[1].expires - b[1].expires);
    while (lookupCache.size > 8_000 && entries.length) {
      const [key] = entries.shift()!;
      lookupCache.delete(key);
    }
  }
}

function extFromContentType(ct?: string) {
  if (!ct) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('png')) return 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  return 'bin';
}

async function lookup(env: Env, shortId: string): Promise<{ key: string; contentType?: string } | null> {
  const cached = getLookupCache(shortId);
  if (cached !== null) {
    return cached;
  }
  // Query Supabase REST for mapping
  const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/public_cdn_keys?select=object_key,content_type&short_id=eq.${encodeURIComponent(shortId)}&limit=1`;
  const res = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!res.ok) {
    setLookupCache(shortId, null, LOOKUP_CACHE_NEGATIVE_TTL_MS);
    return null;
  }
  const arr = await res.json();
  if (Array.isArray(arr) && arr[0] && arr[0].object_key) {
    const value = { key: arr[0].object_key as string, contentType: arr[0].content_type as string | undefined };
    setLookupCache(shortId, value, LOOKUP_CACHE_TTL_MS);
    return value;
  }
  setLookupCache(shortId, null, LOOKUP_CACHE_NEGATIVE_TTL_MS);
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Expect path: /web-cdn/:ns/:env/:id.ext
    const parts = url.pathname.replace(/^\/+/, '').split('/');
    if (parts.length < 4 || parts[0] !== 'web-cdn') return new Response('Not Found', { status: 404 });
    const idWithExt = parts[3];
    const id = idWithExt.split('.')[0];

    const map = await lookup(env, id);
    if (!map) return new Response('Not Found', { status: 404 });

    const obj = await env.GIRL_R2.get(map.key);
    if (!obj) return new Response('Not Found', { status: 404 });

    const ct = map.contentType || obj.httpMetadata?.contentType || 'application/octet-stream';
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('Content-Type', ct);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(obj.body, { headers, status: 200 });
  }
}
