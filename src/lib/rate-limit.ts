import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import RedisClient from "ioredis";

interface LimiterLike {
  limit(key: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;
}

const limitersByPrefix = new Map<string, LimiterLike>();
let redisClient: Redis | null = null;
let redisTcpClient: RedisClient | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

function getRedisTcp(): RedisClient | null {
  if (redisTcpClient) return redisTcpClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redisTcpClient = new RedisClient(url, { lazyConnect: false, maxRetriesPerRequest: 2 });
  redisTcpClient.on("error", (err: Error) => {
    console.error(`[rate-limit] Redis connection error: ${err.message}`);
  });
  return redisTcpClient;
}

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local identifier = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, identifier .. ':' .. now .. ':' .. math.random(1e9))
  redis.call('PEXPIRE', key, window)
  return {1, limit - count - 1, now + window}
end
redis.call('PEXPIRE', key, window)
return {0, 0, now + window}
`;

class IoredisLimiter implements LimiterLike {
  constructor(private prefix: string, private limitCount: number, private windowMs: number) {}
  async limit(key: string) {
    const client = getRedisTcp();
    if (!client) {
      throw new Error("Redis unavailable");
    }
    const name = `cobentt:ratelimit:${this.prefix}`;
    const raw = (await client.eval(
      SLIDING_WINDOW_LUA,
      1,
      `${name}:${key}`,
      Date.now(),
      this.windowMs,
      this.limitCount,
      key
    )) as [number, number, number];
    return {
      success: raw[0] === 1,
      limit: this.limitCount,
      remaining: Math.max(0, raw[1]),
      reset: raw[2],
    };
  }
}

function getOrCreateLimiter(prefix: string, limit: number, windowMs: number): LimiterLike | null {
  const cacheKey = `${prefix}:${limit}:${windowMs}`;
  const cached = limitersByPrefix.get(cacheKey);
  if (cached) return cached;
  let instance: LimiterLike | null = null;
  const restRedis = getRedis();
  if (restRedis) {
    instance = new Ratelimit({
      redis: restRedis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs / 1000} s`),
      analytics: true,
      prefix: `cobentt:ratelimit:${prefix}`,
    });
  } else if (process.env.REDIS_URL) {
    instance = new IoredisLimiter(prefix, limit, windowMs);
  }
  if (!instance) return null;
  limitersByPrefix.set(cacheKey, instance);
  return instance;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ---------------------------------------------------------------------------
// In-memory fallback (single-instance only).
// Used when Upstash Redis is not configured and the caller did not request
// fail-closed. Previously this path returned success unconditionally, leaving
// every endpoint unthrottled. Fixed-window per key with a bounded map.
// Multi-instance deployments should still configure Upstash for shared limits.
// ---------------------------------------------------------------------------
const MEM_MAX_KEYS = 5000;
const memBuckets = new Map<string, { count: number; reset: number }>();

function checkMemoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = memBuckets.get(key);
  if (!bucket || bucket.reset <= now) {
    if (memBuckets.size >= MEM_MAX_KEYS) {
      // Evict expired buckets first; if still full, drop oldest.
      for (const [k, v] of memBuckets) {
        if (v.reset <= now) memBuckets.delete(k);
        if (memBuckets.size < MEM_MAX_KEYS) break;
      }
      if (memBuckets.size >= MEM_MAX_KEYS) {
        const oldest = memBuckets.keys().next();
        if (!oldest.done) memBuckets.delete(oldest.value);
      }
    }
    const reset = now + windowMs;
    memBuckets.set(key, { count: 1, reset });
    return { success: true, limit, remaining: limit - 1, reset };
  }
  if (bucket.count >= limit) {
    return { success: false, limit, remaining: 0, reset: bucket.reset };
  }
  bucket.count += 1;
  return { success: true, limit, remaining: limit - bucket.count, reset: bucket.reset };
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
  // Opt-in single-instance escape hatch for local dev without Redis.
  // Production must leave this unset so spend paths stay fail-closed.
  const allowMemoryFallback = process.env.ALLOW_MEMORY_RATELIMIT === "true";
  const hasRedis = Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
      process.env.REDIS_URL
  );
  if (!hasRedis) {
    if (opts?.failClosed && !allowMemoryFallback) {
      console.error(`[rate-limit] Redis not configured — rejecting ${key} (fail-closed)`);
      return denied;
    }
    if (opts?.failClosed) {
      console.warn(`[rate-limit] Redis not configured — enforcing in-memory limits for ${key} (ALLOW_MEMORY_RATELIMIT=true, single-instance only)`);
    }
    // No Redis: enforce single-instance in-memory limits instead of
    // disabling throttling entirely.
    return checkMemoryLimit(key, limit, windowMs);
  }

  const prefix = key.split(":")[0];

  const limiter = getOrCreateLimiter(prefix, limit, windowMs);
  if (!limiter) {
    if (opts?.failClosed && !allowMemoryFallback) {
      console.error(`[rate-limit] Limiter unavailable — rejecting ${key} (fail-closed)`);
      return denied;
    }
    return checkMemoryLimit(key, limit, windowMs);
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
