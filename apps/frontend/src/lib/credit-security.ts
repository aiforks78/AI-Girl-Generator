/**
 * 🎀 Girl Generator - Credit System Security Validation
 *
 * Features:
 * - Credit operation verification
 * - Anomaly detection
 * - Abuse prevention
 * - Security audit logging
 *
 * ⚠️ Server-side only - contains sensitive SERVICE_ROLE_KEY
 */

import 'server-only';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkUserRateLimit, getClientInfo } from './rate-limiter';
import { CREDIT_COSTS, DAILY_LIMITS } from './credit-config';

type CreditTransaction = {
  action: string;
  created_at: string;
  metadata?: {
    ip_address?: string | null;
  } | null;
};

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Security check response
export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresVerification?: boolean;
}

// Anomaly types
export type AnomalyType = 
  | 'rapid_checkin'
  | 'excessive_generation'
  | 'suspicious_ip'
  | 'unusual_pattern'
  | 'credit_manipulation';

// User behavior pattern
interface UserBehaviorPattern {
  userId: string;
  checkinFrequency: number;
  generationFrequency: number;
  averageSessionDuration: number;
  ipAddresses: string[];
  userAgents: string[];
  lastActivity: Date;
}

// Check user daily limits
export async function checkDailyLimits(
  userId: string,
  action: 'checkin' | 'generation'
): Promise<SecurityCheckResult> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: dailyLimit, error } = await supabase
      .from('user_daily_limits')
      .select('checkin_count, generation_count')
      .eq('user_id', userId)
      .eq('action_date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      return {
        allowed: false,
        reason: 'Failed to check daily limits',
        riskLevel: 'medium'
      };
    }

    const currentCheckinCount = dailyLimit?.checkin_count || 0;

    switch (action) {
      case 'checkin':
        if (currentCheckinCount >= DAILY_LIMITS.checkin_max) {
          return {
            allowed: false,
            reason: `Daily check-in limit exceeded (${DAILY_LIMITS.checkin_max}/day)`,
            riskLevel: 'low'
          };
        }
        break;

      case 'generation':
        // Daily generation limit disabled
        break;
    }

    return {
      allowed: true,
      riskLevel: 'low'
    };

  } catch (error) {
    console.error('Daily limits check failed:', error);
    return {
      allowed: false,
      reason: 'Security check failed',
      riskLevel: 'high'
    };
  }
}

// Validate credit balance
export async function checkCreditBalance(
  userId: string,
  requiredCredits: number
): Promise<SecurityCheckResult> {
  try {
    const { data: userCredits, error } = await supabase
      .from('user_credits')
      .select('credits, total_earned, total_spent')
      .eq('user_id', userId)
      .single();

    if (error) {
      return {
        allowed: false,
        reason: 'Failed to verify credit balance',
        riskLevel: 'high'
      };
    }

    // Ensure sufficient balance
    if (userCredits.credits < requiredCredits) {
      return {
        allowed: false,
        reason: `Insufficient credits (required: ${requiredCredits}, available: ${userCredits.credits})`,
        riskLevel: 'low'
      };
    }

    // Detect unusual credit patterns
    const totalTransactions = userCredits.total_earned + userCredits.total_spent;
    if (totalTransactions > 10000) {
      return {
        allowed: true,
        reason: 'High-volume user detected',
        riskLevel: 'medium',
        requiresVerification: true
      };
    }

    return {
      allowed: true,
      riskLevel: 'low'
    };

  } catch (error) {
    console.error('Credit balance check failed:', error);
    return {
      allowed: false,
      reason: 'Security check failed',
      riskLevel: 'high'
    };
  }
}

// Detect anomalous activity
export async function detectAnomalousActivity(
  userId: string,
  request: NextRequest
): Promise<SecurityCheckResult> {
  try {
    const clientInfo = getClientInfo(request);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Verify activity within the last hour
    const { data: recentTransactions, error } = await supabase
      .from('credit_transactions')
      .select('action, created_at, metadata')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch recent transactions:', error);
      return {
        allowed: true,
        riskLevel: 'low'
      };
    }

    const transactions: CreditTransaction[] = (recentTransactions || []) as CreditTransaction[];

    // Detect rapid consecutive check-ins
    const checkinTransactions = transactions.filter((tx) => tx.action === 'daily_checkin');
    if (checkinTransactions.length > 2) {
      return {
        allowed: false,
        reason: 'Rapid check-in attempts detected',
        riskLevel: 'high'
      };
    }

    // Detect abnormal generation frequency
    const generationTransactions = transactions.filter((tx) =>
      tx.action === 'txt2img' || tx.action === 'img2img'
    );
    // Allow higher generation frequency; custom anomaly threshold (30/h)
    if (generationTransactions.length > 30) {
      return {
        allowed: false,
        reason: 'Excessive generation activity detected',
        riskLevel: 'high'
      };
    }

    // Detect IP address changes
    const ipAddresses = transactions
      .map((tx) => tx.metadata?.ip_address || null)
      .filter((ip): ip is string => Boolean(ip && ip !== clientInfo.ip));
    
    if (ipAddresses.length > 3) {
      return {
        allowed: true,
        reason: 'Multiple IP addresses detected',
        riskLevel: 'medium',
        requiresVerification: true
      };
    }

    return {
      allowed: true,
      riskLevel: 'low'
    };

  } catch (error) {
    console.error('Anomaly detection failed:', error);
    return {
      allowed: true,
      riskLevel: 'low'
    };
  }
}

