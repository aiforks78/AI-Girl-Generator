import { AuthEnv } from "../lib/types";
import { SupabaseAdminClient } from "../lib/supabase";
import { requireSessionUser } from "../lib/authz";
import { CREDIT_COSTS } from "../lib/credit-config";
import { createCdnMapping, CdnEnv } from "../lib/cdn";
import { corsHeaders, jsonWithCors } from "../lib/cors";
import { TTLCache } from "../lib/ttl-cache";
import { logger } from "../lib/logger";
import { cachedEncodeURIComponent } from "../lib/url-cache";
import {
  getReplicateApiBase,
  getReplicateModelUrl,
  getReplicatePredictionUrl,
  getReplicatePredictionsUrl
} from "../lib/providers/replicate";
import { getReplicateModelConfig } from "../lib/replicate-models";
import {
  CharacterAssociationError,
  type CharacterAssociationResult,
  resolveCharacterAssociation,
  resolveImageReferences,
  type ImageReferenceInfo
} from "../lib/character-association";

const encoder = new TextEncoder();
const ALLOWED_ASPECT_RATIOS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]);
const replicatePollCache = new TTLCache<string, number>(60_000);
const REPLICATE_POLL_INITIAL_TTL_MS = 5_000;
const REPLICATE_POLL_ACTIVE_TTL_MS = 30_000;
const REPLICATE_POLL_FINAL_TTL_MS = 120_000;
const REPLICATE_POLL_ERROR_TTL_MS = 15_000;
const HASH_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const BLOCKLIST_CACHE_TTL_MS = 10 * 60 * 1000;

const hashCache = new TTLCache<string, string>(HASH_CACHE_TTL_MS);
const blocklistCache = new TTLCache<string, boolean>(BLOCKLIST_CACHE_TTL_MS);

type R2Binding = {
  put: (key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
};

export type GenerationEnv = AuthEnv & CdnEnv & {
  REPLICATE_API_TOKEN: string;
  REPLICATE_WEBHOOK_URL?: string;
  REPLICATE_WEBHOOK_SECRET?: string;
  REPLICATE_API_BASE?: string;
  R2_PUBLIC?: R2Binding;
  R2_PUBLIC_PREFIX?: string;
};

interface GenerationRequestBody {
  prompt?: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  model_id?: string;
  mode?: string;
  output_count?: number;
  init_images?: string[];
  is_public?: boolean;
  character_id?: string | null;
}

export function handleGenerationOptions(request: Request, env: GenerationEnv): Response | null {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/generation") && url.pathname !== "/webhook/replicate" && url.pathname !== "/generate/video") {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env, {
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers":
        request.headers.get("Access-Control-Request-Headers") || "Content-Type, Authorization",
      "access-control-max-age": "86400"
    })
  });
}

export async function handleGenerationRequest(request: Request, env: GenerationEnv, ctx?: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/generation/create" && request.method === "POST") {
    return handleGenerationCreate(request, env, ctx);
  }

  if (url.pathname === "/generation/status" && request.method === "GET") {
    return handleGenerationStatus(request, env);
  }

  if (url.pathname === "/webhook/replicate" && request.method === "POST") {
    return handleReplicateWebhook(request, env);
  }

  if (url.pathname === "/generate/video") {
    if (request.method === "POST") {
      return handleVideoGenerate(request, env);
    }
    if (request.method === "GET") {
      return handleVideoStatus(request, env);
    }
  }

  return null;
}

