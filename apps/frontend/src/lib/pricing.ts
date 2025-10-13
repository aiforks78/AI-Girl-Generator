import { MODEL_IDS, type ModelId } from '@shared/model-ids';

/**
 * Pricing/credits rules for generation.
 * Frontend-safe: no secrets, pure functions only.
 */

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
export type GenerationMode = 'txt2img' | 'img2img';

export interface PricingContext {
  modelId: ModelId;
  stage: GenerationMode;
  outputs: number; // number of images requested
  aspectRatio?: AspectRatio;
  width?: number;
  height?: number;
}

interface ModelPricingRule {
  baseCredits: { txt2img: number; img2img: number };
  supportsMultiOutput: boolean;
  maxOutputs: number;
  aspectRatioMultipliers?: Partial<Record<AspectRatio, number>>;
}

const MODEL_PRICING: Record<string, ModelPricingRule> = {
  [MODEL_IDS.PRIMARY_TXT2IMG]: {
    baseCredits: { txt2img: 1, img2img: 1 },
    supportsMultiOutput: true,
    maxOutputs: 4,
    // Optional multipliers by AR; keep 1 for all by default
    aspectRatioMultipliers: {
      '1:1': 1,
      '4:3': 1,
      '3:4': 1,
      '16:9': 1,
      '9:16': 1,
      '3:2': 1,
      '2:3': 1,
    },
  },
  [MODEL_IDS.INLINE_TXT2IMG]: {
    baseCredits: { txt2img: 4, img2img: 4 },
    supportsMultiOutput: true,
    maxOutputs: 4,
    aspectRatioMultipliers: {
      '1:1': 1,
      '4:3': 1,
      '3:4': 1,
      '16:9': 1,
      '9:16': 1,
      '3:2': 1,
      '2:3': 1,
    },
  },
  [MODEL_IDS.ALT_INLINE_TXT2IMG]: {
    baseCredits: { txt2img: 4, img2img: 4 },
    supportsMultiOutput: false,
    maxOutputs: 1,
    aspectRatioMultipliers: {
      '1:1': 1,
      '4:3': 1,
      '3:4': 1,
      '16:9': 1,
      '9:16': 1,
      '3:2': 1,
      '2:3': 1,
    },
  },
};

function normalizeModelId(input: ModelId | string): string {
  const normalized = String(input || '').toLowerCase().replace(/\s+/g, '-');
  if (normalized === MODEL_IDS.INLINE_TXT2IMG.toLowerCase()) {
    return MODEL_IDS.INLINE_TXT2IMG;
  }
  if (normalized === MODEL_IDS.ALT_INLINE_TXT2IMG.toLowerCase()) {
    return MODEL_IDS.ALT_INLINE_TXT2IMG;
  }
  if (normalized === MODEL_IDS.PRIMARY_TXT2IMG.toLowerCase()) {
    return MODEL_IDS.PRIMARY_TXT2IMG;
  }
  return normalized;
}

export function getModelRule(modelId: ModelId): ModelPricingRule {
  const key = normalizeModelId(modelId);
  return MODEL_PRICING[key] || MODEL_PRICING[MODEL_IDS.PRIMARY_TXT2IMG];
}

export function clampOutputs(modelId: ModelId, outputs: number): number {
  const rule = getModelRule(modelId);
  const v = Math.max(1, Math.floor(outputs || 1));
  return Math.min(v, rule.maxOutputs);
}

export function computeCredits(ctx: PricingContext): number {
  const rule = getModelRule(ctx.modelId);
  const outputs = clampOutputs(ctx.modelId, ctx.outputs);
  const base = rule.baseCredits[ctx.stage];
  const arMul = (ctx.aspectRatio && rule.aspectRatioMultipliers?.[ctx.aspectRatio]) || 1;
  const credits = base * outputs * arMul;
  // Credits are integers; round up to be safe
  return Math.max(1, Math.ceil(credits));
}

export function getMaxOutputs(modelId: ModelId): number {
  return getModelRule(modelId).maxOutputs;
}
