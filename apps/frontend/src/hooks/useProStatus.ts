import { useState, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { apiFetch } from '@/lib/api-client';
import type { ProStatus } from '@/types/generation';

const PRO_STATUS_CACHE_KEY = 'gg:pro_status_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedProStatus {
  isPro: boolean;
  timestamp: number;
  userId: string;
}

function getCachedProStatus(userId: string): boolean | null {
  try {
    const cached = localStorage.getItem(PRO_STATUS_CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedProStatus = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is valid and for the same user
    if (data.userId === userId && now - data.timestamp < CACHE_DURATION) {
      return data.isPro;
    }
    
    // Clear stale cache
    localStorage.removeItem(PRO_STATUS_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedProStatus(userId: string, isPro: boolean) {
  try {
    const data: CachedProStatus = {
      isPro,
      timestamp: Date.now(),
      userId
    };
    localStorage.setItem(PRO_STATUS_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage errors
  }
}

export function useProStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProStatus>({ isPro: false, loading: false });

  const checkProStatus = useCallback(async (): Promise<'pro' | 'not-pro' | 'not-logged-in'> => {
    const userId = user?.id;
    
    if (!userId) {
      setStatus({ isPro: false, loading: false });
      return 'not-logged-in';
    }

    // Check cache first
    const cached = getCachedProStatus(userId);
    if (cached !== null) {
      setStatus({ isPro: cached, loading: false });
      return cached ? 'pro' : 'not-pro';
    }

    // Fetch from API
    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await apiFetch('/user/check_pro_status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      const data = await response.json();
      const isPro = Boolean(data?.isPro);
      
      // Update state and cache
      setStatus({ isPro, loading: false });
      setCachedProStatus(userId, isPro);
      
      return isPro ? 'pro' : 'not-pro';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check Pro status';
      setStatus({ isPro: false, loading: false, error: errorMessage });
      return 'not-pro';
    }
  }, [user?.id]);

  const refreshProStatus = useCallback(() => {
    const userId = user?.id;
    if (userId) {
      // Clear cache and refetch
      localStorage.removeItem(PRO_STATUS_CACHE_KEY);
      return checkProStatus();
    }
    return Promise.resolve('not-logged-in' as const);
  }, [user?.id, checkProStatus]);

  return {
    status,
    checkProStatus,
    refreshProStatus,
    isLoading: status.loading,
    isPro: status.isPro,
    hasError: Boolean(status.error)
  };
}
