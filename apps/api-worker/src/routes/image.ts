import { json } from "../lib/response";
import type { SupabaseEnv } from "../lib/supabase";
import { SupabaseAdminClient } from "../lib/supabase";
import { TTLCache } from "../lib/ttl-cache";
import { logger } from "../lib/logger";
import { cachedEncodeURIComponent } from "../lib/url-cache";

const STANDARD_WIDTHS = [256, 512, 1024, 1536, 2048];
const STANDARD_QUALITIES = [70, 80, 90, 95];
const DEFAULT_WATERMARK_VERSION = "v5";
const OBJECT_LOOKUP_CACHE_TTL_MS = 30_000;
const OBJECT_LOOKUP_NEGATIVE_TTL_MS = 5_000;

interface ObjectLookupCacheValue {
  objectKey: string;
  contentType: string;
  error?: string;
}

const objectLookupCache = new TTLCache<string, ObjectLookupCacheValue>(OBJECT_LOOKUP_CACHE_TTL_MS);

export interface ImageEnv extends SupabaseEnv {
  R2_PUBLIC_BASE_URL?: string;
  R2_ENDPOINT?: string;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_PREFIX?: string;
  WATERMARK_VERSION?: string;
  WATERMARK_ALL?: string;
  WATERMARK_IMAGE_URL?: string;
  WATERMARK_SCALE?: string;
  WATERMARK_OPACITY?: string;
  WATERMARK_OFFSET_X?: string;
  WATERMARK_OFFSET_Y?: string;
  RAW_DOWNLOAD_SECRET?: string;
}

interface LookupResult {
  object_key: string;
  content_type: string | null;
}

function getDefaultCache(): Cache | null {
  try {
    const storage = (globalThis as unknown as { caches?: CacheStorage & { default?: Cache } }).caches;
    if (storage && "default" in storage && (storage as any).default) {
      return (storage as any).default as Cache;
    }
  } catch {
    // ignore
  }
  return null;
}

export function handleImageOptions(request: Request): Response | null {
  const url = new URL(request.url);
  if (request.method !== "OPTIONS" || !url.pathname.startsWith("/img/")) {
    return null;
  }

  const origin = request.headers.get("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    }
  });
}

export async function handleImageRequest(request: Request, env: ImageEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/img/")) {
    return null;
  }

  if (request.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405, corsHeaders(request));
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return json({ error: "INVALID_PATH" }, 400, corsHeaders(request));
  }

  const idSegment = segments[1];
  const normalizedId = idSegment.replace(/\.[a-z0-9]{2,5}$/i, "");
  const directKey = url.searchParams.get("key");
  const preview = url.searchParams.get("preview") === "1";
  const raw = url.searchParams.get("raw") === "1";
  const wmParam = url.searchParams.get("wm") || undefined;
  const widthParam = url.searchParams.get("w") || undefined;
  const qualityParam = url.searchParams.get("q") || undefined;
  const fmtParam = url.searchParams.get("fmt") || undefined;
  const dprParam = url.searchParams.get("dpr") || undefined;

  if (preview && raw) {
    return json({ error: "PREVIEW_RAW_CONFLICT" }, 400, corsHeaders(request));
  }

  const { objectKey, contentType, error } = await resolveObjectKey(normalizedId, directKey, env);
  if (error) {
    console.warn("[image] resolve failed:", { normalizedId, directKey, error });
    const status = error === "NOT_FOUND" ? 404 : 400;
    return json({ error }, status, corsHeaders(request));
  }

  const publicBase = resolvePublicBase(env);
  if (!publicBase) {
    return json({ error: "R2_PUBLIC_BASE_UNSET" }, 500, corsHeaders(request));
  }

  if (raw) {
    const ok = await validateRawAccess(objectKey, url, env);
    if (!ok) {
      return json({ error: "UNAUTHORIZED" }, 401, corsHeaders(request));
    }
    return fetchRawAsset(publicBase, objectKey, contentType, request, env);
  }

  return processTransformedImage({
    request,
    env,
    publicBase,
    objectKey,
    contentType,
    params: {
      width: widthParam,
      quality: qualityParam,
      format: fmtParam,
      dpr: dprParam,
      watermarkOverride: wmParam,
      preview
    }
  });
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin"
  };
}

