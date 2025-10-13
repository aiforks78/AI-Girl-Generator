import { json, jsonWithCors } from "../lib/response";
import { SupabaseAdminClient } from "../lib/supabase";
import type { SupabaseEnv } from "../lib/supabase";
import {
  GIRL_STYLES,
  getStyleOptions,
  isValidStyleId,
  recommendStyle
} from "../lib/girl-styles";
import { normalizeJob } from "../lib/job-normalizer";
import { handleImageRequest, ImageEnv } from "./image";
import { cachedEncodeURIComponent } from "../lib/url-cache";

interface PublicEnv extends SupabaseEnv, ImageEnv {
  R2_PUBLIC_BASE_URL?: string;
  CDN_DOMAIN?: string;
}

const JSON_HEADERS = {
  "Cache-Control": "no-store"
} as const;

const TRACK_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TRACK_RATE_LIMIT_MAX = 100; // matches legacy limiter
const TRACK_RATE_LIMIT_MAX_ENTRIES = 5_000;
const TRACK_RATE_LIMIT_SWEEP_LIMIT = 200;

interface TrackRateEntry {
  count: number;
  reset: number;
  last: number;
}

const trackRateMap = new Map<string, TrackRateEntry>();

export async function handlePublicRequest(request: Request, env: PublicEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS" && isPublicPath(url.pathname)) {
    return handleOptions(request);
  }

  if (request.method === "GET" && isStylesPath(url.pathname)) {
    return handleStyles(url);
  }

  if (request.method === "GET" && isDownloadPath(url.pathname)) {
    return handleDownload(request, env, url);
  }

  if (request.method === "GET" && isPublicGenerationPath(url.pathname)) {
    return handlePublicGeneration(request, url, env);
  }

  if (request.method === "POST" && isPublicTrackPath(url.pathname)) {
    return handlePublicTrack(request, env);
  }

  return null;
}

function isPublicPath(pathname: string): boolean {
  return (
    isStylesPath(pathname) ||
    isDownloadPath(pathname) ||
    isPublicGenerationPath(pathname) ||
    isPublicTrackPath(pathname)
  );
}

function isStylesPath(pathname: string): boolean {
  return pathname === "/styles" || pathname === "/styles/";
}

function isDownloadPath(pathname: string): boolean {
  return pathname === "/download" || pathname === "/download/";
}

function isPublicGenerationPath(pathname: string): boolean {
  return pathname === "/public/generation" || pathname === "/public/generation/";
}

function isPublicTrackPath(pathname: string): boolean {
  return pathname === "/public/track" || pathname === "/public/track/";
}

function handleOptions(request: Request): Response {
  const origin = request.headers.get("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
      "Vary": "Origin",
      "Access-Control-Max-Age": "86400"
    }
  });
}

async function handleStyles(url: URL): Promise<Response> {
  const action = url.searchParams.get("action");
  const prompt = url.searchParams.get("prompt") || undefined;
  const styleId = url.searchParams.get("styleId") || undefined;

  try {
    switch (action) {
      case "recommend": {
        if (!prompt) {
          return json({ success: false, error: "Missing prompt" }, 400, JSON_HEADERS);
        }
        const recommendedStyleId = recommendStyle(prompt);
        const recommendedStyle = GIRL_STYLES[recommendedStyleId];
        return json(
          {
            success: true,
            recommended: {
              id: recommendedStyleId,
              name: recommendedStyle.name,
              description: recommendedStyle.description,
              reason: `Based on your prompt keywords, we recommend the "${recommendedStyle.name}" style`
            }
          },
          200,
          JSON_HEADERS
        );
      }
      case "validate": {
        if (!styleId) {
          return json({ success: false, error: "Missing styleId" }, 400, JSON_HEADERS);
        }
        const valid = isValidStyleId(styleId);
        return json(
          {
            success: true,
            valid,
            style: valid ? GIRL_STYLES[styleId] : null
          },
          200,
          JSON_HEADERS
        );
      }
      case "detail": {
        if (!styleId) {
          return json({ success: false, error: "Missing styleId" }, 400, JSON_HEADERS);
        }
        if (!isValidStyleId(styleId)) {
          return json({ success: false, error: `Invalid style ID: ${styleId}` }, 400, JSON_HEADERS);
        }
        return json(
          {
            success: true,
            style: GIRL_STYLES[styleId]
          },
          200,
          JSON_HEADERS
        );
      }
      default: {
        return json(
          {
            success: true,
            styles: getStyleOptions(),
            total: Object.keys(GIRL_STYLES).length
          },
          200,
          JSON_HEADERS
        );
      }
    }
  } catch (error) {
    console.error("[styles] handler failed", error);
    return json({ success: false, error: "INTERNAL_ERROR" }, 500, JSON_HEADERS);
  }
}

