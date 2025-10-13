import { MODEL_IDS } from "@shared/model-ids";

export type Action = "txt2img" | "img2img" | "img2vid";

export interface JobVariant {
  url: string;
  type: "standard" | "img2img";
  index: number;
}

export interface Job {
  id: number;
  user_id: string;
  action: Action;
  status: string;
  model_id: string;
  aspect_ratio: string;
  image_url: string;
  hd_url: string;
  video_url?: string;
  prompt: string;
  prompt_enhanced?: string;
  image_variants: JobVariant[];
  img2img_variants: JobVariant[];
  related?: Record<string, unknown>;
  is_public: boolean;
  public_id?: string;
  created_at: string;
  updated_at: string;
}

export interface JobLite {
  id: number;
  user_id: string;
  action: Action;
  status: string;
  model_id: string;
  image_url: string;
  hd_url: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export interface JobListItem extends JobLite {
  public_link: string | null;
  credit_spent: number;
  thumbnail_url: string;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function sanitizeMediaUrl(value: unknown): string {
  const raw = safeString(value);
  if (!raw) return "";
  if (raw.startsWith("/img/") || raw.startsWith("/download")) {
    return raw;
  }
  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port || "";
    if (
      (hostname === "localhost" || hostname === "127.0.0.1") &&
      (port === "" || port === "3000" || port === "8788") &&
      parsed.pathname.startsWith("/img/")
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {}
  return raw;
}

function normalizeModelId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lowered = trimmed.toLowerCase();
  const normalized = lowered.replace(/\s+/g, "-");
  switch (normalized) {
    case "flux-kontext-pro":
      return MODEL_IDS.PREMIUM_TXT2IMG;
    case "flux-kontext-max":
      return MODEL_IDS.MAX_TXT2IMG;
    case "seedream4.0":
      return MODEL_IDS.IMG2IMG;
    case "flux-schnell":
      return MODEL_IDS.PRIMARY_TXT2IMG;
    case "gemini-2.5-flash-image-hd":
      return MODEL_IDS.ALT_INLINE_TXT2IMG;
    default:
      return normalized;
  }
}

export function inferAction(rawAction?: any, status?: any, raw?: any): Action {
  const a = String(rawAction || "").toLowerCase();
  if (a === "img2img" || a === "img2vid") return a as Action;
  const s = String(status || "").toLowerCase();
  try {
    if (raw && raw.video_url) return "img2vid";
  } catch {}
  if (/(img2img|hd_ready|img2img_ready)/.test(s)) return "img2img";
  try {
    const ext = (raw?.related && (raw.related as any).external_sources) || (raw && (raw as any).external_sources);
    if (Array.isArray(ext) && ext.length > 0) return "img2img";
  } catch {}
  return "txt2img";
}

export function inferModelId(replicateId?: any, modelId?: any): string | null {
  const m = String(modelId || "").trim();
  if (m) return normalizeModelId(m);
  const rep = String(replicateId || "");
  if (!rep) return null;
  if (rep.includes("flux") || rep.includes("schnell")) return MODEL_IDS.PRIMARY_TXT2IMG;
  return null;
}

export function derivePublicLink(job: any): string | null {
  if (job?.is_public && job?.public_id) {
    return `/v/${job.public_id}`;
  }
  return null;
}

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeJob(raw: any): Job {
  const action = inferAction(raw?.action, raw?.status, raw);
  const modelId = inferModelId(raw?.replicate_id, raw?.model_id) || MODEL_IDS.PRIMARY_TXT2IMG;
  const images = ensureArray(raw?.image_variants || raw?.images).map((url, index) => ({
    url: sanitizeMediaUrl(url),
    type: action === "img2img" ? "img2img" : "standard",
    index: index + 1
  }));
  const img2imgVariants = ensureArray(raw?.img2img_variants).map((url, index) => ({
    url: sanitizeMediaUrl(url),
    type: "img2img",
    index: index + 1
  }));

  return {
    id: Number(raw?.id || 0),
    user_id: safeString(raw?.user_id || raw?.userId),
    action,
    status: safeString(raw?.status || "pending"),
    model_id: modelId,
    aspect_ratio: safeString(raw?.aspect_ratio || "1:1"),
    image_url: sanitizeMediaUrl(raw?.image_url || raw?.hd_url || raw?.imageUrl || ""),
    hd_url: sanitizeMediaUrl(raw?.hd_url || ""),
    video_url: safeString(raw?.video_url || ""),
    prompt: safeString(raw?.prompt || raw?.prompt_enhanced || ""),
    prompt_enhanced: safeString(raw?.prompt_enhanced || ""),
    image_variants: images,
    img2img_variants: img2imgVariants,
    related: raw?.related || {},
    is_public: Boolean(raw?.is_public),
    public_id: safeString(raw?.public_id || ""),
    created_at: raw?.created_at || new Date().toISOString(),
    updated_at: raw?.updated_at || new Date().toISOString()
  } as Job;
}

export function normalizeJobLite(raw: any): JobLite {
  return {
    id: Number(raw?.id || 0),
    user_id: safeString(raw?.user_id || raw?.userId),
    status: safeString(raw?.status || "pending"),
    action: inferAction(raw?.action, raw?.status, raw),
    model_id: inferModelId(raw?.replicate_id, raw?.model_id) || MODEL_IDS.PRIMARY_TXT2IMG,
    image_url: sanitizeMediaUrl(raw?.image_url || raw?.hd_url || raw?.imageUrl || ""),
    hd_url: sanitizeMediaUrl(raw?.hd_url || ""),
    prompt: safeString(raw?.prompt || raw?.prompt_enhanced || ""),
    created_at: raw?.created_at || new Date().toISOString(),
    updated_at: raw?.updated_at || new Date().toISOString()
  } as JobLite;
}

export function normalizeHistoryItem(raw: any): JobListItem {
  const job = normalizeJobLite(raw);
  job.public_link = derivePublicLink(raw);
  job.credit_spent = Number(raw?.credits_charged || raw?.credit_spent || 0);
  job.thumbnail_url = sanitizeMediaUrl(raw?.image_url || raw?.hd_url || "");
  return job;
}