async function resolveObjectKey(id: string, directKey: string | null, env: ImageEnv): Promise<{ objectKey: string; contentType: string; error?: string }> {
  if (id === "direct") {
    if (!directKey) {
      console.warn("[image/direct] missing key parameter");
      return { objectKey: "", contentType: "", error: "MISSING_KEY" };
    }
    const sanitized = sanitizeDirectKey(directKey);
    if (!sanitized) {
      console.warn("[image/direct] invalid key after sanitization:", { directKey, sanitized });
      return { objectKey: "", contentType: "", error: "INVALID_KEY" };
    }
    logger.debug("[image/direct] resolved key", { directKey, sanitized });
    return { objectKey: sanitized, contentType: "image/png" };
  }

  try {
    const cacheKey = `short:${id}`;
    const cached = objectLookupCache.get(cacheKey);
    if (cached) {
      if (cached.error) {
        return { objectKey: "", contentType: "", error: cached.error };
      }
      return { objectKey: cached.objectKey, contentType: cached.contentType };
    }

    const supabase = new SupabaseAdminClient(env);
    const row = await supabase.selectSingle<LookupResult>(
      `public_cdn_keys?select=object_key,content_type&short_id=eq.${cachedEncodeURIComponent(id)}`
    );
    if (!row) {
      objectLookupCache.set(cacheKey, { objectKey: "", contentType: "", error: "NOT_FOUND" }, OBJECT_LOOKUP_NEGATIVE_TTL_MS);
      return { objectKey: "", contentType: "", error: "NOT_FOUND" };
    }
    const value = {
      objectKey: row.object_key,
      contentType: row.content_type || "image/png"
    };
    objectLookupCache.set(cacheKey, value);
    return value;
  } catch (err) {
    console.error("[image] lookup failed", err);
    const cacheKey = `short:${id}`;
    objectLookupCache.set(cacheKey, { objectKey: "", contentType: "", error: "LOOKUP_FAILED" }, OBJECT_LOOKUP_NEGATIVE_TTL_MS);
    return { objectKey: "", contentType: "", error: "LOOKUP_FAILED" };
  }
}

function sanitizeDirectKey(key: string): string | null {
  const normalized = key.replace(/^\/+/, "");
  // Check for path traversal attempts
  if (normalized.includes("../") || normalized.startsWith("../") || normalized === ".." ||
      normalized.includes("/./") || normalized.startsWith("./") || normalized === ".") {
    console.warn("[sanitizeDirectKey] path traversal detected:", normalized);
    return null;
  }
  return normalized;
}

function resolvePublicBase(env: ImageEnv): string | null {
  if (env.R2_PUBLIC_BASE_URL) {
    return env.R2_PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  if (env.R2_ENDPOINT) {
    return env.R2_ENDPOINT.replace(/\/$/, "");
  }

  if (env.R2_ACCOUNT_ID && env.R2_BUCKET_NAME) {
    return `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  return null;
}

interface TransformOptions {
  request: Request;
  env: ImageEnv;
  publicBase: string;
  objectKey: string;
  contentType: string;
  params: {
    width?: string;
    quality?: string;
    format?: string;
    dpr?: string;
    watermarkOverride?: string;
    preview: boolean;
  };
}

async function processTransformedImage(options: TransformOptions): Promise<Response> {
  const { request, env, publicBase, objectKey, contentType, params } = options;

  const width = standardizeWidth(params.width);
  const quality = standardizeQuality(params.quality);
  const format = params.format || "auto";
  const dpr = Math.min(parseInt(params.dpr || "", 10) || 1, 3);

  const override = params.watermarkOverride?.trim().toLowerCase();
  const watermarkVersion = override && override !== "off"
    ? params.watermarkOverride!
    : env.WATERMARK_VERSION || DEFAULT_WATERMARK_VERSION;
  const watermarkEnabled = shouldApplyWatermark(params, env);

  const cacheKey = buildCacheKey(objectKey, { width, quality, format, dpr, watermark: watermarkEnabled ? watermarkVersion : "none" });
  const cache = getDefaultCache();
  if (cache) {
    const cacheRequest = new Request(`https://cache.girlgenerator.net/${cacheKey}`);
    const cached = await cache.match(cacheRequest);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }
  }

  const sourceUrl = `${publicBase}/${objectKey.replace(/^\/+/, "")}`;
  const cfOptions: RequestInit = {
    cf: {
      cacheTtl: 31536000,
      cacheKey,
      image: buildImageOptions({ width, quality, format, dpr, watermarkEnabled, env, watermarkVersion })
    }
  } as RequestInit;

  let upstream: Response;
  try {
    upstream = await fetch(sourceUrl, cfOptions);
  } catch (err) {
    console.error("[image] fetch failed", err);
    return json({ error: "UPSTREAM_FETCH_FAILED" }, 502, corsHeaders(request));
  }

  if (!upstream.ok || !upstream.body) {
    return json({ error: "UPSTREAM_INVALID" }, upstream.status || 502, corsHeaders(request));
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || contentType || "image/png");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Vary", "Accept, DPR");
  headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
  headers.set("X-Processing-Method", "worker");
  headers.set("X-Cache", "MISS");
  if (watermarkEnabled) {
    headers.set("X-Watermark-Version", watermarkVersion);
    headers.set("X-Watermark", "cloudflare-draw");
  } else {
    headers.set("X-Watermark", "disabled");
  }

  const response = new Response(upstream.body, {
    status: upstream.status,
    headers
  });

  if (cache) {
    const cacheRequest = new Request(`https://cache.girlgenerator.net/${cacheKey}`);
    await cache.put(cacheRequest, response.clone());
  }

  return response;
}

