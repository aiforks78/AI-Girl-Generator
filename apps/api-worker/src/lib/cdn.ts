import { SupabaseAdminClient, SupabaseEnv } from "./supabase";
import { logger } from "./logger";
import { cachedEncodeURIComponent } from "./url-cache";

export interface CdnEnv extends SupabaseEnv {
  CDN_ENABLED?: string;
  CDN_DOMAIN?: string;
  CDN_NAMESPACE?: string;
  CDN_ENV?: string;
  WATERMARK_ALL?: string;
  R2_PUBLIC_BASE_URL?: string;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
}

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function createShortId(length = 26): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE62[bytes[i] % BASE62.length];
  }
  return out;
}

export function watermarkEnforced(env: CdnEnv): boolean {
  const value = (env.WATERMARK_ALL ?? "true").toLowerCase();
  return value !== "false";
}

export function buildCdnUrl(env: CdnEnv, shortId: string): string {
  if (watermarkEnforced(env)) {
    return `/img/${shortId}`;
  }

  if (!env.CDN_DOMAIN) {
    return `/img/${shortId}`;
  }

  const domain = env.CDN_DOMAIN.replace(/\/$/, "");
  const base = domain.startsWith("http") ? domain : `https://${domain}`;
  const ns = env.CDN_NAMESPACE || "pollo";
  const stage = env.CDN_ENV || "production";
  return `${base}/web-cdn/${ns}/${stage}/${shortId}.png`;
}

function sanitizeBaseUrl(url?: string): string {
  if (!url) return "";
  return url.trim().replace(/\/$/, "");
}

export function resolvePublicUrl(env: CdnEnv, objectKey: string): string {
  const explicit = sanitizeBaseUrl(env.R2_PUBLIC_BASE_URL);
  if (explicit) {
    return `${explicit}/${objectKey}`;
  }

  const account = sanitizeBaseUrl(env.R2_ACCOUNT_ID);
  const bucket = sanitizeBaseUrl(env.R2_BUCKET_NAME);
  if (account && bucket) {
    return `https://${bucket}.${account}.r2.cloudflarestorage.com/${objectKey}`;
  }

  return objectKey;
}

export async function createCdnMapping(
  env: CdnEnv,
  options: { objectKey: string; contentType?: string; userId?: string; jobId?: number }
): Promise<string> {
  const supabase = new SupabaseAdminClient(env);
  const shortId = createShortId();

  try {
    logger.debug("[cdn] creating mapping", {
      shortId,
      objectKey: options.objectKey,
      userId: options.userId,
      jobId: options.jobId
    });

    await supabase.insert(
      "public_cdn_keys",
      {
        short_id: shortId,
        object_key: options.objectKey,
        content_type: options.contentType || "image/png",
        user_id: options.userId || null,
        job_id: options.jobId || null
      },
      { prefer: "return=minimal" }
    );

    const cdnUrl = buildCdnUrl(env, shortId);
    logger.debug("[cdn] mapping created successfully", cdnUrl);
    return cdnUrl;
  } catch (error) {
    console.error("[cdn] mapping insert failed", error);
  }

  const fallbackId = createShortId(12);
  const fallbackUrl = `/img/${fallbackId}?key=${cachedEncodeURIComponent(options.objectKey)}`;
  logger.warn("[cdn] using fallback URL:", fallbackUrl);
  return fallbackUrl;
}
