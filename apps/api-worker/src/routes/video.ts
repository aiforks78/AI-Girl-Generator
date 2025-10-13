import { jsonWithCors, corsHeaders } from "../lib/cors";
import { requireSessionUser } from "../lib/authz";
import { SupabaseAdminClient, SupabaseEnv } from "../lib/supabase";
import { createCdnMapping, resolvePublicUrl, CdnEnv } from "../lib/cdn";
import { AuthEnv } from "../lib/types";
import { clampExpires, generatePresignedPutUrl } from "../lib/r2";
import { cachedEncodeURIComponent } from "../lib/url-cache";
import { cachedEncodeURIComponent } from "../lib/url-cache";

interface R2BucketBinding {
  put: (key: string, value: ArrayBuffer | ArrayBufferView, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
}

export interface VideoEnv extends AuthEnv, SupabaseEnv, CdnEnv {
  R2_PUBLIC?: R2BucketBinding;
  R2_PUBLIC_PREFIX?: string;
}

const VIDEO_POSTER_PATH = "/video/poster";

export function handleVideoOptions(request: Request, env: VideoEnv): Response | null {
  const url = new URL(request.url);
  if (!isVideoPath(url.pathname) && url.pathname !== `${VIDEO_POSTER_PATH}/sign`) {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env, {
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers":
        request.headers.get("Access-Control-Request-Headers") || "Authorization, Content-Type",
      "access-control-max-age": "86400"
    })
  });
}

