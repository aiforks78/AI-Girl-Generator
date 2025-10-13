import type { Action, Job, JobLite, JobListItem } from '@/types/generation';
import { MODEL_IDS } from '@shared/model-ids';

export function inferAction(rawAction?: any, status?: any, raw?: any): Action {
  const a = String(rawAction || '').toLowerCase();
  if (a === 'img2img' || a === 'img2vid') return a as Action;
  const s = String(status || '').toLowerCase();
  // detect video when video_url present
  try { if (raw && raw.video_url) return 'img2vid'; } catch {}
  if (/(img2img|hd_ready|img2img_ready)/.test(s)) return 'img2img';
  try {
    // If external source URLs exist, treat as img2img
    const ext = (raw?.related && (raw.related as any).external_sources) || (raw && (raw as any).external_sources);
    if (Array.isArray(ext) && ext.length > 0) return 'img2img';
  } catch {}
  // future: detect video statuses
  return 'txt2img';
}

function normalizeModelId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const lowered = trimmed.toLowerCase();
  const normalized = lowered.replace(/\s+/g, '-');
  switch (normalized) {
    case 'flux-kontext-pro':
      return MODEL_IDS.PREMIUM_TXT2IMG;
    case 'flux-kontext-max':
      return MODEL_IDS.MAX_TXT2IMG;
    case 'seedream4.0':
      return MODEL_IDS.IMG2IMG;
    case 'flux-schnell':
      return MODEL_IDS.PRIMARY_TXT2IMG;
    case 'gemini-2.5-flash-image-hd':
      return MODEL_IDS.ALT_INLINE_TXT2IMG;
    default:
      return normalized;
  }
}

export function inferModelId(replicateId?: any, modelId?: any): string | null {
  const m = String(modelId || '').trim();
  if (m) return normalizeModelId(m);
  const rep = String(replicateId || '').toLowerCase();
  if (rep) return MODEL_IDS.PRIMARY_TXT2IMG;
  return null;
}

export function unifyImageUrl(image_url?: any, hd_url?: any): string | null {
  const u = String(image_url || '').trim();
  const h = String(hd_url || '').trim();
  return (u || h) || null;
}

export function mergeVariants(a?: any, b?: any): string[] {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of [...arrA, ...arrB]) {
    if (typeof v !== 'string' || !v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function normalizeJob(raw: any): Job {
  const model_id = inferModelId(raw?.replicate_id, raw?.model_id);
  const action = inferAction(raw?.action, raw?.status, raw);
  const image_url = unifyImageUrl(raw?.image_url, raw?.hd_url);
  const image_variants = mergeVariants(raw?.image_variants, raw?.img2img_variants);
  return {
    id: Number(raw?.id),
    prompt: String(raw?.prompt || raw?.prompt_enhanced || ''),
    prompt_enhanced: raw?.prompt_enhanced ?? null,
    model_id,
    replicate_id: raw?.replicate_id || null,
    action,
    status: String(raw?.status || ''),
    image_url,
    image_variants,
    img2img_variants: undefined,
    output_count: typeof raw?.output_count === 'number' ? raw.output_count : null,
    video_url: raw?.video_url || null,
    aspect_ratio: raw?.aspect_ratio || null,
    image_width: typeof raw?.image_width === 'number' ? raw.image_width : null,
    image_height: typeof raw?.image_height === 'number' ? raw.image_height : null,
    created_at: raw?.created_at,
    updated_at: raw?.updated_at,
    user_name: raw?.user_name || null,
    user_avatar: raw?.user_avatar || null,
    is_public: typeof raw?.is_public === 'boolean' ? !!raw.is_public : (raw?.is_public == null ? null : !!raw.is_public),
    public_id: typeof raw?.public_id === 'string' ? (raw.public_id || null) : (raw?.public_id ? String(raw.public_id) : null),
    related: raw?.related || undefined,
  };
}

export function toJobLite(raw: any): JobLite {
  return {
    id: Number(raw?.id),
    image_url: unifyImageUrl(raw?.image_url, raw?.hd_url),
    model_id: inferModelId(raw?.replicate_id, raw?.model_id),
    action: inferAction(raw?.action, raw?.status, raw),
    status: String(raw?.status || ''),
    created_at: raw?.created_at || null,
  };
}

export function normalizeHistoryItem(raw: any, variants?: string[]): JobListItem {
  const base = normalizeJob(raw);
  const resolvedError = (() => {
    const msg = typeof raw?.error_message === 'string' ? raw.error_message.trim() : '';
    return msg || null;
  })();
  return {
    id: base.id,
    prompt: base.prompt,
    model_id: base.model_id,
    action: base.action,
    status: base.status,
    image_url: base.image_url,
    image_variants: Array.isArray(variants) && variants.length ? variants : base.image_variants,
    output_count: base.output_count,
    video_url: (raw?.video_url || base.video_url || null),
    aspect_ratio: base.aspect_ratio,
    image_width: base.image_width,
    image_height: base.image_height,
    created_at: base.created_at,
    error_message: resolvedError,
    related: base.related,
  };
}