// Validate check-in interval (prevent timing attacks)
export async function validateCheckinInterval(userId: string): Promise<SecurityCheckResult> {
  try {
    // Input validation
    if (!userId || typeof userId !== 'string') {
      return {
        allowed: false,
        reason: 'Invalid user ID',
        riskLevel: 'high'
      };
    }

    const { data: lastCheckin, error } = await supabase
      .from('credit_transactions')
      .select('created_at')
      .eq('user_id', userId)
      .eq('action', 'daily_checkin')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to check last checkin:', error);
      // Default to safe mode on errors; allow action but mark medium risk
      return {
        allowed: true,
        riskLevel: 'medium'
      };
    }

    if (lastCheckin) {
      const lastCheckinTime = new Date(lastCheckin.created_at);
      const now = new Date();

      // Prevent timing attacks: compare with fixed precision
      const timeDiff = Math.floor((now.getTime() - lastCheckinTime.getTime()) / 1000); // second precision
      const hoursDiff = timeDiff / 3600;

      // Ensure a 4-hour interval with small random jitter to prevent precise timing attacks
      const requiredInterval = DAILY_LIMITS.checkin_interval + (Math.random() * 0.1 - 0.05); // ±3 minute jitter

      if (hoursDiff < requiredInterval) {
        const remainingTime = requiredInterval - hoursDiff;
        return {
          allowed: false,
          reason: `Check-in too soon. Please wait ${Math.ceil(remainingTime * 60)} more minutes.`,
          riskLevel: 'low'
        };
      }
    }

    return {
      allowed: true,
      riskLevel: 'low'
    };

  } catch (error) {
    console.error('Checkin interval validation failed:', error);
    // Default to safe mode on errors
    return {
      allowed: false,
      reason: 'Security validation failed',
      riskLevel: 'high'
    };
  }
}

// Comprehensive security check
export async function performSecurityCheck(
  userId: string,
  action: 'checkin' | 'generation',
  request: NextRequest,
  requiredCredits: number = 0
): Promise<SecurityCheckResult> {
  try {
    // 1. Check rate limits
    const rateLimitResult = await checkUserRateLimit(userId, action === 'checkin' ? 'checkin' : 'generation', request);
    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        reason: rateLimitResult.reason || 'Rate limit exceeded',
        riskLevel: 'medium'
      };
    }

    // 2. Check daily limits
    const dailyLimitResult = await checkDailyLimits(userId, action);
    if (!dailyLimitResult.allowed) {
      return dailyLimitResult;
    }

    // 3. Check credit balance (if needed)
    if (requiredCredits > 0) {
      const creditResult = await checkCreditBalance(userId, requiredCredits);
      if (!creditResult.allowed) {
        return creditResult;
      }
    }

    // 4. Check check-in interval (check-in only)
    if (action === 'checkin') {
      const intervalResult = await validateCheckinInterval(userId);
      if (!intervalResult.allowed) {
        return intervalResult;
      }
    }

    // 5. Detect anomalous behavior
    const anomalyResult = await detectAnomalousActivity(userId, request);
    if (!anomalyResult.allowed) {
      return anomalyResult;
    }

    // All checks passed
    return {
      allowed: true,
      riskLevel: anomalyResult.riskLevel,
      requiresVerification: anomalyResult.requiresVerification
    };

  } catch (error) {
    console.error('Security check failed:', error);
    return {
      allowed: false,
      reason: 'Security verification failed',
      riskLevel: 'high'
    };
  }
}

// Record security event
export async function logSecurityEvent(
  userId: string,
  eventType: AnomalyType,
  details: any,
  request: NextRequest
) {
  try {
    const clientInfo = getClientInfo(request);
    
    console.warn('Security event detected:', {
      userId,
      eventType,
      details,
      clientInfo,
      timestamp: new Date().toISOString()
    });

    // Additional security responses can be added:
    // - Send alert notifications
    // - Persist to a security log database
    // - Trigger automated security responses

  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}