async function handleGenerationCreate(request: Request, env: GenerationEnv, ctx?: ExecutionContext): Promise<Response> {
  let body: GenerationRequestBody;
  try {
    body = await request.json();
  } catch (error) {
    return jsonWithCors(request, env, { error: "INVALID_JSON" }, 400);
  }

  const supabase = new SupabaseAdminClient(env);

  const session = await requireSessionUser(request, env);
  if (!session.ok) {
    return jsonWithCors(request, env, { error: session.error }, session.status);
  }
  const user = session.user;

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return jsonWithCors(request, env, { error: "PROMPT_REQUIRED" }, 400);
  }
  if (prompt.length > 2000) {
    return jsonWithCors(request, env, { error: "PROMPT_TOO_LONG" }, 400);
  }

  const negativePrompt = typeof body.negative_prompt === "string" ? body.negative_prompt : undefined;
  const aspectRatio = normalizeAspectRatio(body.aspect_ratio);
  const mode = normalizeMode(body.mode);
  let outputCount = clampOutputs(body.output_count, mode);
  const modelId = normalizeModelId(String(body.model_id || ""));
  const modelConfig = getReplicateModelConfig(modelId);
  if (modelConfig.allowMultiOutput === false) {
    outputCount = 1;
  }
  const isPublic = body.is_public !== undefined ? Boolean(body.is_public) : true;
  const initImages = Array.isArray(body.init_images) ? body.init_images.filter((x): x is string => typeof x === "string") : [];
  const requestedCharacterInput = body.character_id;
  let referenceInfos: ImageReferenceInfo[] = [];
  let characterAssociation: CharacterAssociationResult = {
    characterId: null,
    source: requestedCharacterInput === null ? "explicit" : null,
    sourceJobId: null,
    shouldUpdate: false
  };

  // Model-based pricing: MUST find valid model or reject request
  if (!modelId) {
    return c.json({ error: { message: "model_id is required" } }, 400);
  }
  const creditsPerImage = (CREDIT_COSTS as any)[modelId];
  if (creditsPerImage === undefined) {
    return c.json({ error: { message: `Invalid model_id: ${modelId}` } }, 400);
  }
  const creditsToCharge = creditsPerImage * outputCount;

  const fingerprint = await computeFingerprint({
    userId: user.id,
    prompt,
    modelId,
    aspectRatio,
    outputCount
  });

  const tempReplicateId = `pending:${randomId(16)}`;

  let rpcResult: any;
  try {
    rpcResult = await supabase.rpc("deduct_and_create_job", {
      p_user_id: user.id,
      p_replicate_id: tempReplicateId,
      p_prompt: prompt,
      p_style: "default",
      p_action: mode,
      p_credit_cost: creditsToCharge
    });
  } catch (error) {
    console.error("[generation/create] deduct_and_create_job failed", error);
    return jsonWithCors(request, env, { error: "JOB_CREATION_FAILED" }, 500);
  }

  const rpcPayload = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  if (!rpcPayload?.success) {
    const status = /insufficient/i.test(String(rpcPayload?.error_message || "")) ? 402 : 400;
    return jsonWithCors(request, env, { error: rpcPayload?.error_message || "JOB_CREATION_FAILED" }, status);
  }

  const jobId: number = rpcPayload.job_id;
  const newBalance: number = rpcPayload.new_balance ?? 0;

  if (mode === "img2img" && initImages.length > 0) {
    try {
      referenceInfos = await resolveImageReferences({
        supabase,
        env,
        urls: initImages,
        requireResolvedUrl: modelConfig.type !== "txt2img"
      });
    } catch (error) {
      console.error("[generation/create] failed to resolve init image references", error);
      await supabase
        .patch(
          "generation_jobs",
          `id=eq.${jobId}`,
          {
            status: "failed",
            error_message: "IMAGE_URL_RESOLUTION_FAILED",
            updated_at: new Date().toISOString()
          },
          { prefer: "return=minimal" }
        )
        .catch(() => null);
      await refundCreditsSafe(supabase, user.id, jobId, creditsToCharge, "image_reference_resolution_failed");
      return jsonWithCors(request, env, { error: "IMAGE_URL_RESOLUTION_FAILED" }, 400);
    }
  }

  try {
    characterAssociation = await resolveCharacterAssociation({
      supabase,
      userId: user.id,
      requestedCharacterId: requestedCharacterInput,
      references: referenceInfos,
      depthLimit: 5
    });
  } catch (error) {
    if (error instanceof CharacterAssociationError) {
      console.warn("[generation/create] character association rejected", {
        jobId,
        userId: user.id,
        code: error.code,
        message: error.message
      });
      await supabase
        .patch(
          "generation_jobs",
          `id=eq.${jobId}`,
          {
            status: "failed",
            error_message: error.code,
            updated_at: new Date().toISOString()
          },
          { prefer: "return=minimal" }
        )
        .catch(() => null);
      await refundCreditsSafe(supabase, user.id, jobId, creditsToCharge, "character_association_rejected");
      return jsonWithCors(request, env, { error: error.code, message: error.message }, error.status);
    }
    throw error;
  }

  if (mode === "img2img" && referenceInfos.length > 0) {
    try {
      await recordGenerationSources(supabase, jobId, 'img2img', referenceInfos);
    } catch (error) {
      console.warn('[generation/create] failed to record img2img sources', error);
    }
  }

  const dimensions = getDimensions(aspectRatio, mode === "img2img" ? 2048 : 1024);
  const updatePayload: Record<string, unknown> = {
    model_id: modelId,
    aspect_ratio: aspectRatio,
    image_width: dimensions.width,
    image_height: dimensions.height,
    output_count: outputCount,
    is_public: isPublic,
    credits_charged: creditsToCharge,
    ...(fingerprint ? { request_fingerprint: fingerprint } : {}),
    updated_at: new Date().toISOString()
  };

  if (mode === "img2img") {
    updatePayload.credits_charged_hd = creditsToCharge;
  }

  if (characterAssociation.shouldUpdate) {
    updatePayload.character_id = characterAssociation.characterId;
    if (characterAssociation.source === "auto_inherited") {
      logger.debug("[generation/create] auto-associated job", {
        jobId,
        character_id: characterAssociation.characterId,
        inherited_from_job_id: characterAssociation.sourceJobId
      });
    }
  }

  try {
    await supabase.patch("generation_jobs", `id=eq.${jobId}`, updatePayload, { prefer: "return=minimal" });
  } catch (error) {
    if ((error as any).status === 409 && fingerprint) {
      const existing = await supabase.selectSingle(
        `generation_jobs?user_id=eq.${cachedEncodeURIComponent(user.id)}&request_fingerprint=eq.${cachedEncodeURIComponent(fingerprint)}&deleted_at=is.null&order=created_at.desc&select=id,status,image_url,hd_url,replicate_id,created_at,updated_at`
      );
      if (existing) {
        const existingCreatedAt = new Date(existing.created_at).getTime();
        const now = Date.now();
        const ageSeconds = (now - existingCreatedAt) / 1000;

        // Allow duplicate if existing job is older than 60 seconds
        if (ageSeconds < 60) {
          await refundCreditsSafe(supabase, user.id, jobId, creditsToCharge, "duplicate_request_too_soon");
          return jsonWithCors(request, env, {
            error: "DUPLICATE_REQUEST",
            message: "Identical request submitted recently. Please wait a moment before retrying to avoid accidental duplicates.",
            retry_after: Math.ceil(60 - ageSeconds)
          }, 429);
        }

        // If older than 60 seconds, allow new job by removing fingerprint constraint
        logger.debug(`[generation/create] allowing duplicate request (existing job age: ${ageSeconds.toFixed(1)}s)`);
        const updateWithoutFingerprint = { ...updatePayload };
        delete updateWithoutFingerprint.request_fingerprint;

        try {
          await supabase.patch("generation_jobs", `id=eq.${jobId}`, updateWithoutFingerprint, { prefer: "return=minimal" });
        } catch (retryError) {
          console.error("[generation/create] failed to update job without fingerprint", retryError);
          await refundCreditsSafe(supabase, user.id, jobId, creditsToCharge, "update_retry_failed");
          return jsonWithCors(request, env, { error: "JOB_UPDATE_FAILED" }, 500);
        }
      }
    } else {
      console.error("[generation/create] failed to update job metadata", error);
      return jsonWithCors(request, env, { error: "JOB_UPDATE_FAILED" }, 500);
    }
  }

  let replicateId: string;

  // Use Replicate for flux-schnell and other models
  logger.info("[generation/create] using Replicate", { modelId });
  logger.debug("[generation/create] replicate request", {
    jobId,
    userId: user.id,
    model: modelId,
    prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
    negativePrompt: negativePrompt ? negativePrompt.substring(0, 50) : 'none',
    dimensions,
    outputCount,
    aspectRatio,
    mode,
    hasApiKey: !!env.REPLICATE_API_TOKEN
  });
  let replicatePrediction: any;
  try {
    replicatePrediction = await createReplicatePrediction({
      env,
      request,
      modelId,
      prompt,
      negativePrompt,
      aspectRatio,
      outputCount,
      dimensions,
      mode,
      referenceImages: referenceInfos
    });
    logger.debug("[generation/create] replicate prediction created", {
      jobId,
      predictionId: replicatePrediction?.id,
      status: replicatePrediction?.status,
      urls: replicatePrediction?.urls
    });
  } catch (error) {
    console.error("[generation/create] replicate prediction failed", error);
    await supabase.patch("generation_jobs", `id=eq.${jobId}`, {
      status: "failed",
      error_message: "PROVIDER_ERROR",
      updated_at: new Date().toISOString()
    }, { prefer: "return=minimal" });
    await refundCreditsSafe(supabase, user.id, jobId, creditsToCharge, "replicate_creation_failed");
    return jsonWithCors(request, env, { error: "REPLICATE_PREDICTION_FAILED" }, 502);
  }

  replicateId = replicatePrediction.id;

  try {
    await supabase.patch("generation_jobs", `id=eq.${jobId}`, {
      replicate_id: replicateId,
      updated_at: new Date().toISOString()
    }, { prefer: "return=minimal" });
  } catch (error) {
    console.error("[generation/create] failed to store replicate id", error);
  }

  return jsonWithCors(request, env, {
    ok: true,
    job_id: jobId,
    replicate_id: replicateId,
    status: "pending",
    credits_remaining: newBalance,
    character_id: characterAssociation.characterId,
    character_association_source: characterAssociation.source
  }, 201);
}

