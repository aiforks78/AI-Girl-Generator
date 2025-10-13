// Lightweight client-side logger to count /generation/status fetches per job and source
export function debugStatusFetch(jobId: number, source: string) {
  if (typeof window === 'undefined') return;
  try {
    // Only log in dev by default
    const isProd = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';
    if (isProd) return;
  } catch {}
  try {
    const g: any = window as any;
    if (!g.__statusFetchCounts) g.__statusFetchCounts = {};
    const key = `${source}:${Number(jobId)}`;
    g.__statusFetchCounts[key] = (g.__statusFetchCounts[key] || 0) + 1;

    // Start a periodic summary logger if not already running
    if (!g.__statusFetchTimer) {
      g.__statusFetchTimer = setInterval(() => {
        try {
          const counts = g.__statusFetchCounts || {};
          const entries = Object.entries(counts as Record<string, number>);
          if (entries.length === 0) return;
          // Log a compact summary and then reset counts for next window
          const summary: Record<string, number> = {};
          for (const [k, v] of entries) summary[k] = v as number;
          // eslint-disable-next-line no-console
          console.info('[DEBUG][status] recent fetch counts (2s)', summary);
          g.__statusFetchCounts = {};
        } catch {}
      }, 2000);
    }
  } catch {}
}
