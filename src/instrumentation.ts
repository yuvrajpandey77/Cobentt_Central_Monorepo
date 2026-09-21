/**
 * Runs once when the Next.js server boots (dev + production).
 * Validates server environment fail-fast so a missing secret/config shows
 * up as ONE clear boot error instead of scattered runtime 500s.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv, assertProductionEnv } = await import("@/lib/env");
    try {
      getServerEnv();
      assertProductionEnv();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // In production, throwing here kills the serverless instance and the
      // platform serves HTML 500s for EVERY route (tRPC, RSC, API). Log loud
      // instead and let /api/health report unhealthy + routes return JSON
      // 503s with actionable codes. Fail the deploy in dev where it's seen.
      if (process.env.NODE_ENV === "production") {
        console.error("[boot] FATAL environment misconfiguration (continuing degraded):\n" + message);
      } else {
        console.error(
          "[boot] Environment validation failed — fix .env / .env.local and restart:\n" + message
        );
        throw err;
      }
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.warn(
        "[boot] UPSTASH_REDIS_REST_URL/TOKEN not set — using single-instance in-memory rate limits. " +
          "Money/spend paths run fail-closed. Set Upstash for shared limits across instances."
      );
    }
    if (process.env.BYOK_ALLOW_SERVER_FALLBACK === "true") {
      console.warn(
        "[boot] BYOK_ALLOW_SERVER_FALLBACK=true — keyless users spend the SERVER AI key. Dev-only; never enable in production."
      );
    }
  }
}
