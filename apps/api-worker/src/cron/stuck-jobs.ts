import { SupabaseAdminClient } from "../lib/supabase";
import { GenerationEnv } from "../routes/generation";
import { logger } from "../lib/logger";
import { cachedEncodeURIComponent } from "../lib/url-cache";
import { getReplicatePredictionUrl } from "../lib/providers/replicate";

interface StuckJob {
  id: number;
  user_id: string;
  replicate_id: string;
  credits_charged: number;
  created_at: string;
  status: string;
  action?: string;
  image_url?: string;
  hd_url?: string;
  video_url?: string;
}

/**
 * Cron handler to recover stuck Replicate jobs
 * Runs periodically to check jobs that are stuck in pending state
 */
export async function handleStuckJobs(env: GenerationEnv): Promise<void> {
  const supabase = new SupabaseAdminClient(env);

  // Find jobs stuck in pending/img2img_pending for more than 2 minutes (external providers timeout ~30s, add buffer)
  const twoMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  try {
    // Check both pending and img2img_pending status
    const stuckPending = await supabase.select<StuckJob[]>(
      `generation_jobs?status=eq.pending&created_at=lt.${twoMinutesAgo}&replicate_id=not.is.null&deleted_at=is.null&select=id,user_id,replicate_id,credits_charged,created_at,status,action,image_url,hd_url,video_url&limit=50`
    );

    const stuckImg2Img = await supabase.select<StuckJob[]>(
      `generation_jobs?status=eq.img2img_pending&created_at=lt.${twoMinutesAgo}&replicate_id=not.is.null&deleted_at=is.null&select=id,user_id,replicate_id,credits_charged,created_at,status,action,image_url,hd_url,video_url&limit=50`
    );

    const stuckJobs = [...(stuckPending || []), ...(stuckImg2Img || [])];

    if (!stuckJobs || stuckJobs.length === 0) {
      logger.debug('[cron/stuck-jobs] no stuck jobs found');
      return;
    }

    logger.info(`[cron/stuck-jobs] found ${stuckJobs.length} potentially stuck jobs`);

    let recovered = 0;
    let failed = 0;

    for (const job of stuckJobs) {

      try {
        const predictionUrl = getReplicatePredictionUrl(env, job.replicate_id);
        const response = await fetch(predictionUrl, {
          headers: {
            'Authorization': `Token ${env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            logger.warn(`[cron/stuck-jobs] prediction ${job.replicate_id} not found (404); marking job ${job.id} as failed`);

            try {
              await supabase.patch(
                "generation_jobs",
                `id=eq.${job.id}`,
                {
                  status: "failed",
                  error_message: "Replicate prediction missing (404)",
                  updated_at: new Date().toISOString()
                },
                { prefer: "return=minimal" }
              );

              const refundAmount = Math.abs(Number(job.credits_charged || 0));
              if (refundAmount > 0) {
                await refundCreditsSafe(supabase, job.user_id, job.id, refundAmount, "replicate_missing");
              }

              failed++;
            } catch (patchError) {
              console.error(`[cron/stuck-jobs] failed to mark job ${job.id} missing prediction as failed`, patchError);
            }
          } else {
            console.warn(`[cron/stuck-jobs] failed to fetch prediction ${job.replicate_id}: ${response.status}`);
          }

          // Important: consume the response body to avoid stalled HTTP warning
          await response.text().catch(() => {});
          continue;
        }

        const prediction = await response.json();
        logger.debug(`[cron/stuck-jobs] job ${job.id} replicate status: ${prediction.status}`);

        // Handle succeeded predictions
        if (prediction.status === 'succeeded' && prediction.output) {
          const outputs = normalizeOutputs(prediction.output);
          const stored = await storeGenerationOutputs(env, supabase, job, outputs);

          const nowIso = new Date().toISOString();
          const jobAction = String(job.action || "").toLowerCase();
          const jobStatus = String(job.status || "").toLowerCase();
          const update: Record<string, unknown> = {
            updated_at: nowIso
          };

        if (jobAction === 'img2vid' || jobAction === 'img2video') {
            update.status = 'ready';
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
            update.status = jobStatus === 'pending' ? 'ready' : 'img2img_ready';
            if (stored.primaryUrl) {
              if (jobStatus === 'pending') {
                update.image_url = stored.primaryUrl;
              } else {
                update.hd_url = stored.primaryUrl;
              }
            } else {
              if (jobStatus === 'pending' && job.image_url) {
                update.image_url = job.image_url;
              }
              if (jobStatus !== 'pending' && job.hd_url) {
                update.hd_url = job.hd_url;
              }
            }
          }

          await supabase.patch("generation_jobs", `id=eq.${job.id}`, update, { prefer: "return=minimal" });

          if (stored.records.length > 0) {
            await supabase.insert("generation_images", stored.records, { prefer: "resolution=merge-duplicates" });
          }

          recovered++;
          logger.info(`[cron/stuck-jobs] recovered job ${job.id}`);
        }

        // Handle failed predictions
        if (prediction.status === 'failed' || prediction.status === 'canceled') {
          const reason = prediction.error || `Replicate ${prediction.status}`;
          await supabase.patch("generation_jobs", `id=eq.${job.id}`, {
            status: "failed",
            error_message: reason,
            updated_at: new Date().toISOString()
          }, { prefer: "return=minimal" });

          const refundAmount = Math.abs(Number(job.credits_charged || 0));
          if (refundAmount > 0) {
            await refundCreditsSafe(supabase, job.user_id, job.id, refundAmount, `replicate_${prediction.status}_cron`);
          }

          failed++;
          logger.info(`[cron/stuck-jobs] marked job ${job.id} as failed`);
        }

      } catch (error) {
        console.error(`[cron/stuck-jobs] error processing job ${job.id}:`, error);
      }
    }

    logger.info(`[cron/stuck-jobs] completed: ${recovered} recovered, ${failed} failed`);

  } catch (error) {
    console.error('[cron/stuck-jobs] cron job failed:', error);
  }
}

// Helper functions (copied from generation.ts to avoid circular imports)

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

  if (jobAction === 'img2vid' || jobAction === 'img2video') {
    variant = 'video';
  } else if (jobStatus.includes('img2img') || jobAction === 'img2img') {
    variant = 'img2img';
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
      console.warn("[cron/stuck-jobs] failed to fetch output", url, response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentTypeRaw = response.headers.get("content-type") || "image/png";
    const contentType = contentTypeRaw.toLowerCase();

    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashHex = toHex(new Uint8Array(hashBuffer));

    const blocked = await supabase.selectSingle<any>(
      `moderation_blocklist?hash=eq.${hashHex}&select=id`
    );
    if (blocked) {
      console.warn("[cron/stuck-jobs] blocked output via hash list", hashHex);
      return null;
    }

    if (!env.R2_PUBLIC) {
      console.warn("[cron/stuck-jobs] R2 binding missing; returning source URL", url);
      return url;
    }

    const objectKey = buildR2ObjectKey(env, job.user_id, job.id, variant, contentType, index);

    await env.R2_PUBLIC.put(objectKey, arrayBuffer, {
      httpMetadata: { contentType: contentTypeRaw }
    });

    const mappedUrl = `${env.R2_PUBLIC_BASE_URL || ""}/${objectKey}`;
    return mappedUrl;
  } catch (error) {
    console.error("[cron/stuck-jobs] store output failed", error);
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

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function refundCreditsSafe(
  client: SupabaseAdminClient,
  userId: string,
  jobId: number,
  amount: number,
  reason: string
): Promise<void> {
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
      console.warn("[cron/stuck-jobs] failed to resolve fallback refund amount", { userId, jobId, reason, error });
    }
  }

  if (!refundAmount) {
    console.warn("[cron/stuck-jobs] refund skipped due to zero amount", { userId, jobId, reason });
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
    console.error("[cron/stuck-jobs] refund_credits failed", error);
  }
}
