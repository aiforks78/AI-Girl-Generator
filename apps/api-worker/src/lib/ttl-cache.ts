export interface CacheEntry<V> {
  value: V;
  expires: number;
}

export class TTLCache<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const ttl = typeof ttlMs === "number" && ttlMs > 0 ? ttlMs : this.defaultTtlMs;
    this.store.set(key, { value, expires: Date.now() + ttl });
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  withCache(key: K, resolver: () => Promise<V>, ttlMs?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }
    return resolver().then((value) => {
      this.set(key, value, ttlMs);
      return value;
    });
  }
}

export function now(): number {
  return Date.now();
}

