import { MODEL_IDS } from "./model-ids";

// Model-based credit pricing
export const CREDIT_COSTS = {
  // Text-to-Image models
  [MODEL_IDS.PRIMARY_TXT2IMG]: 1,
  [MODEL_IDS.PREMIUM_TXT2IMG]: 12,
  [MODEL_IDS.MAX_TXT2IMG]: 24,

  // Image-to-Image models
  [MODEL_IDS.IMG2IMG]: 10,
  [MODEL_IDS.INLINE_TXT2IMG]: 6,
  [MODEL_IDS.ALT_INLINE_TXT2IMG]: 10,

  // Image-to-Video models
  [MODEL_IDS.VIDEO_FAST]: 60,
  [MODEL_IDS.VIDEO_PRO]: 140
} as const;

export const FEATURE_COSTS = {
  create_character: 10,
} as const;

export const CREDIT_REWARDS = {
  signup_bonus: 5,
  daily_checkin: 0
} as const;

export const DAILY_LIMITS = {
  checkin_max: 3,
  checkin_interval: 4
} as const;

export const TRANSACTION_ACTIONS = {
  TXT2IMG: "txt2img",
  IMG2IMG: "img2img",
  IMG2VID: "img2vid",
  SIGNUP_BONUS: "signup_bonus",
  DAILY_TOPUP: "daily_topup",
  DAILY_CHECKIN: "daily_checkin",
  PURCHASE: "purchase",
  REFUND: "refund",
  CREATE_CHARACTER: "create_character",
} as const;

export type TransactionAction = typeof TRANSACTION_ACTIONS[keyof typeof TRANSACTION_ACTIONS];

export function validateCreditAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= -1000 && amount <= 1000;
}
