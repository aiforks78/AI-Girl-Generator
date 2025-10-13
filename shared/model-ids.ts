export const MODEL_IDS = {
  PRIMARY_TXT2IMG: "primary-txt2img-model",
  PREMIUM_TXT2IMG: "premium-txt2img-model",
  MAX_TXT2IMG: "max-txt2img-model",
  INLINE_TXT2IMG: "inline-txt2img-model",
  ALT_INLINE_TXT2IMG: "alt-inline-txt2img-model",
  IMG2IMG: "img2img-model",
  CHARACTER_CREATION: "character-creation-model",
  VIDEO_FAST: "video-fast-model",
  VIDEO_PRO: "video-pro-model"
} as const;

export type ModelId = typeof MODEL_IDS[keyof typeof MODEL_IDS];

export const MODEL_LABELS: Record<ModelId, string> = {
  [MODEL_IDS.PRIMARY_TXT2IMG]: "Primary Text-to-Image",
  [MODEL_IDS.PREMIUM_TXT2IMG]: "Premium Text-to-Image",
  [MODEL_IDS.MAX_TXT2IMG]: "Max Text-to-Image",
  [MODEL_IDS.INLINE_TXT2IMG]: "Inline Text-to-Image",
  [MODEL_IDS.ALT_INLINE_TXT2IMG]: "Alternate Inline Text-to-Image",
  [MODEL_IDS.IMG2IMG]: "Image-to-Image",
  [MODEL_IDS.CHARACTER_CREATION]: "Character Creation",
  [MODEL_IDS.VIDEO_FAST]: "Video Generation (Fast)",
  [MODEL_IDS.VIDEO_PRO]: "Video Generation (Pro)"
};

export function getModelLabel(id: string | null | undefined): string {
  if (!id) return "Unknown model";
  const normalized = id.toLowerCase();
  const match = (Object.values(MODEL_IDS) as string[]).find((value) => value.toLowerCase() === normalized);
  if (match) {
    return MODEL_LABELS[match as ModelId];
  }
  return id;
}
