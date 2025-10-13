/**
 * 🎀 Girl Generator - Rate Limiting & Abuse Protection
 *
 * Features:
 * - IP-level rate limiting
 * - User-level behavior limits
 * - Abuse detection mechanisms
 * - Dynamic limit adjustments
 *
 * ⚠️ Server-only usage - in-memory throttling is for single-instance setups
 */

import 'server-only';
import { NextRequest } from 'next/server';

// Rate limit configuration
export const RATE_LIMITS = {
  // API calls per minute
  api_calls_per_minute: 60,
  
  // Generations per hour
  generations_per_hour: 30,
  
  // Check-ins per day
  checkins_per_day: 3,
  
  // Requests per hour for the same IP
  ip_requests_per_hour: 100,
  
  // Suspicious activity threshold
  suspicious_threshold: 5
} as const;

// Rate limit types
export type RateLimitType = 
  | 'api_call'
  | 'generation' 
  | 'checkin'
  | 'ip_request';

// Rate limit result shape
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  reason?: string;
}

// Extract client information
export function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || '127.0.0.1';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const referer = request.headers.get('referer') || '';
  
  return {
    ip: ip.trim(),
    userAgent,
    referer,
    timestamp: new Date()
  };
}

// Build cache key for limit window
function generateLimitKey(type: RateLimitType, identifier: string, timeWindow: string): string {
  return `rate_limit:${type}:${identifier}:${timeWindow}`;
}

// Derive time window identifier
function getTimeWindow(type: RateLimitType): string {
  const now = new Date();
  
  switch (type) {
    case 'api_call':
      // Per-minute window
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

    case 'generation':
    case 'ip_request':
      // Per-hour window
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

    case 'checkin':
      // Daily window
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    
    default:
      return now.toISOString();
  }
}

// Resolve limit count by type
function getLimit(type: RateLimitType): number {
  switch (type) {
    case 'api_call':
      return RATE_LIMITS.api_calls_per_minute;
    case 'generation':
      return RATE_LIMITS.generations_per_hour;
    case 'checkin':
      return RATE_LIMITS.checkins_per_day;
    case 'ip_request':
      return RATE_LIMITS.ip_requests_per_hour;
    default:
      return 10;
  }
}

// Compute reset time
function getResetTime(type: RateLimitType): Date {
  const now = new Date();
  
  switch (type) {
    case 'api_call':
      // Next minute
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1);

    case 'generation':
    case 'ip_request':
      // Next hour
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);

    case 'checkin':
      // Next day
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    default:
      return new Date(now.getTime() + 60000); // 1 minute later
  }
}

// In-memory cache (simple implementation; prefer Redis in production)
const memoryCache = new Map<string, { count: number; expiry: number }>();

// Cache configuration
const CACHE_CONFIG = {
  maxSize: 10000, // Maximum entries
  cleanupInterval: 60000, // Cleanup interval (1 minute)
  lastCleanup: Date.now()
};

// Remove expired cache entries
function cleanExpiredCache() {
  const now = Date.now();

  // Limit cleanup frequency
  if (now - CACHE_CONFIG.lastCleanup < CACHE_CONFIG.cleanupInterval) {
    return;
  }

  let deletedCount = 0;
  for (const [key, value] of Array.from(memoryCache.entries())) {
    if (value.expiry < now) {
      memoryCache.delete(key);
      deletedCount++;
    }
  }

  // Trim oldest entries when cache grows too large
  if (memoryCache.size > CACHE_CONFIG.maxSize) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].expiry - b[1].expiry);

    const toDelete = entries.slice(0, memoryCache.size - CACHE_CONFIG.maxSize);
    for (const [key] of toDelete) {
      memoryCache.delete(key);
      deletedCount++;
    }
  }

  CACHE_CONFIG.lastCleanup = now;

  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} expired cache entries`);
  }
}

// Check rate limit counter
export async function checkRateLimit(
  type: RateLimitType,
  identifier: string,
  request?: NextRequest
): Promise<RateLimitResult> {
  try {
    // Clean expired cache entries
    cleanExpiredCache();
    
    const timeWindow = getTimeWindow(type);
    const limitKey = generateLimitKey(type, identifier, timeWindow);
    const limit = getLimit(type);
    const resetTime = getResetTime(type);
    
    // Read current count from cache
    const cached = memoryCache.get(limitKey);
    const currentCount = cached?.count || 0;

    // Validate against limit
    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        reason: `Rate limit exceeded for ${type}`
      };
    }
    
    // Increment count
    const newCount = currentCount + 1;
    const expiry = resetTime.getTime();
    
    memoryCache.set(limitKey, {
      count: newCount,
      expiry
    });
    
    // Log suspicious activity
    if (request && newCount > limit * 0.8) {
      await recordSuspiciousActivity(identifier, type, request);
    }
    
    return {
      allowed: true,
      remaining: limit - newCount,
      resetTime
    };
    
  } catch (error) {
    console.error('Rate limit check failed:', error);
    
    // Fail-open on errors but log them
    return {
      allowed: true,
      remaining: 0,
      resetTime: new Date(Date.now() + 60000)
    };
  }
}

// Log suspicious activity details
async function recordSuspiciousActivity(
  identifier: string,
  type: RateLimitType,
  request: NextRequest
) {
  try {
    const clientInfo = getClientInfo(request);
    
    // Optional persistence layer hook
    console.warn('Suspicious activity detected:', {
      identifier,
      type,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      timestamp: clientInfo.timestamp
    });
    
    // Additional safeguards can be added here, e.g.:
    // - Send alert notifications
    // - Temporarily block IPs
    // - Require CAPTCHA challenges
    
  } catch (error) {
    console.error('Failed to record suspicious activity:', error);
  }
}

// Rate limiting per IP
export async function checkIpRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const clientInfo = getClientInfo(request);
  return checkRateLimit('ip_request', clientInfo.ip, request);
}

// Rate limiting per user
export async function checkUserRateLimit(
  userId: string,
  type: RateLimitType,
  request?: NextRequest
): Promise<RateLimitResult> {
  return checkRateLimit(type, userId, request);
}

// Combined rate limit (IP + user)
export async function checkCombinedRateLimit(
  userId: string,
  type: RateLimitType,
  request: NextRequest
): Promise<RateLimitResult> {
  // Evaluate IP limit first
  const ipResult = await checkIpRateLimit(request);
  if (!ipResult.allowed) {
    return ipResult;
  }
  
  // Then evaluate user limit
  const userResult = await checkUserRateLimit(userId, type, request);
  return userResult;
}

// Rate limiting middleware helper
export function withRateLimit(type: RateLimitType) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    userId?: string
  ): Promise<RateLimitResult> {
    if (userId) {
      return checkCombinedRateLimit(userId, type, request);
    } else {
      return checkIpRateLimit(request);
    }
  };
}

// Inspect current rate limit status
export async function getRateLimitStatus(
  type: RateLimitType,
  identifier: string
): Promise<{ current: number; limit: number; resetTime: Date }> {
  const timeWindow = getTimeWindow(type);
  const limitKey = generateLimitKey(type, identifier, timeWindow);
  const limit = getLimit(type);
  const resetTime = getResetTime(type);
  
  const cached = memoryCache.get(limitKey);
  const current = cached?.count || 0;
  
  return {
    current,
    limit,
    resetTime
  };
}
