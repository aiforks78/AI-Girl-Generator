import { MODEL_IDS } from "@shared/model-ids";

export type ReplicateModelType = "txt2img" | "img2img" | "video";

export interface ReplicateModelConfig {
  slugEnv: string;
  versionEnv?: string;
  fallbackSlug: string;
  fallbackVersion?: string;
  type: ReplicateModelType;
  allowMultiOutput?: boolean;
}

export const REPLICATE_MODEL_CONFIG: Record<string, ReplicateModelConfig> = {
  [MODEL_IDS.PRIMARY_TXT2IMG]: {
    slugEnv: "REPLICATE_MODEL_SLUG_PRIMARY",
    versionEnv: "REPLICATE_MODEL_VERSION_PRIMARY",
    fallbackSlug: "replicate/primary-model",
    fallbackVersion: "",
    type: "txt2img",
    allowMultiOutput: true
  },
  [MODEL_IDS.PREMIUM_TXT2IMG]: {
    slugEnv: "REPLICATE_MODEL_SLUG_PREMIUM",
    versionEnv: "REPLICATE_MODEL_VERSION_PREMIUM",
    fallbackSlug: "replicate/premium-model",
    fallbackVersion: "",
    type: "txt2img"
  },
  [MODEL_IDS.MAX_TXT2IMG]: {
    slugEnv: "REPLICATE_MODEL_SLUG_MAX",
    versionEnv: "REPLICATE_MODEL_VERSION_MAX",
    fallbackSlug: "replicate/max-model",
    fallbackVersion: "",
    type: "txt2img"
  },
  [MODEL_IDS.INLINE_TXT2IMG]: {
    slugEnv: "REPLICATE_MODEL_SLUG_INLINE",
    versionEnv: "REPLICATE_MODEL_VERSION_INLINE",
    fallbackSlug: "replicate/inline-model",
    fallbackVersion: "",
    type: "txt2img",
    allowMultiOutput: false
  },
  [MODEL_IDS.ALT_INLINE_TXT2IMG]: {
    slugEnv: "REPLICATE_MODEL_SLUG_INLINE_ALT",
    versionEnv: "REPLICATE_MODEL_VERSION_INLINE_ALT",
    fallbackSlug: "replicate/inline-alt-model",
    fallbackVersion: "",
    type: "txt2img",
    allowMultiOutput: false
  },
  [MODEL_IDS.IMG2IMG]: {
    slugEnv: "REPLICATE_MODEL_SLUG_IMG2IMG",
    versionEnv: "REPLICATE_MODEL_VERSION_IMG2IMG",
    fallbackSlug: "replicate/img2img-model",
    fallbackVersion: "",
    type: "img2img"
  },
  [MODEL_IDS.CHARACTER_CREATION]: {
    slugEnv: "REPLICATE_MODEL_SLUG_CHARACTER",
    versionEnv: "REPLICATE_MODEL_VERSION_CHARACTER",
    fallbackSlug: "replicate/character-model",
    fallbackVersion: "",
    type: "txt2img"
  },
  [MODEL_IDS.VIDEO_FAST]: {
    slugEnv: "REPLICATE_MODEL_SLUG_VIDEO_FAST",
    versionEnv: "REPLICATE_MODEL_VERSION_VIDEO_FAST",
    fallbackSlug: "replicate/video-fast-model",
    fallbackVersion: "",
    type: "video",
    allowMultiOutput: false
  },
  [MODEL_IDS.VIDEO_PRO]: {
    slugEnv: "REPLICATE_MODEL_SLUG_VIDEO_PRO",
    versionEnv: "REPLICATE_MODEL_VERSION_VIDEO_PRO",
    fallbackSlug: "replicate/video-pro-model",
    fallbackVersion: "",
    type: "video",
    allowMultiOutput: false
  }
};

export function getReplicateModelConfig(modelId: string): ReplicateModelConfig {
  return REPLICATE_MODEL_CONFIG[modelId] ?? REPLICATE_MODEL_CONFIG[MODEL_IDS.PRIMARY_TXT2IMG];
}
