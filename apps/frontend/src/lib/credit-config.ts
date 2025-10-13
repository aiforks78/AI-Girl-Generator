/**
 * 🎀 Girl Generator - frontend credit system extensions
 * Base constants and validators are sourced from shared/credit-config
 */

import {
  CREDIT_VALUE_USD,
  CREDIT_COSTS,
  CREDIT_REWARDS,
  DAILY_LIMITS,
  TRANSACTION_ACTIONS,
  FEATURE_COSTS,
  validateCreditAmount,
} from "@shared/credit-config";

export {
  CREDIT_VALUE_USD,
  CREDIT_COSTS,
  CREDIT_REWARDS,
  DAILY_LIMITS,
  TRANSACTION_ACTIONS,
  FEATURE_COSTS,
  validateCreditAmount,
};

export type { TransactionAction } from "@shared/credit-config";

// Credit package configuration for purchases
export const CREDIT_PACKAGES = {
  small: {
    credits: 10,
    price: 0.5, // Consistent 0.05 per credit
    stripe_price_id: process.env.STRIPE_PRICE_SMALL || 'price_small',
    popular: false
  },
  medium: {
    credits: 50,
    price: 2.5,
    stripe_price_id: process.env.STRIPE_PRICE_MEDIUM || 'price_medium',
    popular: true
  },
  large: {
    credits: 200,
    price: 10.0,
    stripe_price_id: process.env.STRIPE_PRICE_LARGE || 'price_large',
    popular: false
  }
} as const;

// Validate transaction action names
export function isValidTransactionAction(action: string): action is keyof typeof TRANSACTION_ACTIONS {
  return Object.values(TRANSACTION_ACTIONS).includes(action as any);
}

// Get action description in English
export function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    [TRANSACTION_ACTIONS.TXT2IMG]: 'Text to Image',
    [TRANSACTION_ACTIONS.IMG2IMG]: 'Image to Image',
    [TRANSACTION_ACTIONS.IMG2VID]: 'Image to Video',
    [TRANSACTION_ACTIONS.SIGNUP_BONUS]: 'Signup Bonus',
    [TRANSACTION_ACTIONS.DAILY_TOPUP]: 'Daily Top-up',
    [TRANSACTION_ACTIONS.DAILY_CHECKIN]: 'Daily Check-in',
    [TRANSACTION_ACTIONS.PURCHASE]: 'Credit Purchase',
    [TRANSACTION_ACTIONS.REFUND]: 'Credit Refund'
  };

  return descriptions[action] || action;
}

// Deprecated helper to derive action credit amounts (model pricing preferred)
// Retained for backwards compatibility in transaction history displays
export function getActionAmount(action: string): number {
  switch (action) {
    case TRANSACTION_ACTIONS.SIGNUP_BONUS:
      return CREDIT_REWARDS.signup_bonus;
    case TRANSACTION_ACTIONS.DAILY_CHECKIN:
      return CREDIT_REWARDS.daily_checkin;
    default:
      // For TXT2IMG/IMG2IMG, actual cost depends on model used
      // This is only used for display purposes in history
      return 0;
  }
}

// Check whether the user has enough credits
export function hasEnoughCredits(userCredits: number, action: string): boolean {
  const cost = Math.abs(getActionAmount(action));
  return userCredits >= cost;
}

// Compute the value of a credit package
export function calculatePackageValue(packageKey: keyof typeof CREDIT_PACKAGES): number {
  const pkg = CREDIT_PACKAGES[packageKey];
  return pkg.credits / pkg.price; // Credits earned per dollar
}

// Determine the recommended credit package
export function getRecommendedPackage(): keyof typeof CREDIT_PACKAGES {
  let bestValue = 0;
  let recommended: keyof typeof CREDIT_PACKAGES = 'small';
  
  for (const [key, pkg] of Object.entries(CREDIT_PACKAGES)) {
    const value = calculatePackageValue(key as keyof typeof CREDIT_PACKAGES);
    if (value > bestValue) {
      bestValue = value;
      recommended = key as keyof typeof CREDIT_PACKAGES;
    }
  }
  
  return recommended;
}

// Credit system status details
export interface CreditSystemStatus {
  enabled: boolean;
  maintenance: boolean;
  message?: string;
}

// Read the current credit system status
export function getCreditSystemStatus(): CreditSystemStatus {
  return {
    enabled: true,
    maintenance: false,
    message: undefined
  };
}

// Aggregated credit usage statistics
export interface CreditUsageStats {
  total_users: number;
  total_credits_issued: number;
  total_credits_spent: number;
  average_credits_per_user: number;
  most_popular_action: string;
}

// Format credit values for display
export function formatCredits(credits: number): string {
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}k`;
  }
  return credits.toString();
}

// Calculate the next eligible check-in timestamp
export function getNextCheckinTime(lastCheckinTime: Date): Date {
  const nextTime = new Date(lastCheckinTime);
  nextTime.setHours(nextTime.getHours() + DAILY_LIMITS.checkin_interval);
  return nextTime;
}

// Determine whether a user can check in again
export function canCheckin(lastCheckinTime: Date | null, todayCheckinCount: number): boolean {
  if (todayCheckinCount >= DAILY_LIMITS.checkin_max) {
    return false;
  }
  
  if (!lastCheckinTime) {
    return true;
  }
  
  const now = new Date();
  const nextCheckinTime = getNextCheckinTime(lastCheckinTime);
  return now >= nextCheckinTime;
}

// Export types
export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;