async function handleGenerationStatus(request: Request, env: GenerationEnv): Promise<Response> {
  const supabase = new SupabaseAdminClient(env);
  const session = await requireSessionUser(request, env);
  if (!session.ok) {
    return jsonWithCors(request, env, { error: session.error }, session.status);
  }
  const user = session.user;

  const url = new URL(request.url);
  const jobIdParam = url.searchParams.get("job_id");

  if (jobIdParam) {
    const jobId = Number(jobIdParam);
    if (!Number.isFinite(jobId)) {
      return jsonWithCors(request, env, { error: "INVALID_JOB_ID" }, 400);
    }

    const job = await supabase.selectSingle(
      `generation_jobs?id=eq.${jobId}&user_id=eq.${cachedEncodeURIComponent(user.id)}&deleted_at=is.null&select=id,user_id,status,action,image_url,hd_url,video_url,replicate_id,model_id,aspect_ratio,output_count,credits_charged,created_at,updated_at,prompt,is_public,public_id,character_id`
    );
    if (!job) {
      return jsonWithCors(request, env, { error: "JOB_NOT_FOUND" }, 404);
    }

    // Fallback: check Replicate API if task is stuck in pending
    if (job.status === 'pending' && job.replicate_id) {
        const createdAt = new Date(job.created_at).getTime();
        const now = Date.now();
        const ageMinutes = (now - createdAt) / 1000 / 60;

        // If pending for more than 2 minutes, actively check Replicate
        if (ageMinutes > 3) {
          const throttleKey = job.replicate_id;
          if (replicatePollCache.get(throttleKey)) {
            logger.debug(`[generation/status] throttle replicate poll for job ${jobId}`);
          } else {
            replicatePollCache.set(throttleKey, Date.now(), REPLICATE_POLL_INITIAL_TTL_MS);
            logger.debug(`[generation/status] fallback check for stuck job ${jobId}, age: ${ageMinutes.toFixed(1)}min`);

            try {
          const predictionUrl = getReplicatePredictionUrl(env, job.replicate_id);
              const response = await fetch(predictionUrl, {
                headers: {
                  'Authorization': `Token ${env.REPLICATE_API_TOKEN}`,
                  'Content-Type': 'application/json'
                }
              });

              if (!response.ok) {
                replicatePollCache.set(throttleKey, Date.now(), REPLICATE_POLL_ERROR_TTL_MS);
              } else {
                const prediction = await response.json();
                logger.debug(`[generation/status] replicate status for ${job.replicate_id}: ${prediction.status}`);

                // Process succeeded predictions
                if (prediction.status === 'succeeded' && prediction.output) {
                  const outputs = normalizeOutputs(prediction.output);
                  const stored = await storeGenerationOutputs(env, supabase, job, outputs);

                  const nowIso = new Date().toISOString();
                  const jobAction = String(job.action || "").toLowerCase();
                  const update: Record<string, unknown> = {
                    updated_at: nowIso
                  };

                if (jobAction === "img2vid" || jobAction === "img2video") {
                    update.status = "ready";
                    if (stored.primaryUrl) {
                      update.video_url = stored.primaryUrl;
                      update.image_url = stored.primaryUrl;
                    }
                  } else {
                    update.status = job.status === "pending" ? "ready" : "img2img_ready";
                    if (stored.primaryUrl) {
                      if (job.status === "pending") {
                        update.image_url = stored.primaryUrl;
                      } else {
                        update.hd_url = stored.primaryUrl;
                      }
                    }
                  }

                  logger.debug(`[generation/status] updating job ${job.id} with data`, update);
                  await supabase.patch("generation_jobs", `id=eq.${job.id}`, update, { prefer: "return=minimal" });

                  if (stored.records.length > 0) {
                    await supabase.insert("generation_images", stored.records, { prefer: "resolution=merge-duplicates" });
                  }

                  logger.info(`[generation/status] recovered stuck job ${jobId}`);
                  replicatePollCache.set(throttleKey, Date.now(), REPLICATE_POLL_FINAL_TTL_MS);

                  // Fetch updated job
                  const updatedJob = await supabase.selectSingle(
                    `generation_jobs?id=eq.${jobId}&deleted_at=is.null&select=id,user_id,status,action,image_url,hd_url,video_url,replicate_id,model_id,aspect_ratio,output_count,credits_charged,created_at,updated_at,prompt,is_public,public_id,character_id`
                  );
                  const images = await supabase.select<any[]>(`generation_images?job_id=eq.${jobId}&select=job_id,type,url,index&order=index.asc`);
                  const jobPayload = await attachExternalSources(supabase, jobId, { ...updatedJob, images }, env);

                  return jsonWithCors(request, env, { ok: true, job: jobPayload });
                }

                // Process failed predictions
                if (prediction.status === 'failed' || prediction.status === 'canceled') {
                  const reason = prediction.error || `Replicate ${prediction.status}`;
                  await supabase.patch("generation_jobs", `id=eq.${job.id}`, {
                    status: "failed",
                    error_message: reason,
                    updated_at: new Date().toISOString()
                  }, { prefer: "return=minimal" });

                  const refundAmount = Math.abs(Number(job.credits_charged || 0));
                  if (refundAmount > 0) {
                    await refundCreditsSafe(supabase, job.user_id, jobId, refundAmount, `replicate_${prediction.status}_fallback`);
                  }

                  logger.info(`[generation/status] marked stuck job ${jobId} as failed`);
                  replicatePollCache.set(throttleKey, Date.now(), REPLICATE_POLL_FINAL_TTL_MS);

                  // Fetch updated job
                  const updatedJob = await supabase.selectSingle(
                    `generation_jobs?id=eq.${jobId}&deleted_at=is.null&select=id,user_id,status,action,image_url,hd_url,video_url,replicate_id,model_id,aspect_ratio,output_count,credits_charged,created_at,updated_at,prompt,is_public,public_id,character_id,character_association_source`
                  );
                  const images = await supabase.select<any[]>(`generation_images?job_id=eq.${jobId}&select=job_id,type,url,index&order=index.asc`);
                  const jobPayload = await attachExternalSources(supabase, jobId, { ...updatedJob, images }, env);

                  return jsonWithCors(request, env, { ok: true, job: jobPayload });
                }

                replicatePollCache.set(throttleKey, Date.now(), REPLICATE_POLL_ACTIVE_TTL_MS);
              }
            } catch (error) {
              replicatePollCache.set(throttleKey, Date.now(), REPLICATE_POLL_ERROR_TTL_MS);
              console.error('[generation/status] fallback replicate check failed', error);
              // Continue with database state
            }
          }
        }
    }

    const images = await supabase.select<any[]>(`generation_images?job_id=eq.${jobId}&select=job_id,type,url,index&order=index.asc`);
    const jobPayload = await attachExternalSources(supabase, jobId, { ...job, images }, env);

    return jsonWithCors(request, env, { ok: true, job: jobPayload });
  }

  const limit = clampListLimit(url.searchParams.get("limit"));
  const offset = clampOffset(url.searchParams.get("offset"));

  const jobs = await supabase.select<any[]>(
    `generation_jobs?user_id=eq.${cachedEncodeURIComponent(user.id)}&deleted_at=is.null&order=created_at.desc&select=id,status,image_url,hd_url,replicate_id,model_id,aspect_ratio,output_count,created_at,updated_at,is_public,public_id,character_id&limit=${limit}&offset=${offset}`
  );

  return jsonWithCors(request, env, { ok: true, jobs, limit, offset });
}

