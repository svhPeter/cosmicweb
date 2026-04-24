/**
 * In-process TTL cache used by source adapters on the server.
 *
 * Deliberately simple: it reserves keys and timestamps so we can upgrade to
 * a real stale-while-revalidate / KV adapter later without changing callers.
 */
interface CacheEntry<T> {
  value: T;
  storedAt: number;
  ttlMs: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): { value: T; stale: boolean } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    const age = Date.now() - entry.storedAt;
    const stale = age > entry.ttlMs;
    return { value: entry.value, stale };
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, storedAt: Date.now(), ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

/** Singleton keeps the cache alive across route invocations in the same process. */
declare global {
  // eslint-disable-next-line no-var
  var __cosmosMemoryCache: MemoryCache | undefined;
}

export const memoryCache = globalThis.__cosmosMemoryCache ?? new MemoryCache();
if (!globalThis.__cosmosMemoryCache) {
  globalThis.__cosmosMemoryCache = memoryCache;
}
