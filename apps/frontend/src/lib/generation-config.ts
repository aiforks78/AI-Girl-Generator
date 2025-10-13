/**
 * 🎀 Girl Generator generation configuration
 *
 * Centralizes optimal parameter presets for primary text-to-image models
 */

export interface GenerationConfig {
  version: string; // Prefer version hash instead of model name
  width: number;
  height: number;
  num_inference_steps: number;
  guidance_scale: number;
  output_format: 'webp' | 'png' | 'jpeg';
  output_quality: number;
  go_fast: boolean;
  seed?: number;
}

// Supported aspect ratios for previews
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';

// Primary Replicate model slug and version management
export const FLUX_SCHNELL_MODEL = process.env.REPLICATE_MODEL_SLUG || 'your-replicate-model-slug';
// In production the version should be provided by environment configuration
const FLUX_SCHNELL_VERSION_FALLBACK = process.env.REPLICATE_FLUX_SCHNELL_VERSION || "";

// Optional helper to fetch the latest model version dynamically
export async function getLatestFluxVersion(): Promise<string> {
  try {
    // 1) Prefer the environment variable (recommended for production)
    if (FLUX_SCHNELL_VERSION_FALLBACK && FLUX_SCHNELL_VERSION_FALLBACK.length > 0) {
      return FLUX_SCHNELL_VERSION_FALLBACK;
    }

    // 2) Otherwise query the latest version from Replicate
    const apiBase = (process.env.REPLICATE_API_BASE || '').trim();
    if (!apiBase) {
      throw new Error('REPLICATE_API_BASE missing');
    }
    if (!FLUX_SCHNELL_MODEL || FLUX_SCHNELL_MODEL === 'your-replicate-model-slug') {
      throw new Error('REPLICATE_MODEL_SLUG missing');
    }

    const normalizedBase = apiBase.replace(/\/$/, '');
    const response = await fetch(`${normalizedBase}/models/${FLUX_SCHNELL_MODEL}`, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const model = await response.json();
      const v = model?.latest_version?.id;
      if (typeof v === 'string' && v.trim().length > 0) return v;
      // Avoid returning the model slug when a valid version id is missing
      throw new Error('Replicate did not return latest_version.id');
    }
  } catch (error) {
    console.warn('Failed to resolve flux-schnell version:', error);
  }

  // 3) Fail fast when the version cannot be resolved to avoid invalid invocations
  throw new Error('Unable to resolve Replicate version for the primary text-to-image model. Set REPLICATE_FLUX_SCHNELL_VERSION or ensure REPLICATE_API_TOKEN is valid.');
}

// 🚀 Text-to-image configuration optimized for speed
export const TXT2IMG_CONFIG: GenerationConfig = {
  version: FLUX_SCHNELL_VERSION_FALLBACK,
  // Default 1:1 at 1024×1024 (≈1.05MP)
  width: 1024,
  height: 1024,
  num_inference_steps: 4, 
  guidance_scale: 2.5, 
  output_format: "png",
  output_quality: 95, // Balance quality and file size
  go_fast: false, 
};

// Legacy name PREVIEW_CONFIG removed

// 🎨 Image-to-image configuration optimized for quality
export const IMG2IMG_CONFIG: GenerationConfig = {
  version: FLUX_SCHNELL_VERSION_FALLBACK,
  width: 1024,
  height: 1024,
  num_inference_steps: 4, // Extra steps to ensure quality
  guidance_scale: 0, // Recommended value for the primary model
  output_format: "png", // PNG preserves quality for HD output
  output_quality: 95, // Highest quality
  go_fast: false, // Avoid fast mode for HD output
};

// Legacy name HD_CONFIG removed

// 📊 Performance targets
export const PERFORMANCE_TARGETS = {
  txt2img: {
    maxTime: 30000, // Complete within 30 seconds
    targetTime: 15000, // Aim for 15 seconds
    optimalTime: 5000, // Ideal 5 seconds
  },
  img2img: {
    maxTime: 120000, // Complete within 2 minutes
    targetTime: 60000, // Aim for 1 minute
    optimalTime: 30000, // Ideal 30 seconds
  }
};

// 💰 REMOVED: COST_CONFIG - use CREDIT_COSTS from '@/lib/credit-config' with model names
// Old mode-based pricing has been completely replaced with model-based pricing