async function handleReplicateWebhook(request: Request, env: GenerationEnv): Promise<Response> {
  const rawBody = await request.text();
  if (!rawBody) {
    return jsonWithCors(request, env, { error: "EMPTY_BODY" }, 400);
  }

  if (env.REPLICATE_WEBHOOK_SECRET) {
    const webhookId = request.headers.get("webhook-id");
    const webhookTimestamp = request.headers.get("webhook-timestamp");
    const webhookSignature = request.headers.get("webhook-signature");

    logger.debug("[replicate/webhook] signature validation", {
      hasSecret: !!env.REPLICATE_WEBHOOK_SECRET,
      hasWebhookId: !!webhookId,
      hasTimestamp: !!webhookTimestamp,
      hasSignature: !!webhookSignature,
      bodyLength: rawBody.length
    });

    const valid = await verifyWebhookSignature(
      env.REPLICATE_WEBHOOK_SECRET,
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature
    );

    if (!valid) {
      console.warn("[replicate/webhook] signature validation failed");
      return jsonWithCors(request, env, { error: "INVALID_SIGNATURE" }, 401);
    }
    logger.debug("[replicate/webhook] signature validated successfully");
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("[replicate/webhook] invalid JSON body");
    return jsonWithCors(request, env, { error: "INVALID_JSON" }, 400);
  }

  logger.debug("[replicate/webhook] received", {
    id: payload?.id,
    status: payload?.status,
    hasOutput: !!payload?.output,
    error: payload?.error
  });

  if (!payload?.id) {
    return jsonWithCors(request, env, { error: "MISSING_ID" }, 400);
  }

  const supabase = new SupabaseAdminClient(env);
  const job = await supabase.selectSingle<any>(
    `generation_jobs?replicate_id=eq.${cachedEncodeURIComponent(payload.id)}&select=id,user_id,status,action,image_url,hd_url,video_url,credits_charged,output_count`
  );

  if (!job) {
    return jsonWithCors(request, env, { ok: true, ignored: true }, 200);
  }

  const status = String(payload.status || "").toLowerCase();

  if (status === "succeeded") {
    const outputs = normalizeOutputs(payload.output);
    logger.debug("[replicate/webhook] processing succeeded webhook", { outputs: outputs.length });
    const nowIso = new Date().toISOString();

    const stored = await storeGenerationOutputs(env, supabase, job, outputs);
    logger.debug("[replicate/webhook] stored outputs", {
      primaryUrl: stored.primaryUrl,
      recordsCount: stored.records.length
    });

    const jobAction = String(job.action || "").toLowerCase();
    const update: Record<string, unknown> = {
      updated_at: nowIso
    };

    if (jobAction === "img2vid" || jobAction === "img2video") {
      update.status = "ready";
      if (stored.primaryUrl) {
        update.video_url = stored.primaryUrl;
        update.image_url = stored.primaryUrl;
      } else {
        if (job.video_url) {
          update.video_url = job.video_url;
        }
        if (job.image_url) {
          update.image_url = job.image_url;
        }
      }
    } else {
      update.status = job.status === "pending" ? "ready" : "img2img_ready";
      if (stored.primaryUrl) {
        if (job.status === "pending") {
          update.image_url = stored.primaryUrl;
        } else {
          update.hd_url = stored.primaryUrl;
        }
      } else {
        if (job.status === "pending" && job.image_url) {
          update.image_url = job.image_url;
        }
        if (job.status !== "pending" && job.hd_url) {
          update.hd_url = job.hd_url;
        }
      }
    }

    logger.debug("[replicate/webhook] updating job with data", update);
    await supabase.patch("generation_jobs", `id=eq.${job.id}`, update, { prefer: "return=minimal" });

    if (stored.records.length > 0) {
      try {
        await supabase.insert("generation_images", stored.records, { prefer: "resolution=merge-duplicates" });
      } catch (error) {
        console.error("[replicate/webhook] failed to insert generation_images", error);
      }
    }

    return jsonWithCors(request, env, { ok: true, status: "ready" });
  }

  if (status === "failed" || status === "canceled" || status === "error") {
    const reason = payload.error?.message || status;
    await supabase.patch("generation_jobs", `id=eq.${job.id}`, {
      status: "failed",
      error_message: reason,
      updated_at: new Date().toISOString()
    }, { prefer: "return=minimal" });

    const refundAmount = Math.abs(Number(job.credits_charged || 0));
    if (refundAmount > 0) {
      await refundCreditsSafe(supabase, job.user_id, job.id, refundAmount, `replicate_${status}`);
    }

    return jsonWithCors(request, env, { ok: true, status: "failed" });
  }

  // For intermediate statuses, acknowledge but no update.
  return jsonWithCors(request, env, { ok: true, status });
}

async function storeGenerationOutputs(
  env: GenerationEnv,
  supabase: SupabaseAdminClient,
  job: any,
  outputs: string[]
): Promise<{ primaryUrl: string | null; records: Array<Record<string, unknown>> }> {
  if (!outputs || outputs.length === 0) {
    return { primaryUrl: null, records: [] };
  }

  const jobAction = String(job?.action || "").toLowerCase();
  const jobStatus = String(job?.status || "").toLowerCase();
  let variant: "standard" | "img2img" | "video" = "standard";

  if (jobAction === "img2vid" || jobAction === "img2video") {
    variant = "video";
  } else if (jobStatus.includes("img2img") || jobAction === "img2img") {
    variant = "img2img";
  }

  const records: Array<Record<string, unknown>> = [];
  let primaryUrl: string | null = null;

  for (let i = 0; i < outputs.length; i++) {
    const result = await storeSingleOutput(env, supabase, job, outputs[i], i, variant);
    if (!result) continue;
    records.push({
      job_id: job.id,
      type: variant,
      url: result,
      index: i + 1,
      created_at: new Date().toISOString()
    });
    if (!primaryUrl) {
      primaryUrl = result;
    }
  }

  return { primaryUrl, records };
}