async function handleDownload(request: Request, env: PublicEnv, url: URL): Promise<Response> {
  const sourceUrl = url.searchParams.get("url");
  const nameParam = url.searchParams.get("name") || "image.png";
  if (!sourceUrl) {
    return json({ error: "Missing url" }, 400, JSON_HEADERS);
  }

  const filename = sanitizeFilename(nameParam);

  // Check if this is an internal /img/ request
  if (sourceUrl.startsWith("/img/")) {
    try {
      // Call internal image handler directly to avoid worker self-fetch issues
      const imageUrl = new URL(sourceUrl, `https://${request.headers.get("host") || "api.girlgenerator.net"}`);
      const imageRequest = new Request(imageUrl.toString(), {
        method: "GET",
        headers: request.headers
      });

      const imageResponse = await handleImageRequest(imageRequest, env);
      if (!imageResponse) {
        return json({ error: "Image handler returned null" }, 500, JSON_HEADERS);
      }

      if (!imageResponse.ok || !imageResponse.body) {
        console.error("[download] image handler failed", { status: imageResponse.status });
        return json({ error: "Failed to fetch source file" }, 502, JSON_HEADERS);
      }

      const headers = new Headers(imageResponse.headers);
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      headers.set("Cache-Control", "private, max-age=0, must-revalidate");
      headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
      headers.set("Vary", "Origin");

      if (!headers.get("Content-Type")) {
        headers.set("Content-Type", "application/octet-stream");
      }

      return new Response(imageResponse.body, {
        status: 200,
        headers
      });
    } catch (error) {
      console.error("[download] internal image handler failed", error);
      return json({ error: "Failed to process image" }, 500, JSON_HEADERS);
    }
  }

  // For external URLs, use fetch
  const { targetUrl, host } = resolveTargetUrl(sourceUrl, request.headers.get("host") || "");

  const allowed = buildAllowedHosts(env, request.headers.get("host") || undefined);
  if (!allowed.has(host)) {
    return json({ error: "Forbidden host" }, 403, JSON_HEADERS);
  }

  let upstream: Response;
  try {
    const fetchRequest = new Request(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "GirlGenerator-Download/1.0",
        "Accept": "image/*,*/*"
      }
    });
    upstream = await fetch(fetchRequest);
  } catch (error) {
    console.error("[download] fetch failed", error);
    return json({ error: "Upstream fetch failed" }, 502, JSON_HEADERS);
  }

  if (!upstream.ok || !upstream.body) {
    console.error("[download] upstream not ok", { status: upstream.status, statusText: upstream.statusText });
    return json({ error: "Failed to fetch source file" }, 502, JSON_HEADERS);
  }

  const headers = new Headers(upstream.headers);
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
  headers.set("Vary", "Origin");

  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "application/octet-stream");
  }

  return new Response(upstream.body, {
    status: 200,
    headers
  });
}

