import { debugStatusFetch } from '@/lib/debug-status';
import { apiFetch } from '@/lib/api-client';

type CacheEntry<T> = { ts: number; data: T };

const inflight: Record<number, Promise<unknown>> = {};
const cache: Record<number, CacheEntry<unknown>> = {};

/**
 * Dedupe + throttle fetches for /generation/status?job_id=ID
 * - Coalesces concurrent requests for the same jobId
 * - Returns cached result if within minIntervalMs
 * - Never throws; returns null on failure
 */
export async function fetchStatus(jobId: number, source: string, minIntervalMs = 1200): Promise<unknown | null> {
  try { debugStatusFetch(jobId, source); } catch {}

  const now = Date.now();
  const last = cache[jobId];
  if (last && now - last.ts < Math.max(200, minIntervalMs)) {
    return last.data;
  }
  const pending = inflight[jobId];
  if (pending) {
    try { return await pending; } catch { return null; }
  }
  inflight[jobId] = (async () => {
    try {
      const r = await apiFetch(`/generation/status?job_id=${jobId}`, { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      cache[jobId] = { ts: Date.now(), data: j };
      return j;
    } catch {
      return null;
    } finally {
      delete inflight[jobId];
    }
  })();
  try { return await inflight[jobId]; } catch { return null; }
}