async function storeSingleOutput(
  env: GenerationEnv,
  supabase: SupabaseAdminClient,
  job: any,
  url: string,
  index: number,
  variant: "standard" | "img2img" | "video"
): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("[replicate] failed to fetch output", url, response.status);
      return null;
    }

    const contentTypeRaw = response.headers.get("content-type") || "image/png";
    const contentType = contentTypeRaw.toLowerCase();

    let uploadBody: ReadableStream | ArrayBuffer | null = null;
    let arrayBuffer: ArrayBuffer | null = null;

    const hashCacheKey = `url:${url}`;
    let hashHex = hashCache.get(hashCacheKey);
    if (!hashHex) {
      let hashBufferSource: ArrayBuffer;
      if (response.body) {
        const [hashStream, uploadStream] = response.body.tee();
        hashBufferSource = await new Response(hashStream).arrayBuffer();
        uploadBody = uploadStream;
      } else {
        arrayBuffer = await response.arrayBuffer();
        hashBufferSource = arrayBuffer;
      }
      const hashBuffer = await crypto.subtle.digest("SHA-256", hashBufferSource);
      hashHex = toHex(new Uint8Array(hashBuffer));
      hashCache.set(hashCacheKey, hashHex);
      if (!arrayBuffer && !uploadBody) {
        uploadBody = hashBufferSource;
      } else if (!uploadBody && arrayBuffer) {
        uploadBody = arrayBuffer;
      }
    } else {
      if (response.body) {
        uploadBody = response.body;
      }
    }

    if (!uploadBody) {
      if (!arrayBuffer) {
        arrayBuffer = await response.arrayBuffer();
      }
      uploadBody = arrayBuffer;
    }

    const blockKey = `blocked:${hashHex}`;
    let blocked = blocklistCache.get(blockKey);
    if (blocked === undefined) {
      const result = await supabase.selectSingle<any>(
        `moderation_blocklist?hash=eq.${hashHex}&select=id`
      ).catch(() => null);
      blocked = Boolean(result);
      blocklistCache.set(blockKey, blocked ?? false);
    }

    if (blocked) {
      console.warn("[replicate] blocked output via hash list", hashHex);
      await supabase.patch(
        "generation_jobs",
        `id=eq.${job.id}`,
        {
          status: "blocked",
          moderation_status: "flagged",
          moderation_labels: ["hash_blocked"],
          moderated_at: new Date().toISOString()
        },
        { prefer: "return=minimal" }
      );
      await refundCreditsSafe(supabase, job.user_id, job.id, Number(job.credits_charged || 1), "hash_blocked");
      return null;
    }

    if (!env.R2_PUBLIC) {
      console.warn("[replicate] R2 binding missing; returning source URL", url);
      return url;
    }

    const objectKey = buildR2ObjectKey(env, job.user_id, job.id, variant, contentType, index);

    await env.R2_PUBLIC.put(objectKey, uploadBody, {
      httpMetadata: { contentType }
    });

    const mappedUrl = await createCdnMapping(env, {
      objectKey,
      contentType,
      userId: job.user_id,
      jobId: job.id
    });

    return mappedUrl || `${env.R2_PUBLIC_BASE_URL || ""}/${objectKey}`;
  } catch (error) {
    console.error("[replicate] store output failed", error);
    return null;
  }
}

function buildR2ObjectKey(
  env: GenerationEnv,
  userId: string,
  jobId: number,
  variant: "standard" | "img2img" | "video",
  contentType: string,
  index: number
): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const prefix = (env.R2_PUBLIC_PREFIX || "public/").replace(/^(\/+)|(^)/, "");
  const shard = (userId || "").replace(/[^a-f0-9]/gi, "").toLowerCase().slice(0, 2) || "00";
  const type = contentType.toLowerCase();
  const ext = type.includes("png")
    ? "png"
    : type.includes("webp")
      ? "webp"
      : type.includes("gif")
        ? "gif"
        : type.includes("mp4")
          ? "mp4"
          : type.includes("quicktime")
            ? "mov"
            : type.includes("webm")
              ? "webm"
              : type.includes("jpeg") || type.includes("jpg")
                ? "jpg"
                : variant === "video"
                  ? "mp4"
                  : "jpg";
  const suffix = index > 0 ? `${variant}-${index + 1}` : `${variant}`;
  return `${prefix}users/${shard}/${userId}/results/${yyyy}/${mm}/${dd}/jobs/${jobId}/${suffix}.${ext}`;
}


function normalizeAspectRatio(input?: string | null): string {
  const candidate = String(input || "").trim();
  if (candidate && ALLOWED_ASPECT_RATIOS.has(candidate)) {
    return candidate;
  }
  return "1:1";
}

function normalizeMode(mode?: string | null): "txt2img" | "img2img" {
  const value = String(mode || "txt2img").toLowerCase();
  if (value === "img2img" || value === "img2img_pending") {
    return "img2img";
  }
  return "txt2img";
}

function normalizeModelId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lowered = trimmed.toLowerCase();
  const normalized = lowered.replace(/\s+/g, "-");
  return normalized;
}

