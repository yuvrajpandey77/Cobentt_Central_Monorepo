import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let defaultLimiter: Ratelimit | null = null;
const limitersByPrefix = new Map<string, Ratelimit>();
let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

function getLimiter(): Ratelimit | null {
  if (defaultLimiter) return defaultLimiter;
  const redis = getRedis();
  if (!redis) {
    console.warn("[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not configured, rate limiting disabled");
    return null;
  }
  defaultLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "60 s"),
    analytics: true,
    prefix: "cobentt:ratelimit",
  });
  return defaultLimiter;
}

function getOrCreateLimiter(prefix: string, limit: number, windowMs: number): Ratelimit | null {
  const cacheKey = `${prefix}:${limit}:${windowMs}`;
  const cached = limitersByPrefix.get(cacheKey);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) return null;
  const instance = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs / 1000} s`),
    analytics: true,
    prefix: `cobentt:ratelimit:${prefix}`,
  });
  limitersByPrefix.set(cacheKey, instance);
  return instance;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  key: string,
  opts?: { requests?: number; window?: string; failClosed?: boolean }
): Promise<RateLimitResult> {
  const limit = opts?.requests || 100;
  const windowMs = parseWindow(opts?.window || "60 s");
  // SECURITY: money/spend paths pass `failClosed: true` so a missing/broken
  // Redis rejects instead of silently disabling limits (fail-open).
  const denied: RateLimitResult = {
    success: false,
    limit,
    remaining: 0,
    reset: Date.now() + windowMs,
  };
  const redis = getRedis();
  if (!redis) {
    if (opts?.failClosed) {
      console.error(`[rate-limit] Redis not configured — rejecting ${key} (fail-closed)`);
      return denied;
    }
    return { success: true, limit: 100, remaining: 100, reset: Date.now() + 60_000 };
  }

  const prefix = key.split(":")[0];

  const limiter = getOrCreateLimiter(prefix, limit, windowMs);
  if (!limiter) {
    if (opts?.failClosed) {
      console.error(`[rate-limit] Limiter unavailable — rejecting ${key} (fail-closed)`);
      return denied;
    }
    return { success: true, limit, remaining: limit, reset: Date.now() + windowMs };
  }

  const result = await limiter.limit(key);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h)$/);
  if (!match) return 60000;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  switch (unit) {
    case "s": return n * 1000;
    case "m": return n * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    default: return 60000;
  }
}

export const RATE_LIMITS = {
  auth: { requests: 10, window: "60 s" },
  payment: { requests: 20, window: "60 s" },
  chat: { requests: 30, window: "60 s" },
  project: { requests: 30, window: "60 s" },
  ai: { requests: 15, window: "60 s" },
  admin: { requests: 50, window: "60 s" },
  upload: { requests: 10, window: "60 s" },
  sandbox: { requests: 10, window: "60 s" },
  default: { requests: 100, window: "60 s" },
} as const;

export function getRateLimitConfig(endpoint: string) {
  for (const [key, config] of Object.entries(RATE_LIMITS)) {
    if (endpoint.includes(key)) return config;
  }
  return RATE_LIMITS.default;
}
