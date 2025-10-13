const MAX_CACHE_SIZE = 5000;

const encodeCache = new Map<string, string>();

export function cachedEncodeURIComponent(value: string): string {
  if (!value) return "";
  const cached = encodeCache.get(value);
  if (cached !== undefined) {
    return cached;
  }
  const encoded = encodeURIComponent(value);
  encodeCache.set(value, encoded);
  if (encodeCache.size > MAX_CACHE_SIZE) {
    const keys = encodeCache.keys();
    let count = 0;
    while (count < 500 && encodeCache.size > MAX_CACHE_SIZE) {
      const next = keys.next();
      if (next.done) break;
      encodeCache.delete(next.value);
      count += 1;
    }
  }
  return encoded;
}

