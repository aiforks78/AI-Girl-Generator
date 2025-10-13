/**
 * 🎀 Girl Generator - Credit System Core Service
 *
 * Provides core credit business logic and database operations.
 *
 * ⚠️ Server-only usage - contains sensitive SERVICE_ROLE_KEY
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { creditLogger, logDatabaseError } from './secure-logger';
import { env } from './env-validator';
import { CREDIT_COSTS, CREDIT_REWARDS, TRANSACTION_ACTIONS } from './credit-config';

// Create Supabase client (validated environment variables)
const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey
);

// Credit operation result shape
export interface CreditOperationResult {
  success: boolean;
  newBalance: number;
  error?: string;
  transactionId?: string;
}

// User credit information shape
export interface UserCreditsInfo {
  credits: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

// Credit transaction shape
export interface CreditTransaction {
  id: string;
  user_id: string;
  job_id?: number;
  action: string;
  amount: number;
  balance_after: number;
  metadata?: any;
  created_at: string;
}

/**
 * Secure credit deduction using database RPC for atomicity.
 */
export async function deductCreditsSecurely(
  userId: string,
  amount: number
): Promise<CreditOperationResult> {
  try {
    const { data, error } = await supabase
      .rpc('deduct_credits_atomic', {
        p_user_id: userId,
        p_amount: amount
      });

    if (error) {
      return {
        success: false,
        newBalance: 0,
        error: error.message
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        newBalance: 0,
        error: 'No result returned from deduction'
      };
    }

    const result = data[0];
    return {
      success: result.success,
      newBalance: result.new_balance,
      error: result.success ? undefined : 'Insufficient credits'
    };

  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create preview generation job and deduct credits atomically via RPC.
 */
export async function createGenerationJobSecurely(
  userId: string,
  replicateId: string,
  prompt: string,
  style: string,
  action: 'txt2img' | 'img2img' | 'img2vid',
  creditCost: number
): Promise<CreditOperationResult & { jobId?: number }> {
  try {
    // Always call the shared RPC deduct_and_create_job (p_action uses standard 'txt2img'/'img2img').
    const { data, error } = await supabase
      .rpc('deduct_and_create_job', {
        p_user_id: userId,
        p_replicate_id: replicateId,
        p_prompt: prompt,
        p_style: style,
        // normalize to modern actions (txt2img/img2img)
        p_action: action || 'txt2img',
        p_credit_cost: creditCost
      });

    if (error) {
      return {
        success: false,
        newBalance: 0,
        error: error.message
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        newBalance: 0,
        error: 'No result returned from job creation'
      };
    }

    const result = data[0];
    return {
      success: result.success,
      newBalance: result.new_balance,
      jobId: result.job_id,
      error: result.success ? undefined : result.error_message
    };

  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upgrade to HD and deduct credits atomically via RPC.
 */
export async function upgradeToHdSecurely(
  userId: string,
  jobId: number,
  newReplicateId: string,
  creditCost: number
): Promise<CreditOperationResult> {
  try {
    const { data, error } = await supabase
      .rpc('upgrade_to_img2img_atomic', {
        p_user_id: userId,
        p_job_id: jobId,
        p_new_replicate_id: newReplicateId,
        p_credit_cost: creditCost
      });

    if (error) {
      return {
        success: false,
        newBalance: 0,
        error: error.message
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        newBalance: 0,
        error: 'No result returned from HD upgrade'
      };
    }

    const result = data[0];
    return {
      success: result.success,
      newBalance: result.new_balance,
      error: result.success ? undefined : result.error_message
    };

  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Refund credits for failed generations.
 */
export async function refundCreditsSecurely(
  userId: string,
  jobId: number,
  refundAmount: number,
  reason: string
): Promise<CreditOperationResult> {
  try {
    const { data, error } = await supabase
      .rpc('refund_credits', {
        p_user_id: userId,
        p_job_id: jobId,
        p_refund_amount: refundAmount,
        p_reason: reason
      });

    if (error) {
      return {
        success: false,
        newBalance: 0,
        error: error.message
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        newBalance: 0,
        error: 'No result returned from refund'
      };
    }

    const result = data[0];
    return {
      success: result.success,
      newBalance: result.new_balance,
      error: result.success ? undefined : 'Refund failed'
    };

  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch user credit information.
 */
export async function getUserCredits(userId: string): Promise<UserCreditsInfo | null> {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits, total_earned, total_spent, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found; return null
        return null;
      }
      throw error;
    }

    return data;

  } catch (error) {
    logDatabaseError('getUserCredits', error, { userId });
    return null;
  }
}

/**
 * Initialize user credits (invoked on signup).
 */
export async function initializeUserCredits(userId: string): Promise<CreditOperationResult> {
  try {
    // Create user credit record
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .insert({
        user_id: userId,
        credits: CREDIT_REWARDS.signup_bonus,
        total_earned: CREDIT_REWARDS.signup_bonus,
        total_spent: 0
      })
      .select('credits')
      .single();

    if (creditsError) {
      return {
        success: false,
        newBalance: 0,
        error: creditsError.message
      };
    }

    // Record the signup bonus transaction
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        action: TRANSACTION_ACTIONS.SIGNUP_BONUS,
        amount: CREDIT_REWARDS.signup_bonus,
        balance_after: CREDIT_REWARDS.signup_bonus,
        metadata: { reason: 'New user signup bonus' }
      })
      .select('id')
      .single();

    if (transactionError) {
      logDatabaseError('recordSignupBonusTransaction', transactionError, { userId });
    }

    return {
      success: true,
      newBalance: creditsData.credits,
      transactionId: transactionData?.id
    };

  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Top up credits daily to a minimum after UTC midnight (first trigger only).
 */
export async function ensureDailyTopup(userId: string, minimum: number = 5): Promise<{ credited: number; newBalance: number; success: boolean; error?: string; }> {
  try {
    const { data, error } = await supabase
      .rpc('daily_topup_to_minimum', {
        p_user_id: userId,
        p_minimum: minimum
      });

    if (error) {
      return { credited: 0, newBalance: 0, success: false, error: error.message };
    }

    const result = (data && data[0]) || { new_balance: 0, credited: 0, success: true };
    return { credited: result.credited || 0, newBalance: result.new_balance || 0, success: !!result.success };

  } catch (e) {
    return { credited: 0, newBalance: 0, success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Fetch user credit transaction history.
 */
export async function getUserTransactions(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<CreditTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('id, user_id, job_id, action, amount, balance_after, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];

  } catch (error) {
    logDatabaseError('getUserTransactions', error, { userId });
    return [];
  }
}

/**
 * Update a job with its Replicate ID (backfill real ID).
 */
export async function updateJobReplicateId(
  jobId: number,
  replicateId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('generation_jobs')
      .update({
        replicate_id: replicateId,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      logDatabaseError('updateJobReplicateId', error, { metadata: { jobId, replicateId } });
      return false;
    }

    return true;

  } catch (error) {
    logDatabaseError('updateJobReplicateId', error, { metadata: { jobId, replicateId } });
    return false;
  }
}
