import { handleAuthRequest, handleAuthOptions } from "./routes/auth";
import { handleGenerationOptions, handleGenerationRequest, GenerationEnv } from "./routes/generation";
import { handleUserRequest } from "./routes/user";
import { AuthEnv } from "./lib/types";
import { json, jsonWithCors, getCorsOrigin } from "./lib/response";
import { handlePublicRequest } from "./routes/public";
import { handleMonitoringOptions, handleMonitoringRequest, MonitoringEnv } from "./routes/monitoring";
import { handleHealthRequest, handleHealthOptions, HealthEnv } from "./routes/health";
import { handleVideoOptions, handleVideoRequest, VideoEnv } from "./routes/video";
import { handlePromptOptions, handlePromptRequest, PromptEnv as WorkerPromptEnv } from "./routes/prompt";
import { handleCheckout } from "./routes/checkout";
import { handleStripeWebhook } from "./routes/stripe";
import { handleCreemRequest } from "./routes/creem";
import { handleImageOptions, handleImageRequest, ImageEnv } from "./routes/image";
import { handleGalleryOptions, handleGalleryRequest } from "./routes/gallery";
import { trackApiCall } from "./lib/monitoring";
import { handleStuckJobs } from "./cron/stuck-jobs";
import { logger, setLogLevel } from "./lib/logger";
import { cachedEncodeURIComponent } from "./lib/url-cache";
import { buildObjectKey, clampExpires, generatePresignedPutUrl } from "./lib/r2";

const encoder = new TextEncoder();

type R2Binding = {
  put: (key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream, options?: unknown) => Promise<unknown>;
};

type Env = GenerationEnv & MonitoringEnv & HealthEnv & VideoEnv & WorkerPromptEnv & ImageEnv & {
  R2_PUBLIC?: R2Binding;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_BASE_URL?: string;
  CDN_DOMAIN?: string;
  LOG_LEVEL?: string;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    setLogLevel(env.LOG_LEVEL ?? (globalThis as any).__LOG_LEVEL__);
    const start = Date.now();
    const url = new URL(request.url);

    try {
      const response = await dispatchRequest(request, env, url, ctx);
      trackApiCall(url.pathname, request.method, Date.now() - start, response.status ?? 200);
      return response;
    } catch (error) {
      trackApiCall(url.pathname, request.method, Date.now() - start, 500);
      console.error("[worker] unhandled error", error);
      return json({ error: "INTERNAL_SERVER_ERROR" }, 500);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    setLogLevel(env.LOG_LEVEL ?? (globalThis as any).__LOG_LEVEL__);
    logger.info("[cron] scheduled event triggered", event.cron);

    try {
      // Check and recover stuck Replicate jobs
      await handleStuckJobs(env);
    } catch (error) {
      console.error("[cron] scheduled handler failed:", error);
    }
  }
};

async function dispatchRequest(request: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  if (request.method === "OPTIONS" && url.pathname.startsWith("/auth/")) {
    const authOptionsResponse = handleAuthOptions(request, env);
    if (authOptionsResponse) return authOptionsResponse;
  }

  const authResponse = await handleAuthRequest(request, env);
  if (authResponse) {
    return authResponse;
  }

  if (request.method === "OPTIONS" && (url.pathname.startsWith("/generation") || url.pathname === "/webhook/replicate")) {
    const genOptions = handleGenerationOptions(request, env);
    if (genOptions) return genOptions;
  }

  if (request.method === "OPTIONS" && url.pathname.startsWith("/gallery")) {
    const galleryOptions = handleGalleryOptions(request, env);
    if (galleryOptions) return galleryOptions;
  }

  if (request.method === "OPTIONS" && url.pathname.startsWith("/user/")) {
    return handleOptions(request);
  }

  if (request.method === "OPTIONS" && url.pathname.startsWith("/img/")) {
    const imageOptions = handleImageOptions(request);
    if (imageOptions) return imageOptions;
  }

  if (request.method === "OPTIONS" && url.pathname.startsWith("/video")) {
    const videoOptions = handleVideoOptions(request, env);
    if (videoOptions) return videoOptions;
  }

  if (request.method === "OPTIONS" && (url.pathname === "/translate/prompt" || url.pathname === "/prompt/generate")) {
    const promptOptions = handlePromptOptions(request);
    if (promptOptions) return promptOptions;
  }

  if (
    request.method === "OPTIONS" &&
    (url.pathname === "/r2/sign" ||
      url.pathname.startsWith("/monitoring") ||
      url.pathname.startsWith("/api/monitoring") ||
      url.pathname === "/health" ||
      url.pathname === "/api/health")
  ) {
    const monitoringOptions = handleMonitoringOptions(request, env);
    if (monitoringOptions) return monitoringOptions;

    const healthOptions = handleHealthOptions(request);
    if (healthOptions) return healthOptions;

    return handleOptions(request);
  }

  const healthResponse = await handleHealthRequest(request, env);
  if (healthResponse) {
    return healthResponse;
  }

  if (url.pathname === "/r2/sign") {
    return handleR2Sign(request, env);
  }

  const monitoringResponse = await handleMonitoringRequest(request, env);
  if (monitoringResponse) {
    return monitoringResponse;
  }

  const promptResponse = await handlePromptRequest(request, env);
  if (promptResponse) {
    return promptResponse;
  }

  const imageResponse = await handleImageRequest(request, env);
  if (imageResponse) {
    return imageResponse;
  }

  const videoResponse = await handleVideoRequest(request, env);
  if (videoResponse) {
    return videoResponse;
  }

  const checkoutResponse = await handleCheckout(request, env);
  if (checkoutResponse) {
    return checkoutResponse;
  }

  const stripeResponse = await handleStripeWebhook(request, env);
  if (stripeResponse) {
    return stripeResponse;
  }

  const creemResponse = await handleCreemRequest(request);
  if (creemResponse) {
    return creemResponse;
  }

  const generationResponse = await handleGenerationRequest(request, env, ctx);
  if (generationResponse) {
    return generationResponse;
  }

  const galleryResponse = await handleGalleryRequest(request, env);
  if (galleryResponse) {
    return galleryResponse;
  }

  const userResponse = await handleUserRequest(request, env);
  if (userResponse) {
    return userResponse;
  }

  const publicResponse = await handlePublicRequest(request, env);
  if (publicResponse) {
    return publicResponse;
  }

  return json({
    ok: true,
    message: "Girl Generator API worker ready",
    timestamp: new Date().toISOString()
  });
}

