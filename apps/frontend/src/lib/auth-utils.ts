import 'server-only';
import { NextRequest } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { getServerAuth } from "@/lib/server-auth";

/**
 * 🔐 Girl Generator secure authentication helpers
 *
 * Addresses trust-boundary concerns:
 * - Derives user identity from the NextAuth session
 * - Rejects any client-provided user_id as a source of truth
 * - MVP: relies on the service_role key plus strict userId filtering (no RLS yet)
 *
 * ⚠️ Server-side only — contains the sensitive SERVICE_ROLE_KEY
*/
// Server-side Supabase client (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Retrieve the authenticated user ID from the NextAuth session
 */
export async function getAuthenticatedUserId(_request: NextRequest): Promise<string | null> {
  try {
    const auth = await getServerAuth();
    return auth.user?.id ?? null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Safely deduct credits using atomic operations to avoid concurrency issues
 */
export async function deductCreditsAtomically(
  userId: string, 
  amount: number
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    // Use an atomic UPDATE to avoid concurrency conflicts
    // Supabase does not support raw SQL expressions here, so we rely on RPC
    const { data, error } = await supabaseAdmin
      .rpc('deduct_credits_atomic', {
        p_user_id: userId,
        p_amount: amount
      });

    if (error) {
      console.error('Credit deduction error:', error);
      return { success: false, newBalance: 0, error: error.message || 'Database error' };
    }

    if (!data || data.length === 0) {
      return { success: false, newBalance: 0, error: 'Insufficient credits' };
    }

    return { success: true, newBalance: data[0].new_balance };

  } catch (error) {
    console.error('Credit deduction error:', error);
    return { success: false, newBalance: 0, error: 'Database error' };
  }
}

/**
 * Record a credit transaction ledger entry
 */
export async function recordCreditTransaction(
  userId: string,
  jobId: number,
  action: string,
  amount: number,
  balanceAfter: number,
  metadata?: any
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        job_id: jobId,
        action: action,
        amount: amount,
        balance_after: balanceAfter,
        metadata: metadata || {}
      });

    if (error) {
      console.error('Transaction record error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Transaction record error:', error);
    return false;
  }
}

/**
 * Future placeholder for per-user Supabase client with RLS
 */
// getUserSupabaseClient has been removed: no RLS session spoofing

/**
 * Validate user access based on the authenticated session
 */
export async function validateUserAccess(
  request: NextRequest,
  requiredUserId?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const userId = await getAuthenticatedUserId(request);
  
  if (!userId) {
    return { success: false, error: 'Authentication required' };
  }

  if (requiredUserId && userId !== requiredUserId) {
    return { success: false, error: 'Access denied' };
  }

  return { success: true, userId };
}

// Note: generation job helpers now live in src/lib/credit-service.ts
// Use createGenerationJobSecurely from credit-service.ts instead

// Note: HD upgrade helpers now live in src/lib/credit-service.ts
// Use upgradeToHdSecurely from credit-service.ts instead

/**
 * Refund credits for failure scenarios
 */
export async function refundCredits(
  userId: string,
  jobId: number,
  refundAmount: number,
  reason: string
): Promise<{ success: boolean; newBalance?: number }> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('refund_credits', {
        p_user_id: userId,
        p_job_id: jobId,
        p_refund_amount: refundAmount,
        p_reason: reason
      });

    if (error) {
      console.error('Refund error:', error);
      return { success: false };
    }

    if (!data || data.length === 0 || !data[0].success) {
      return { success: false };
    }

    return {
      success: true,
      newBalance: data[0].new_balance
    };

  } catch (error) {
    console.error('Refund error:', error);
    return { success: false };
  }
}
