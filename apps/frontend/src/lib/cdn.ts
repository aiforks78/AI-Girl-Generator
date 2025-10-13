import { createClient } from '@supabase/supabase-js';

function randomBase62(len = 22) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '';
  const bytes = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && (crypto as any).getRandomValues) {
    (crypto as any).getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function cdnEnabled() {
  return String(process.env.CDN_ENABLED).toLowerCase() === 'true' && !!process.env.CDN_DOMAIN;
}

function watermarkEnforced(): boolean {
  const v = String(process.env.WATERMARK_ALL || 'true').toLowerCase();
  // default to true; only an explicit 'false' disables enforcement
  return v !== 'false';
}

export function buildCdnUrl(shortId: string) {
  // If watermarking is enforced, always serve through our image route
  if (watermarkEnforced()) {
    return `/img/${shortId}`;
  }
  // Else: Prefer CDN when configured
  const domain = process.env.CDN_DOMAIN || '';
  if (!domain) return `/img/${shortId}`;
  const base = `https://${domain}`;
  const ns = process.env.CDN_NAMESPACE || 'pollo';
  const env = process.env.CDN_ENV || 'production';
  const ext = '.png';
  // format: /web-cdn/<ns>/<env>/<id>.png
  return `${base}/web-cdn/${ns}/${env}/${shortId}${ext}`;
}

export async function createCdnMapping({ objectKey, contentType, userId, jobId }:{ objectKey: string; contentType?: string; userId?: string; jobId?: number }): Promise<string> {
  const publicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  try {
    const shortId = randomBase62(26);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await supabase
      .from('public_cdn_keys')
      .insert({ short_id: shortId, object_key: objectKey, content_type: contentType || 'image/png', user_id: userId || null, job_id: jobId || null });
    if (!error) {
      // If CDN configured, return full CDN URL; else return local route
      return buildCdnUrl(shortId);
    }
    // insert failed → fall back
  } catch (e) {
    // ignore
  }
  // Fallback: always go through our /img route using direct objectKey to ensure
  // watermarking and preview resizing still apply even without a DB mapping row.
  const sid = randomBase62(10);
  return `/img/${sid}?key=${encodeURIComponent(objectKey)}`;
}
