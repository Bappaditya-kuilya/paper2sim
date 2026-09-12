const cache = new Map<string, { data: unknown; expiry: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiry) { cache.delete(key); return null; }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs = 60000) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function clearCache() { cache.clear(); }
