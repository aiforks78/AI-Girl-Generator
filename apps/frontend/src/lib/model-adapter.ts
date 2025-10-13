import { MODEL_IDS, type ModelId } from '@shared/model-ids';

/**
 * Model adapter for Replicate models.
 * Unifies input mapping across different models (txt2img / img2img).
 */

export type GenerationMode = 'txt2img' | 'img2img';

export interface BuildInputArgs {
  modelId: ModelId;
  mode: GenerationMode;
  prompt: string;
  negativePrompt?: string;
  loras?: { path: string; scale: number }[]; // optional LoRA adapters
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  outputFormat?: 'webp' | 'png' | 'jpeg';
  outputQuality?: number;
  goFast?: boolean;
  seed?: number;
  numOutputs?: number;
  // img2img
  initImages?: string[]; // URLs
  strength?: number; // 0..1
}

export async function getReplicateVersion(modelId: ModelId): Promise<string> {
  const id = String(modelId).toLowerCase();
  if (id === MODEL_IDS.PRIMARY_TXT2IMG.toLowerCase()) {
    // Defer to existing helper to fetch the latest version
    const { getLatestFluxVersion } = await import('./generation-config');
    return getLatestFluxVersion();
  }
  if (id === MODEL_IDS.INLINE_TXT2IMG.toLowerCase() || id === MODEL_IDS.ALT_INLINE_TXT2IMG.toLowerCase()) {
    // Prefer env override to avoid hardcoding unstable version ids
    const v = process.env.REPLICATE_INLINE_MODEL_VERSION;
    // Fallback placeholder; should be set in env for production
    return v || 'latest-inline-model-version-id';
  }
  return 'latest';
}

/**
 * Map unified args to Replicate model-specific input.
 */
export function buildReplicateInput(args: BuildInputArgs): Record<string, any> {
  const {
    modelId, mode,
    prompt, negativePrompt,
    width, height,
    numInferenceSteps, guidanceScale,
    outputFormat, outputQuality,
    goFast, seed, numOutputs,
    initImages, strength,
  } = args;

  if (String(modelId).toLowerCase() === MODEL_IDS.PRIMARY_TXT2IMG.toLowerCase()) {
    const input: Record<string, any> = {
      prompt,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      ...(args.loras && args.loras.length ? { loras: args.loras } : {}),
      ...(typeof width === 'number' ? { width } : {}),
      ...(typeof height === 'number' ? { height } : {}),
      // Hint aspect_ratio for models that support it
      ...(typeof width === 'number' && typeof height === 'number' ? (() => {
        const r = width / height;
        const close = (a: number, b: number) => Math.abs(a - b) < 0.02;
        let ar: string | undefined;
        if (close(r, 1)) ar = '1:1';
        else if (close(r, 16/9)) ar = '16:9';
        else if (close(r, 9/16)) ar = '9:16';
        else if (close(r, 4/3)) ar = '4:3';
        else if (close(r, 3/4)) ar = '3:4';
        else if (close(r, 3/2)) ar = '3:2';
        else if (close(r, 2/3)) ar = '2:3';
        return ar ? { aspect_ratio: ar } : {};
      })() : {}),
      ...(typeof numInferenceSteps === 'number' ? { num_inference_steps: numInferenceSteps } : {}),
      ...(typeof guidanceScale === 'number' ? { guidance_scale: guidanceScale } : {}),
      ...(outputFormat ? { output_format: outputFormat } : {}),
      ...(typeof outputQuality === 'number' ? { output_quality: outputQuality } : {}),
      ...(typeof goFast === 'boolean' ? { go_fast: goFast } : {}),
      ...(typeof seed === 'number' ? { seed } : {}),
      ...(typeof numOutputs === 'number' ? { num_outputs: numOutputs } : {}),
    };
    return input;
  }

  if ([MODEL_IDS.INLINE_TXT2IMG.toLowerCase(), MODEL_IDS.ALT_INLINE_TXT2IMG.toLowerCase()].includes(String(modelId).toLowerCase())) {
    // Inline prompt models expect `image_input` (array of URLs) and `prompt`.
    // We build the minimal shape here for consistency if ever used via predictions,
    // but our route prefers replicate.run for these models.
    const input: Record<string, any> = {
      prompt,
    };
    if (mode === 'img2img') {
      const arr = Array.isArray(initImages) ? initImages.filter(Boolean) : [];
      if (arr.length) input.image_input = arr;
    }
    return input;
  }

  // Default passthrough
  return { prompt };
}

export function getModelSupportsMultiOutput(modelId: ModelId): boolean {
  switch (modelId) {
    case MODEL_IDS.PRIMARY_TXT2IMG:
      return true;
    default:
      return false;
  }
}
