interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const referenceCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 60_000; // 60 seconds

/**
 * Lightweight in-memory TTL cache with in-flight request deduplication
 * for admin reference data (categories, themes, delivery zones) so switching
 * admin sections avoids redundant network waterfalls.
 */
export async function fetchCachedAdminReference<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = referenceCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      referenceCache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, promise);
  return promise;
}

export function invalidateAdminReferenceCache(key?: string): void {
  if (key) {
    referenceCache.delete(key);
  } else {
    referenceCache.clear();
  }
}