export async function handleVideoRequest(request: Request, env: VideoEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === `${VIDEO_POSTER_PATH}/sign`) {
    return handleVideoPosterSign(request, env);
  }
  if (!isVideoPath(url.pathname)) {
    return null;
  }

  if (request.method === "OPTIONS") {
    return handleVideoOptions(request, env) ?? new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return jsonWithCors(request, env, { error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const session = await requireSessionUser(request, env);
  if (!session.ok) {
    return jsonWithCors(request, env, { error: session.error }, session.status);
  }

  let payload: { job_id?: unknown; data_url?: unknown };
  try {
    payload = await request.json();
  } catch (error) {
    return jsonWithCors(request, env, { success: false, error: "INVALID_JSON" }, 400);
  }

  const jobId = Number(payload?.job_id);
  if (!Number.isFinite(jobId) || jobId <= 0) {
    return jsonWithCors(request, env, { success: false, error: "INVALID_JOB_ID" }, 400);
  }

  const dataUrl = typeof payload?.data_url === "string" ? payload.data_url : "";
  const objectKeyOverride = typeof payload?.object_key === "string" ? payload.object_key.trim() : "";
  const suppliedContentType = typeof payload?.content_type === "string" ? payload.content_type : undefined;

  if (!dataUrl && !objectKeyOverride) {
    return jsonWithCors(request, env, { success: false, error: "MISSING_UPLOAD_PAYLOAD" }, 400);
  }

  let parsed: { contentType: string; bytes: ArrayBuffer } | null = null;
  if (dataUrl) {
    parsed = await parseDataUrl(dataUrl);
    if (!parsed) {
      return jsonWithCors(request, env, { success: false, error: "INVALID_DATA_URL" }, 400);
    }
  }

  const supabase = new SupabaseAdminClient(env);
  try {
    const job = await supabase.selectSingle<{ id: number; user_id: string }>(
      `generation_jobs?select=id,user_id&user_id=eq.${cachedEncodeURIComponent(session.user.id)}&id=eq.${cachedEncodeURIComponent(String(jobId))}&deleted_at=is.null`
    );
    if (!job) {
      return jsonWithCors(request, env, { success: false, error: "NOT_FOUND" }, 404);
    }
  } catch (error) {
    return jsonWithCors(request, env, { success: false, error: "JOB_LOOKUP_FAILED" }, 500);
  }

  const objectKey = buildPosterObjectKey(env, session.user.id, jobId);

  if (objectKeyOverride) {
    if (!isPosterObjectKeyValid(env, session.user.id, jobId, objectKeyOverride)) {
      return jsonWithCors(request, env, { success: false, error: "INVALID_OBJECT_KEY" }, 400);
    }
  } else if (!env.R2_PUBLIC) {
    return jsonWithCors(request, env, { success: false, error: "R2_BINDING_MISSING" }, 500);
  }

  let finalObjectKey = objectKey;
  if (objectKeyOverride) {
    finalObjectKey = objectKeyOverride.replace(/^\/+/, "");
  }

  if (parsed && env.R2_PUBLIC) {
    try {
      await env.R2_PUBLIC.put(finalObjectKey, parsed.bytes, {
        httpMetadata: { contentType: parsed.contentType }
      });
    } catch (error) {
      console.error("[video/poster] R2 put failed", error);
      return jsonWithCors(request, env, { success: false, error: "UPLOAD_FAILED" }, 502);
    }
  }

  const publicUrl = resolvePublicUrl(env, finalObjectKey);
  let mappedUrl = publicUrl;
  try {
    mappedUrl = await createCdnMapping(env, {
      objectKey: finalObjectKey,
      contentType: parsed?.contentType || suppliedContentType || "image/png",
      userId: session.user.id,
      jobId
    });
  } catch (error) {
    console.warn("[video/poster] mapping failed", error);
    mappedUrl = publicUrl;
  }

  try {
    await supabase.insert(
      "generation_images",
      {
        job_id: jobId,
        type: "video_poster",
        url: mappedUrl,
        index: 1,
        created_at: new Date().toISOString()
      },
      { prefer: "return=minimal" }
    );
  } catch (error) {
    console.warn("[video/poster] generation_images insert failed", error);
  }

  return jsonWithCors(request, env, { success: true, url: mappedUrl });
}

async function handleVideoPosterSign(request: Request, env: VideoEnv): Promise<Response> {
  const session = await requireSessionUser(request, env);
  if (!session.ok) {
    return jsonWithCors(request, env, { error: session.error }, session.status);
  }

  let payload: { job_id?: unknown; content_type?: unknown; expires_in?: unknown };
  try {
    payload = await request.json();
  } catch (error) {
    return jsonWithCors(request, env, { success: false, error: "INVALID_JSON" }, 400);
  }

  const jobId = Number(payload?.job_id);
  if (!Number.isFinite(jobId) || jobId <= 0) {
    return jsonWithCors(request, env, { success: false, error: "INVALID_JOB_ID" }, 400);
  }

  const contentTypeRaw = typeof payload?.content_type === "string" ? payload.content_type : "image/png";
  const contentType = sanitizeContentType(contentTypeRaw);
  const expiresIn = clampExpires(Number(payload?.expires_in) || 300);

  const supabase = new SupabaseAdminClient(env);
  try {
    const job = await supabase.selectSingle<{ id: number; user_id: string }>(
      `generation_jobs?select=id,user_id&user_id=eq.${cachedEncodeURIComponent(session.user.id)}&id=eq.${cachedEncodeURIComponent(String(jobId))}&deleted_at=is.null`
    );
    if (!job) {
      return jsonWithCors(request, env, { success: false, error: "NOT_FOUND" }, 404);
    }
  } catch (error) {
    return jsonWithCors(request, env, { success: false, error: "JOB_LOOKUP_FAILED" }, 500);
  }

  const objectKey = buildPosterObjectKey(env, session.user.id, jobId);

  try {
    const signed = await generatePresignedPutUrl(env, objectKey, contentType, expiresIn);
    return jsonWithCors(request, env, {
      success: true,
      object_key: objectKey,
      upload_url: signed.uploadUrl,
      headers: signed.headers ?? {},
      expires_at: new Date(signed.expiresAt).toISOString(),
      public_url: signed.publicUrl
    });
  } catch (error) {
    console.error("[video/poster/sign] failed to sign upload", error);
    return jsonWithCors(request, env, { success: false, error: "SIGN_UPLOAD_FAILED" }, 500);
  }
}

function isVideoPath(pathname: string): boolean {
  return pathname === VIDEO_POSTER_PATH || pathname === `${VIDEO_POSTER_PATH}/`;
}

async function parseDataUrl(dataUrl: string): Promise<{ contentType: string; bytes: ArrayBuffer } | null> {
  if (!dataUrl || typeof dataUrl !== "string") {
    return null;
  }

  if (!dataUrl.startsWith("data:")) {
    return null;
  }

  try {
    const response = await fetch(dataUrl);
    if (!response.ok || !response.body) {
      console.warn("[video/poster] data URL fetch failed", response.status);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      console.warn("[video/poster] data URL exceeds size limit", arrayBuffer.byteLength);
      return null;
    }

    return {
      contentType,
      bytes: arrayBuffer
    };
  } catch (error) {
    console.warn("[video/poster] failed to process data URL", error);
    return null;
  }
}

function buildPosterObjectKey(env: VideoEnv, userId: string, jobId: number): string {
  const shard = userShard(userId);
  const prefix = sanitizePrefix(env.R2_PUBLIC_PREFIX || "public/");
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  return `${prefix}users/${shard}/${userId}/results/${yyyy}/${mm}/${dd}/jobs/${jobId}/video_poster.png`;
}

function isPosterObjectKeyValid(env: VideoEnv, userId: string, jobId: number, key: string): boolean {
  const sanitized = key.replace(/^\/+/, "");
  const prefix = sanitizePrefix(env.R2_PUBLIC_PREFIX || "public/");
  const shard = userShard(userId);
  const base = `${prefix}users/${shard}/${userId}/results/`;
  return sanitized.startsWith(base) && sanitized.includes(`/jobs/${jobId}/`) && sanitized.endsWith("video_poster.png");
}

function sanitizeContentType(input?: string): string {
  const fallback = "image/png";
  if (typeof input !== "string") return fallback;
  const cleaned = input.replace(/[\r\n]+/g, " ").trim();
  if (!cleaned) return fallback;
  const collapsed = cleaned.replace(/\s+/g, " ");
  return collapsed.slice(0, 100);
}

function sanitizePrefix(prefix: string): string {
  const trimmed = prefix.replace(/^\/+/, "");
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function userShard(userId: string): string {
  const cleaned = userId.replace(/[^a-f0-9]/gi, "").toLowerCase();
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2);
  }
  return (userId || "00").slice(0, 2).padEnd(2, "0");
}