function clampOutputs(count: number | undefined, mode: "txt2img" | "img2img"): number {
  const value = Number.isFinite(count) ? Number(count) : 1;
  const max = mode === "img2img" ? 1 : 4;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function clampListLimit(input: string | null): number {
  const num = Number(input);
  if (!Number.isFinite(num)) return 10;
  return Math.max(1, Math.min(50, Math.floor(num)));
}

function clampOffset(input: string | null): number {
  const num = Number(input);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

function getDimensions(aspectRatio: string, longEdge: number): { width: number; height: number } {
  const ratios: Record<string, [number, number]> = {
    "1:1": [1, 1],
    "16:9": [16, 9],
    "9:16": [9, 16],
    "4:3": [4, 3],
    "3:4": [3, 4],
    "3:2": [3, 2],
    "2:3": [2, 3]
  };

  const [w, h] = ratios[aspectRatio] || ratios["1:1"];
  if (w >= h) {
    const width = longEdge;
    const height = Math.round((longEdge * h) / w);
    return { width, height };
  }
  const height = longEdge;
  const width = Math.round((longEdge * w) / h);
  return { width, height };
}

async function recordGenerationSources(
  supabase: SupabaseAdminClient,
  jobId: number,
  relation: 'img2img' | 'img2vid',
  references: ImageReferenceInfo[]
): Promise<void> {
  if (!Array.isArray(references) || references.length === 0) {
    return;
  }

  const seen = new Set<string>();
  const payload: Array<{ parent_job_id: number | null; child_job_id: number; relation: string; source_url: string }> = [];

  for (const reference of references) {
    if (!reference) continue;
    const candidate = (reference.normalizedUrl || reference.originalUrl || '').trim();
    if (!candidate) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);

    const parentId = Number.isFinite(reference.parentJobId) ? Number(reference.parentJobId) : null;
    payload.push({
      parent_job_id: parentId,
      child_job_id: jobId,
      relation,
      source_url: candidate
    });

    if (payload.length >= 8) {
      break;
    }
  }

  if (!payload.length) {
    return;
  }

  await supabase.insert('generation_links', payload, { prefer: 'resolution=merge-duplicates' });
}

async function attachExternalSources(
  supabase: SupabaseAdminClient,
  jobId: number,
  payload: Record<string, unknown>,
  env?: GenerationEnv
): Promise<Record<string, unknown>> {
  try {
    // Fetch all source URLs (both external and internal)
    const rows = await supabase.select<any[]>(
      `generation_links?child_job_id=eq.${jobId}&source_url=not.is.null&select=source_url&order=created_at.asc`
    );

    const sources = Array.isArray(rows)
      ? rows
          .map((row) => (typeof row?.source_url === 'string' ? row.source_url : null))
          .filter((url): url is string => Boolean(url))
      : [];

    if (!sources.length) {
      return payload;
    }

    // Convert CDN URLs to /img/direct format to enable watermarking
    const r2PublicBase = env?.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    const processedSources = sources.map(source => {
      if (r2PublicBase && source.startsWith(r2PublicBase)) {
        const objectKey = source.slice(r2PublicBase.length).replace(/^\/+/, "");
          return `/img/direct?key=${cachedEncodeURIComponent(objectKey)}`;
      }
      return source;
    });

    const existingRelated = (payload.related && typeof payload.related === 'object' && !Array.isArray(payload.related))
      ? (payload.related as Record<string, unknown>)
      : {};

    return {
      ...payload,
      related: {
        ...existingRelated,
        external_sources: processedSources
      }
    };
  } catch (error) {
    console.warn('[generation/status] failed to fetch external sources', error);
    return payload;
  }
}

async function computeFingerprint(params: { userId: string; prompt: string; modelId: string; aspectRatio: string; outputCount: number }): Promise<string> {
  const raw = `${params.userId}|${params.prompt}|${params.modelId}|${params.aspectRatio}|${params.outputCount}`;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomId(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

async function refundCreditsSafe(client: SupabaseAdminClient, userId: string, jobId: number, amount: number, reason: string): Promise<void> {
  let refundAmount = Math.abs(Number(amount || 0));

  if (!refundAmount) {
    try {
      const fallbackTx = await client.selectSingle<{ amount: number }>(
        `credit_transactions?user_id=eq.${cachedEncodeURIComponent(userId)}&job_id=eq.${jobId}&action=in.(txt2img,img2img,hd,img2vid)&order=created_at.desc&select=amount`
      );
      if (fallbackTx && typeof fallbackTx.amount === "number") {
        refundAmount = Math.abs(fallbackTx.amount);
      }
    } catch (error) {
      console.warn("[generation] failed to resolve fallback refund amount", { userId, jobId, reason, error });
    }
  }

  if (!refundAmount) {
    console.warn("[generation] refund skipped due to zero amount", { userId, jobId, reason });
    return;
  }

  try {
    await client.rpc("refund_credits", {
      p_user_id: userId,
      p_job_id: jobId,
      p_refund_amount: refundAmount,
      p_reason: reason
    });
  } catch (error) {
    console.error("[generation] refund_credits failed", error);
  }
}

const VERSION_CACHE_TTL_MS = 5 * 60 * 1000;
const replicateVersionCache = new Map<string, { value: string; ts: number }>();

async function resolveReplicateModel(env: GenerationEnv, modelId: string) {
  const config = getReplicateModelConfig(modelId);
  const envRecord = env as Record<string, string | undefined>;

  const slug = (envRecord[config.slugEnv] || config.fallbackSlug || "").trim();
  if (!slug) {
    throw new Error(`REPLICATE_MODEL_SLUG not configured for ${modelId}`);
  }

  let version = config.versionEnv ? (envRecord[config.versionEnv] || "").trim() : "";
  if (!version && config.fallbackVersion) {
    version = config.fallbackVersion.trim();
  }

  const cacheKey = slug;

  if (!version) {
    const cached = replicateVersionCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < VERSION_CACHE_TTL_MS) {
      version = cached.value;
    } else {
      if (!env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN missing; required to resolve replicate model version");
      }

      const resp = await fetch(getReplicateModelUrl(env, slug), {
        headers: {
          Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      });

      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`replicate_version_lookup_failed:${resp.status}:${detail}`);
      }

      const data = await resp.json();
      version = typeof data?.latest_version?.id === "string" ? data.latest_version.id.trim() : "";
      if (!version) {
        throw new Error("replicate_version_lookup_failed:missing_latest_version");
      }

      replicateVersionCache.set(cacheKey, { value: version, ts: Date.now() });
    }
  }

  if (!version) {
    throw new Error(`REPLICATE_MODEL_VERSION missing for ${modelId}`);
  }

  return { slug, version, config };
}

async function createReplicatePrediction(options: {
  env: GenerationEnv;
  request: Request;
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  outputCount: number;
  dimensions: { width: number; height: number };
  mode: "txt2img" | "img2img" | "video";
  referenceImages?: ImageReferenceInfo[];
  enhancePrompt?: boolean;
}): Promise<any> {
  if (!options.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN missing");
  }

  const { slug, version, config } = await resolveReplicateModel(options.env, options.modelId);
  const origin = options.env.AUTH_BASE_URL || new URL(options.request.url).origin;
  const webhookUrl = options.env.REPLICATE_WEBHOOK_URL || `${origin}/webhook/replicate`;
  const webhookIsHttps = /^https:\/\//i.test(webhookUrl);

  const input = buildReplicateInput({
    config,
    prompt: options.prompt,
    negativePrompt: options.negativePrompt,
    aspectRatio: options.aspectRatio,
    outputCount: options.outputCount,
    dimensions: options.dimensions,
    referenceImages: options.referenceImages,
    enhancePrompt: options.enhancePrompt,
    mode: options.mode
  });

  const payload: Record<string, unknown> = { version, input };
  if (webhookIsHttps) {
    payload.webhook = webhookUrl;
    payload.webhook_events_filter = ["completed"];
  } else {
    console.warn("[generation] skipping webhook registration because URL is not HTTPS", webhookUrl);
  }

  logger.debug("[replicate] creating prediction", {
    modelId: options.modelId,
    slug,
    version,
    inputPreview: {
      ...input,
      prompt: typeof input.prompt === "string" ? `${input.prompt.substring(0, 50)}...` : input.prompt
    },
    webhook: payload.webhook
  });

  const response = await fetch(getReplicatePredictionsUrl(options.env), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${options.env.REPLICATE_API_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[replicate] prediction request failed:", response.status, detail);
    throw new Error(`replicate_request_failed:${response.status}:${detail}`);
  }

  const result = await response.json();
  logger.debug("[replicate] prediction created", {
    id: result.id,
    status: result.status,
    urls: result.urls
  });

  return result;
}

function collectReferenceUrls(references?: ImageReferenceInfo[]): string[] {
  if (!Array.isArray(references) || references.length === 0) {
    return [];
  }

  const urls: string[] = [];

  for (const reference of references) {
    if (!reference) continue;
    const candidates = [reference.resolvedUrl, reference.normalizedUrl, reference.originalUrl];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        const trimmed = candidate.trim();
        if (!urls.includes(trimmed)) {
          urls.push(trimmed);
        }
        break;
      }
    }
    if (urls.length >= 4) {
      break;
    }
  }

  return urls;
}