async function handlePublicGeneration(request: Request, url: URL, env: PublicEnv): Promise<Response> {
  const pid = url.searchParams.get("pid") || url.searchParams.get("id");
  if (!pid) {
    return jsonWithCors(request, { error: "Invalid id" }, 400, JSON_HEADERS);
  }

  let supabase: SupabaseAdminClient;
  try {
    supabase = new SupabaseAdminClient(env);
  } catch (error) {
    console.error("[public/generation] supabase init failed", error);
    return jsonWithCors(request, { error: "SERVER_CONFIG_ERROR" }, 500, JSON_HEADERS);
  }

  let job: any;
  try {
    const query = `generation_jobs?select=*&public_id=eq.${cachedEncodeURIComponent(pid)}&is_public=eq.true&deleted_at=is.null`;
    job = await supabase.selectSingle(query);
  } catch (error) {
    return jsonWithCors(request, { error: "Not found" }, 404, JSON_HEADERS);
  }

  if (!job) {
    return jsonWithCors(request, { error: "Not found" }, 404, JSON_HEADERS);
  }

  let imageVariants: string[] = [];
  let img2imgVariants: string[] = [];

  try {
    const rows = await supabase.select<any[]>(
      `generation_images?select=url,type,index&job_id=eq.${cachedEncodeURIComponent(String(job.id))}&order=index.asc`
    );
    const stdUrls = rows
      .filter((row) => row.type === "standard")
      .map((row) => row.url)
      .filter(Boolean);
    const hdUrls = rows
      .filter((row) => row.type === "img2img" || row.type === "hd")
      .map((row) => row.url)
      .filter(Boolean);
    imageVariants = dedupeList(stdUrls);
    img2imgVariants = dedupeList(hdUrls);
  } catch (error) {
    console.warn("[public/generation] variant fetch failed", error);
  }

  if (imageVariants.length === 0 && (job.image_url || job.hd_url)) {
    imageVariants = [String(job.image_url || job.hd_url)];
  }

  let userName: string | null = null;
  let userAvatar: string | null = null;
  try {
    if (job.user_id) {
      const user = await supabase.selectSingle<any>(
        `users?select=nickname,avatar_url&uuid=eq.${cachedEncodeURIComponent(String(job.user_id))}`
      );
      if (user) {
        userName = user.nickname || null;
        userAvatar = user.avatar_url || null;
      }
    }
  } catch (error) {
    console.warn("[public/generation] user fetch failed", error);
  }

  const related: Record<string, unknown> = {};
  try {
    // Fetch all source URLs (both external and internal)
    const links = await supabase.select<any[]>(
      `generation_links?select=source_url&child_job_id=eq.${cachedEncodeURIComponent(String(job.id))}&source_url=not.is.null&order=created_at.desc&limit=8`
    );
    const external = dedupeList(
      links
        .map((row) => row.source_url)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    );
    if (external.length > 0) {
      related.external_sources = external;
    }
  } catch (error) {
    console.warn("[public/generation] related fetch failed", error);
  }

  const normalized = normalizeJob({
    ...job,
    image_variants: imageVariants,
    img2img_variants: img2imgVariants,
    user_name: userName,
    user_avatar: userAvatar,
    related
  }) as Record<string, unknown>;

  normalized["image_variants"] = imageVariants;
  normalized["img2img_variants"] = img2imgVariants;
  normalized["prompt"] = job.prompt || job.prompt_enhanced || "";

  const whitelist = new Set([
    "id",
    "status",
    "action",
    "image_url",
    "hd_url",
    "video_url",
    "aspect_ratio",
    "image_width",
    "image_height",
    "model_id",
    "public_id",
    "is_public",
    "created_at",
    "updated_at",
    "image_variants",
    "img2img_variants",
    "user_name",
    "user_avatar",
    "related",
    "prompt"
  ]);

  const publicPayload: Record<string, unknown> = {};
  for (const key of whitelist) {
    if (key in normalized) {
      publicPayload[key] = normalized[key];
    }
  }

  return jsonWithCors(request, { job: publicPayload }, 200, JSON_HEADERS);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function resolveTargetUrl(source: string, selfHost: string): { targetUrl: string; host: string } {
  if (/^https?:\/\//i.test(source)) {
    const parsed = new URL(source);
    return { targetUrl: parsed.toString(), host: parsed.host };
  }

  const base = selfHost ? `https://${selfHost.replace(/\/$/, "")}` : "";
  const target = base ? `${base}${source.startsWith("/") ? source : `/${source}`}` : source;
  const parsed = new URL(target);
  return { targetUrl: parsed.toString(), host: parsed.host };
}

function buildAllowedHosts(env: PublicEnv, selfHost?: string): Set<string> {
  const hosts = new Set<string>();

  const addHost = (input?: string | null) => {
    if (!input) return;
    try {
      const raw = input.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      if (raw) hosts.add(raw);
      if (raw.endsWith(".r2.dev")) {
        hosts.add(raw);
      }
    } catch (error) {
      console.warn("[download] failed to normalize host", input, error);
    }
  };

  addHost(env.R2_PUBLIC_BASE_URL || null);
  addHost(env.CDN_DOMAIN || null);
  if (selfHost) {
    addHost(`https://${selfHost}`);
  }

  return hosts;
}

function dedupeList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

async function handlePublicTrack(request: Request, env: PublicEnv): Promise<Response> {
  let payload: { pid?: unknown; source?: unknown };
  try {
    payload = await request.json();
  } catch (error) {
    return jsonWithCors(request, { success: false, error: "Invalid JSON" }, 400, JSON_HEADERS);
  }

  const pid = typeof payload.pid === "string" ? payload.pid.trim() : "";
  if (!pid) {
    return jsonWithCors(request, { success: false, error: "Missing pid" }, 400, JSON_HEADERS);
  }

  const ip = extractClientIp(request.headers) || "0.0.0.0";
  const rateKey = `${ip}`;
  const rate = checkRateLimit(rateKey);
  if (!rate.allowed) {
    return jsonWithCors(
      request,
      {
        success: false,
        error: "Rate limit",
        retry_after: new Date(rate.reset).toISOString()
      },
      429,
      JSON_HEADERS
    );
  }

  let supabase: SupabaseAdminClient;
  try {
    supabase = new SupabaseAdminClient(env);
  } catch (error) {
    console.error("[public/track] supabase init failed", error);
    return jsonWithCors(request, { success: false, error: "SERVER_CONFIG_ERROR" }, 500, JSON_HEADERS);
  }

  // Dedup within 60 seconds for same pid + ip + ua
  const ua = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const windowIso = new Date(Date.now() - 60 * 1000).toISOString();
  try {
    const encodedPid = cachedEncodeURIComponent(pid);
    const encodedSince = cachedEncodeURIComponent(windowIso);
    const rows = await supabase.select<Array<{ metadata?: { ip?: string; ua?: string } }>>(
      `public_share_events?select=metadata&public_id=eq.${encodedPid}&created_at=gte.${encodedSince}&order=created_at.desc&limit=10`
    );
    if (
      Array.isArray(rows) &&
      rows.some((row) => {
        const meta = row?.metadata as { ip?: string; ua?: string } | undefined;
        return meta && meta.ip === ip && meta.ua === ua;
      })
    ) {
      return jsonWithCors(request, { success: true, deduped: true }, 200, JSON_HEADERS);
    }
  } catch (error) {
    console.warn("[public/track] dedup lookup failed", error);
  }

  try {
    await supabase.insert(
      "public_share_events",
      {
        public_id: pid,
        source: typeof payload.source === "string" ? payload.source : String(payload.source ?? ""),
        user_agent: ua,
        referer,
        metadata: { ip, ua },
        created_at: new Date().toISOString()
      },
      { prefer: "return=minimal" }
    );
    return jsonWithCors(request, { success: true, stored: true }, 200, JSON_HEADERS);
  } catch (error) {
    console.warn("[public/track] insert failed", error);
    return jsonWithCors(request, { success: true, stored: false }, 200, JSON_HEADERS);
  }
}

function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("cf-connecting-ip") || headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.split(",")[0].trim();
  }
  return "";
}