function buildCacheKey(objectKey: string, opts: { width: number; quality: number; format: string; dpr: number; watermark: string }): string {
  return `img:${objectKey}:w${opts.width}:q${opts.quality}:fmt${opts.format}:dpr${opts.dpr}:wm${opts.watermark}`;
}

function buildImageOptions({
  width,
  quality,
  format,
  dpr,
  watermarkEnabled,
  env,
  watermarkVersion
}: {
  width: number;
  quality: number;
  format: string;
  dpr: number;
  watermarkEnabled: boolean;
  env: ImageEnv;
  watermarkVersion: string;
}) {
  const image: Record<string, unknown> = {
    fit: "scale-down",
    width,
    quality,
    format,
    dpr
  };

  if (watermarkEnabled) {
    image.draw = [createWatermarkDrawOptions(env, width)];
  }

  return image;
}

function shouldApplyWatermark(options: { watermarkOverride?: string; preview: boolean }, env: ImageEnv): boolean {
  const override = options.watermarkOverride?.trim().toLowerCase();
  if (override === "off" || override === "none" || override === "false") {
    return false;
  }

  const globalSetting = (env.WATERMARK_ALL ?? "true").toLowerCase();
  if (globalSetting === "false") {
    return false;
  }

  return true;
}

function createWatermarkDrawOptions(env: ImageEnv, imageWidth: number) {
  const watermarkUrl = env.WATERMARK_IMAGE_URL || "https://api.girlgenerator.net/assets/wm.png";
  const scale = Math.max(0.05, parseFloat(env.WATERMARK_SCALE || "0.175"));
  const opacity = Math.min(1, Math.max(0, parseFloat(env.WATERMARK_OPACITY || "0.5")));
  const offsetX = parseInt(env.WATERMARK_OFFSET_X || "12", 10);
  const offsetY = parseInt(env.WATERMARK_OFFSET_Y || "12", 10);
  const width = Math.round(imageWidth * scale);

  return {
    url: watermarkUrl,
    opacity,
    right: offsetX,
    top: offsetY,
    width
  };
}

function standardizeWidth(value?: string): number {
  const requested = parseInt(value || "", 10) || 1024;
  return STANDARD_WIDTHS.find((width) => width >= requested) || STANDARD_WIDTHS[STANDARD_WIDTHS.length - 1];
}

function standardizeQuality(value?: string): number {
  const requested = parseInt(value || "", 10) || 90;
  return STANDARD_QUALITIES.find((quality) => quality >= requested) || STANDARD_QUALITIES[STANDARD_QUALITIES.length - 1];
}

async function validateRawAccess(objectKey: string, url: URL, env: ImageEnv): Promise<boolean> {
  const secret = env.RAW_DOWNLOAD_SECRET;

  // Local development mode: allow access if RAW_DOWNLOAD_SECRET is not configured
  if (!secret) {
    console.warn("[image] RAW_DOWNLOAD_SECRET not configured, allowing access for local development");
    return true;
  }

  const signature = url.searchParams.get("sig");
  const expParam = url.searchParams.get("exp");

  if (!signature || !expParam) {
    return false;
  }

  const expiry = parseInt(expParam, 10);
  if (!Number.isFinite(expiry) || Date.now() > expiry * 1000) {
    return false;
  }

  const expected = await generateUrlSignature(objectKey, expiry, secret);
  return expected === signature;
}

async function generateUrlSignature(objectKey: string, exp: number, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${objectKey}:${exp}`);
  const keyData = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchRawAsset(base: string, objectKey: string, contentType: string, request: Request, env: ImageEnv): Promise<Response> {
  // Try R2 binding first for local development
  if (env.R2_PUBLIC) {
    try {
      logger.debug(`[image] Fetching from R2 binding: ${objectKey}`);
      const r2Object = await env.R2_PUBLIC.get(objectKey);

      if (r2Object) {
        const headers = new Headers();
        headers.set("Content-Type", contentType || r2Object.httpMetadata?.contentType || "image/png");
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
        headers.set("X-Processing-Method", "worker-r2-binding");
        headers.set("X-Cache", "MISS");

        return new Response(r2Object.body, {
          status: 200,
          headers
        });
      }
    } catch (err) {
      console.warn("[image] R2 binding failed, falling back to HTTP fetch", err);
    }
  }

  // Fallback to HTTP fetch
  const url = `${base}/${objectKey.replace(/^\/+/, "")}`;
  logger.debug(`[image] Fetching raw asset via HTTP: ${url}`);
  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch (err) {
    console.error("[image] raw fetch failed", err);
    console.error("[image] Failed URL:", url);
    return json({ error: "RAW_FETCH_FAILED" }, 502, corsHeaders(request));
  }

  if (!upstream.ok || !upstream.body) {
    return json({ error: "RAW_FETCH_INVALID" }, upstream.status || 502, corsHeaders(request));
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || contentType || "image/png");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
  headers.set("X-Processing-Method", "worker-raw");
  headers.set("X-Cache", "MISS");

  return new Response(upstream.body, {
    status: upstream.status,
    headers
  });
}