function buildReplicateInput(options: {
  config: ReturnType<typeof getReplicateModelConfig>;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  outputCount: number;
  dimensions: { width: number; height: number };
  referenceImages?: ImageReferenceInfo[];
  enhancePrompt?: boolean;
  mode: "txt2img" | "img2img" | "video";
}): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: options.prompt
  };

  if (options.negativePrompt) {
    input.negative_prompt = options.negativePrompt;
  }

  const referenceUrls = collectReferenceUrls(options.referenceImages);
  if (referenceUrls.length > 0) {
    const primary = referenceUrls[0];
    input.image = primary;
    input.image_url = primary;
    input.init_image = primary;
    input.reference_images = referenceUrls;
  }

  if (options.enhancePrompt !== undefined) {
    input.enhance_prompt = options.enhancePrompt;
  }

  const outputs = Math.max(1, options.outputCount);
  input.num_outputs = options.config.allowMultiOutput === false ? 1 : outputs;

  input.aspect_ratio = options.aspectRatio;

  if (options.config.type === "video" || options.mode === "video") {
    input.output_format = "mp4";
  } else {
    input.width = options.dimensions.width;
    input.height = options.dimensions.height;
    input.output_format = "png";
  }

  return input;
}

function normalizeOutputs(output: unknown): string[] {
  if (Array.isArray(output)) {
    const urls: string[] = [];
    for (const item of output) {
      if (typeof item === "string") {
        urls.push(item);
      } else if (item && typeof item === "object" && typeof (item as any).url === "string") {
        urls.push((item as any).url);
      }
    }
    return urls;
  }
  return [];
}

async function verifyWebhookSignature(
  secret: string,
  payload: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  webhookSignature: string | null
): Promise<boolean> {
  if (!webhookSignature) {
    console.warn("[webhook] no webhook-signature header provided");
    return false;
  }

  if (!webhookId || !webhookTimestamp) {
    console.warn("[webhook] missing webhook-id or webhook-timestamp");
    return false;
  }

  // Remove whsec_ prefix from secret if present
  const secretKey = secret.startsWith("whsec_") ? secret.slice(6) : secret;

  // Construct signed content: webhook_id.webhook_timestamp.body
  const signedContent = `${webhookId}.${webhookTimestamp}.${payload}`;

  // Parse signatures (space-delimited, format: "v1,signature1 v1,signature2")
  const signatures = webhookSignature.split(" ").map(sig => {
    // Remove version prefix (e.g., "v1,")
    const parts = sig.split(",");
    return parts.length > 1 ? parts[1] : sig;
  });

  logger.debug("[webhook] signature debug", {
    secretKeyLength: secretKey.length,
    secretKeyPrefix: secretKey.substring(0, 8) + "...",
    webhookIdLength: webhookId.length,
    timestampLength: webhookTimestamp.length,
    payloadLength: payload.length,
    signedContentSample: signedContent.substring(0, 100) + "...",
    rawSignatureHeader: webhookSignature.substring(0, 50) + "..."
  });

  // Base64 decode the secret key
  let keyBytes: Uint8Array;
  try {
    // Decode secret as base64
    const binaryString = atob(secretKey);
    keyBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      keyBytes[i] = binaryString.charCodeAt(i);
    }
  } catch (error) {
    console.warn("[webhook] failed to base64 decode secret, using as-is");
    keyBytes = encoder.encode(secretKey);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));

  // Convert to base64 (not hex!)
  const signatureArray = new Uint8Array(signatureBuffer);
  const binaryString = String.fromCharCode(...signatureArray);
  const expected = btoa(binaryString);

  // Check against all provided signatures
  // Signatures may have version prefix like "v1,signature"
  const isValid = signatures.some(sig => {
    const cleanSig = sig.includes(',') ? sig.split(',')[1] : sig;
    return timingSafeEqual(expected, cleanSig);
  });

  if (!isValid) {
    console.warn("[webhook] signature mismatch", {
      expected: expected.substring(0, 16) + "...",
      received: signatures.map(s => s.substring(0, 16) + "..."),
      webhookId,
      webhookTimestamp,
      signedContentLength: signedContent.length
    });
  }

  return isValid;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function storeExternalImages(
  env: GenerationEnv,
  supabase: SupabaseAdminClient,
  jobId: number,
  imageUrls: string[],
  userId: string,
  jobStatus: "pending" | "img2img_pending" = "pending"
): Promise<{ primaryUrl: string | null; records: Array<Record<string, unknown>> }> {
  if (!imageUrls || imageUrls.length === 0) {
    return { primaryUrl: null, records: [] };
  }

  const records: Array<Record<string, unknown>> = [];
  let primaryUrl: string | null = null;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    // Store external URLs directly (they're already on external CDN)
    const result = await storeSingleOutput(env, supabase, { id: jobId, status: jobStatus, user_id: userId }, url, i, "standard");
    if (!result) continue;

    records.push({
      job_id: jobId,
      type: "standard",
      url: result,
      index: i + 1,
      created_at: new Date().toISOString()
    });

    if (!primaryUrl) {
      primaryUrl = result;
    }
  }

  return { primaryUrl, records };
}

interface VideoGenerateBody {
  prompt?: string;
  model?: string;
  enhance_prompt?: boolean;
  aspect_ratio?: string;
  images?: string[];
  is_public?: boolean;
}

