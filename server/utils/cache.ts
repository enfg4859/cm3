interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function getCacheTtlMs() {
  const parsed = Number(process.env.API_CACHE_TTL_MS ?? '60000');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60000;
}

export async function withCache<T>(key: string, factory: () => Promise<T>) {
  const existing = memoryCache.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (existing && existing.expiresAt > now) {
    return { value: existing.value, cached: true };
  }

  const value = await factory();
  memoryCache.set(key, {
    value,
    expiresAt: now + getCacheTtlMs()
  });

  return { value, cached: false };
}