function handleOptions(request: Request): Response {
  const headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null
  ) {
    const origin = headers.get("Origin");
    const corsOrigin = getCorsOrigin(origin);
    const responseHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET,POST,HEAD,OPTIONS,DELETE,PUT,PATCH",
      "Access-Control-Allow-Headers": headers.get("Access-Control-Request-Headers") || "*",
      "Access-Control-Max-Age": "86400"
    };

    // Only add credentials header if using specific origin
    if (corsOrigin !== "*") {
      responseHeaders["Access-Control-Allow-Credentials"] = "true";
    }

    return new Response(null, {
      status: 204,
      headers: responseHeaders
    });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,HEAD,OPTIONS,DELETE,PUT,PATCH"
    }
  });
}

async function handleR2Sign(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonWithCors(request, { error: "Method not allowed" }, 405);
  }

  let body: { fileName?: string; fileType?: string; prefix?: string; expiresIn?: number };
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(request, { error: "Invalid JSON body" }, 400);
  }

  const fileName = sanitizeFileName(body.fileName || "file.bin");
  const fileType = sanitizeContentType(body.fileType);
  const prefix = sanitizePrefix(body.prefix || "uploads");
  const expiresIn = clampExpires(body.expiresIn);

  const objectKey = buildObjectKey(prefix, fileName);

  const hasKeys = Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ACCOUNT_ID && env.R2_BUCKET_NAME);

  if (!hasKeys) {
    return jsonWithCors(request, { error: "R2 access key environment variables are not configured" }, 500);
  }

  try {
    const presignResult = await generatePresignedPutUrl({
      objectKey,
      fileType,
      expiresIn,
      env
    });

    const responsePayload = {
      ok: true,
      uploadUrl: presignResult.uploadUrl,
      uploadMethod: "PUT" as const,
      objectKey,
      expiresAt: new Date(presignResult.expiresAt).toISOString(),
      publicUrl: presignResult.publicUrl,
      headers: presignResult.headers
    };

    return jsonWithCors(request, responsePayload, 201);
  } catch (error) {
    console.error("[r2/sign] failed", error);
    return jsonWithCors(request, { error: "Failed to generate presigned URL" }, 500);
  }
}

function sanitizeFileName(input: string): string {
  const normalized = input.trim().replace(/[^a-zA-Z0-9_.-]+/g, "-");
  return normalized || "file.bin";
}

function sanitizePrefix(prefix: string): string {
  return prefix.replace(/[^a-zA-Z0-9/_-]+/g, "-").replace(/^\/+|\/+/g, "/").replace(/^\//, "").replace(/\/$/, "");
}

function sanitizeContentType(input?: string): string {
  const fallback = "application/octet-stream";
  if (typeof input !== "string") return fallback;
  const cleaned = input.replace(/[\r\n]+/g, " ").trim();
  if (!cleaned) return fallback;
  const collapsed = cleaned.replace(/\s+/g, " ");
  return collapsed.slice(0, 100);
}