// 🔧 Retrieve configuration based on generation type
export function getGenerationConfig(type: 'txt2img' | 'img2img', aspectRatio?: AspectRatio): GenerationConfig {
  const baseConfig = type === 'txt2img' ? TXT2IMG_CONFIG : IMG2IMG_CONFIG;

  // Adjust dimensions by aspect ratio for txt2img only
  const sizedConfig: GenerationConfig = { ...baseConfig };
  if (type === 'txt2img') {
    const ar = aspectRatio || '1:1';
    const dims = getTxt2ImgDimensions(ar);
    sizedConfig.width = dims.width;
    sizedConfig.height = dims.height;
  }

  return {
    ...sizedConfig,
    seed: Math.floor(Math.random() * 1000000) // Random seed per generation
  };
}

// 📈 Retrieve performance targets
export function getPerformanceTarget(type: 'txt2img' | 'img2img') {
  return (globalThis as any).PERFORMANCE_TARGETS?.[type];
}

// 💳 REMOVED: getCostConfig - use CREDIT_COSTS from '@/lib/credit-config' with model names

// 🎯 Validate generation type
export function isValidGenerationType(type: string): type is 'txt2img' | 'img2img' {
  return type === 'txt2img' || type === 'img2img';
}

// 🔍 Estimate cost heuristically from parameters
export function estimateCost(config: GenerationConfig): number {
  const baseTime = config.num_inference_steps * 2; // Roughly two seconds per step
  // Estimate relative cost with 512×512 as a baseline
  const sizeMultiplier = (config.width * config.height) / (512 * 512);
  const qualityMultiplier = config.go_fast ? 0.8 : 1.2; // Fast mode is slightly cheaper
  
  return Math.round(baseTime * sizeMultiplier * qualityMultiplier * 0.0001 * 1000) / 1000;
}

// ⚡ Provide optimization suggestions
export function getOptimizationSuggestions(type: 'txt2img' | 'img2img'): string[] {
  const suggestions: string[] = [];
  
  if (type === 'txt2img') {
    suggestions.push(
      'Enable go_fast mode to speed up generation',
      'Limit inference steps to 2 for faster previews',
      'Use WebP output to reduce transfer size',
      'Consider lower preview resolutions such as 768×768 or 1024×576'
    );
  } else {
    suggestions.push(
      'Use 4 inference steps to maintain quality',
      'Prefer higher quality settings with fast mode disabled',
      'Use PNG output to retain detail',
      'Keep fast mode off for the best results'
    );
  }
  
  return suggestions;
}

// 🎨 Style-specific parameter tweaks
export function getStyleSpecificConfig(
  baseConfig: GenerationConfig,
  styleId: string
): GenerationConfig {
  const config = { ...baseConfig };
  
  // Adjust configuration based on style
  switch (styleId) {
    case 'dreamy':
      // Dreamy style may need an extra step for softness
      if (config.num_inference_steps < 4) {
        config.num_inference_steps = Math.min(config.num_inference_steps + 1, 4);
      }
      break;
      
    case 'modern':
      // Modern style favors sharpness, enable fast mode
      config.go_fast = true;
      break;
      
    case 'elegant':
      // Elegant style prefers higher quality
      config.output_quality = Math.max(config.output_quality, 90);
      break;
  }
  
  return config;
}

// 📊 Validate configuration values
export function validateConfig(config: GenerationConfig): string[] {
  const errors: string[] = [];
  
  if (config.width < 256 || config.width > 2048) {
    errors.push('Width must be between 256 and 2048');
  }
  
  if (config.height < 256 || config.height > 2048) {
    errors.push('Height must be between 256 and 2048');
  }
  
  if (config.num_inference_steps < 1 || config.num_inference_steps > 10) {
    errors.push('Inference steps must be between 1 and 10');
  }
  
  if (config.output_quality < 1 || config.output_quality > 100) {
    errors.push('Output quality must be between 1 and 100');
  }
  
  return errors;
}

// txt2img dimension mapping helper
export function getTxt2ImgDimensions(aspect: AspectRatio, longEdge = 1024): { width: number; height: number } {
  const baseDimensions: Record<AspectRatio, { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1024, height: 576 },
    '9:16': { width: 576, height: 1024 },
    '4:3': { width: 1024, height: 768 },
    '3:4': { width: 768, height: 1024 },
    '3:2': { width: 960, height: 640 },
    '2:3': { width: 640, height: 960 },
  };

  const base = baseDimensions[aspect] ?? baseDimensions['1:1'];
  const targetEdge = longEdge >= 1536 ? 2048 : 1024;
  const multiplier = targetEdge === 2048 ? 2 : 1;

  return {
    width: base.width * multiplier,
    height: base.height * multiplier,
  };
}

// Convenience helper for txt2img (supersedes legacy preview/hd naming)
export function getTxt2ImgConfig(aspectRatio?: AspectRatio): GenerationConfig {
  return getGenerationConfig('txt2img', aspectRatio);
}