function pruneTrackRateMap(now: number): void {
  let swept = 0;
  for (const [key, entry] of trackRateMap) {
    if (entry.reset <= now) {
      trackRateMap.delete(key);
      swept += 1;
      if (swept >= TRACK_RATE_LIMIT_SWEEP_LIMIT) {
        break;
      }
    }
  }

  if (trackRateMap.size <= TRACK_RATE_LIMIT_MAX_ENTRIES) {
    return;
  }

  const overflow = trackRateMap.size - TRACK_RATE_LIMIT_MAX_ENTRIES;
  if (overflow <= 0) {
    return;
  }

  const entries = Array.from(trackRateMap.entries());
  entries.sort((a, b) => a[1].last - b[1].last);

  let trimmed = 0;
  for (const [key] of entries) {
    if (trackRateMap.size <= TRACK_RATE_LIMIT_MAX_ENTRIES || trimmed >= overflow) {
      break;
    }
    trackRateMap.delete(key);
    trimmed += 1;
  }
}

function checkRateLimit(key: string): { allowed: boolean; reset: number } {
  const now = Date.now();
  pruneTrackRateMap(now);
  const existing = trackRateMap.get(key);
  if (existing && existing.reset <= now) {
    trackRateMap.delete(key);
  }

  const current = trackRateMap.get(key);
  if (!current) {
    const reset = now + TRACK_RATE_LIMIT_WINDOW_MS;
    trackRateMap.set(key, { count: 1, reset, last: now });
    return { allowed: true, reset };
  }

  if (current.count >= TRACK_RATE_LIMIT_MAX) {
    return { allowed: false, reset: current.reset };
  }

  current.count += 1;
  current.last = now;
  trackRateMap.set(key, current);
  return { allowed: true, reset: current.reset };
}
