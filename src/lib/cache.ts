/**
 * In-memory API response cache with TTL support.
 *
 * For production, replace with Redis-backed cache via @upstash/redis
 * (already installed for rate limiting). This module provides a
 * drop-in interface that works without Redis for development.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Default TTLs per domain (ms) */
export const CACHE_TTL = {
  /** User profile data */
  profile: 5 * 60 * 1000,
  /** Billing / subscription status */
  billing: 2 * 60 * 1000,
  /** AI model metadata (pricing, context windows) */
  aiMetadata: 30 * 60 * 1000,
  /** Platform analytics (admin dashboard) */
  analytics: 60 * 1000,
  /** Settings / audit logs */
  settings: 3 * 60 * 1000,
  /** Health check results */
  health: 30 * 1000,
} as const;

/**
 * Get a cached value or compute and cache it.
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 60_000
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await fn();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * Invalidate one or more cache keys (supports prefix matching).
 */
export function invalidateCache(prefix: string): number {
  let count = 0;
  for (const key of cache.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      cache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Clear all cached entries.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache stats (for health checks / monitoring).
 */
export function getCacheStats(): { size: number; hitRate: string } {
  return {
    size: cache.size,
    hitRate: "N/A (in-memory)",
  };
}

/**
 * Periodic cleanup of expired entries.
 */
export function cleanupCache(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupCache, 5 * 60 * 1000);
}