async function handleVideoGenerate(request: Request, env: GenerationEnv): Promise<Response> {
  let body: VideoGenerateBody;
  try {
    body = await request.json();
  } catch (error) {
    return jsonWithCors(request, env, { error: "INVALID_JSON" }, 400);
  }

  const supabase = new SupabaseAdminClient(env);
  const session = await requireSessionUser(request, env);
  if (!session.ok) {
    return jsonWithCors(request, env, { error: session.error }, session.status);
  }
  const user = session.user;

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return jsonWithCors(request, env, { error: "PROMPT_REQUIRED" }, 400);
  }
  if (prompt.length > 2000) {
    return jsonWithCors(request, env, { error: "PROMPT_TOO_LONG" }, 400);
  }

  const modelRaw = String(body.model || "");
  const modelId = normalizeModelId(modelRaw);
  const modelConfig = getReplicateModelConfig(modelId);
  const images = Array.isArray(body.images) ? body.images.filter((x): x is string => typeof x === "string") : [];
  const enhancePrompt = body.enhance_prompt !== undefined ? Boolean(body.enhance_prompt) : true;
  const isPublic = body.is_public !== undefined ? Boolean(body.is_public) : true;
  const aspectRatio = normalizeAspectRatio(body.aspect_ratio);

  if (!modelId) {
    return c.json({ error: { message: "model is required" } }, 400);
  }
  if (modelConfig.type !== "video") {
    return c.json({ error: { message: `Invalid video model: ${modelId}` } }, 400);
  }

  const creditsToCharge = (CREDIT_COSTS as any)[modelId];
  if (creditsToCharge === undefined) {
    return c.json({ error: { message: `Invalid model: ${modelId}` } }, 400);
  }

  const tempReplicateId = `pending:${randomId(16)}`;

  let rpcResult: any;
  try {
    rpcResult = await supabase.rpc("deduct_and_create_job", {
      p_user_id: user.id,
      p_replicate_id: tempReplicateId,
      p_prompt: prompt,
      p_style: "default",
      p_action: "img2vid",
      p_credit_cost: creditsToCharge
    });
  } catch (error) {
    console.error("[video/generate] deduct_and_create_job failed", error);
    return jsonWithCors(request, env, { error: "JOB_CREATION_FAILED" }, 500);
  }

  const rpcPayload = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  if (!rpcPayload?.success) {
    const status = /insufficient/i.test(String(rpcPayload?.error_message || "")) ? 402 : 400;
    return jsonWithCors(request, env, { error: rpcPayload?.error_message || "JOB_CREATION_FAILED" }, status);
  }

  const jobId: number = rpcPayload.job_id;
  const newBalance: number = rpcPayload.new_balance ?? 0;

  const dimensions = getDimensions(aspectRatio, 1024);
  const updatePayload: Record<string, unknown> = {
    model_id: modelId,
    aspect_ratio: aspectRatio,
    image_width: dimensions.width,
    image_height: dimensions.height,
    output_count: 1,
    is_public: isPublic,
    credits_charged: creditsToCharge,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.patch("generation_jobs", `id=eq.${jobId}`, updatePayload, { prefer: "return=minimal" });
  } catch (error) {
    console.error("[video/generate] failed to update job metadata", error);
    return jsonWithCors(request, env, { error: "JOB_UPDATE_FAILED" }, 500);
  }

  let referenceInfos: ImageReferenceInfo[] = [];
  if (images.length > 0) {
    try {
      referenceInfos = await resolveImageReferences({
        supabase,
        env,
        urls: images,
        requireResolvedUrl: true
      });
    } catch (error) {
      console.error('[video/generate] failed to resolve reference images', error);
      await supabase.patch("generation_jobs", `id=eq.${jobId}`, {
        status: "failed",
        error_message: "IMAGE_URL_RESOLUTION_FAILED",
        updated_at: new Date().toISOString()
      }, { prefer: "return=minimal" }).catch(() => null);
      await refundCreditsSafe(supabase, user.id, jobId, creditsToCharge, "video_image_reference_failed");
      return jsonWithCors(request, env, { error: "IMAGE_URL_RESOLUTION_FAILED" }, 400);
    }
  }

  if (referenceInfos.length > 0) {
    try {
      await recordGenerationSources(supabase, jobId, 'img2vid', referenceInfos);
    } catch (error) {
    console.warn('[video/generate] failed to record img2vid sources', error);
    }
  }

  logger.info("[video/generate] using Replicate", { modelId });
  logger.debug("[video/generate] replicate request", {
    jobId,
    userId: user.id,
    modelId,
    prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
    imagesCount: images.length,
    enhancePrompt,
    hasApiKey: !!env.REPLICATE_API_TOKEN
  });

  let replicatePrediction: any;
  try {
    replicatePrediction = await createReplicatePrediction({
      env,
      request,
      modelId,
      prompt,
      aspectRatio,
      outputCount: 1,
      dimensions,
      mode: "video",
      referenceImages: referenceInfos,
      enhancePrompt
    });
  } catch (error) {
    console.error("[video/generate] replicate prediction failed", error);
    await supabase.patch("generation_jobs", `id=eq.${jobId}`, {
      status: "failed",
      error_message: "PROVIDER_ERROR",
      updated_at: new Date().toISOString()
    }, { prefer: "return=minimal" });
    await refundCreditsSafe(supabase, user.id, jobId, creditsToCharge, "replicate_video_creation_failed");
    return jsonWithCors(request, env, { error: "REPLICATE_PREDICTION_FAILED" }, 502);
  }

  const replicateId = replicatePrediction.id;

  try {
    await supabase.patch("generation_jobs", `id=eq.${jobId}`, {
      replicate_id: replicateId,
      status: "pending",
      updated_at: new Date().toISOString()
    }, { prefer: "return=minimal" });
  } catch (error) {
    console.error("[video/generate] failed to store replicate id", error);
  }

  return jsonWithCors(request, env, {
    ok: true,
    job_id: jobId,
    replicate_id: replicateId,
    task_id: replicateId,
    status: "pending",
    credits_remaining: newBalance
  }, 201);
}

async function handleVideoStatus(request: Request, env: GenerationEnv): Promise<Response> {
  const supabase = new SupabaseAdminClient(env);
  const session = await requireSessionUser(request, env);
  if (!session.ok) {
    return jsonWithCors(request, env, { error: session.error }, session.status);
  }
  const user = session.user;

  const url = new URL(request.url);
  const taskId = url.searchParams.get("task_id");
  const jobIdParam = url.searchParams.get("job_id");

  if (!taskId) {
    return jsonWithCors(request, env, { error: "TASK_ID_REQUIRED" }, 400);
  }

  const jobId = Number(jobIdParam);
  if (!Number.isFinite(jobId)) {
    return jsonWithCors(request, env, { error: "INVALID_JOB_ID" }, 400);
  }

  // Verify job belongs to user
  const job = await supabase.selectSingle<any>(
    `generation_jobs?id=eq.${jobId}&user_id=eq.${cachedEncodeURIComponent(user.id)}&deleted_at=is.null&select=id,status,replicate_id,video_url,image_url,error_message,credits_charged`
  );
  if (!job) {
    return jsonWithCors(request, env, { error: "JOB_NOT_FOUND" }, 404);
  }

  if (job.replicate_id && taskId && job.replicate_id !== taskId) {
    logger.warn("[video/status] task id mismatch", { jobId, taskId, replicateId: job.replicate_id });
  }

  const status = String(job.status || "").toLowerCase();

  if (status === "ready") {
    const videoUrl = job.video_url || job.image_url || "";
    return jsonWithCors(request, env, {
      ok: true,
      status: "SUCCESS",
      video_url: videoUrl
    });
  }

  if (status === "failed" || status === "blocked") {
    const failReason = String(job.error_message || "Unknown error");
    return jsonWithCors(request, env, {
      ok: true,
      status: "FAILED",
      fail_reason: failReason
    });
  }

  return jsonWithCors(request, env, {
    ok: true,
    status: "IN_PROGRESS"
  });
}
