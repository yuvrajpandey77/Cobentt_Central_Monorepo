import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCacheStats } from "@/lib/cache";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    memory: CheckResult;
    cache: CheckResult;
    configuration: CheckResult;
  };
}

interface CheckResult {
  status: "pass" | "fail" | "warn";
  latencyMs?: number;
  message?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "pass",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      status: "fail",
      latencyMs: Math.round(performance.now() - start),
      message: err instanceof Error ? err.message : "Unknown DB error",
    };
  }
}

function checkMemory(): CheckResult {
  if (typeof process === "undefined") return { status: "pass" };
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const rss = Math.round(mem.rss / 1024 / 1024);

  const percentUsed = (heapUsedMB / heapTotalMB) * 100;

  if (percentUsed > 90) {
    return {
      status: "warn",
      message: `Heap ${heapUsedMB}/${heapTotalMB}MB (${Math.round(percentUsed)}%), RSS ${rss}MB`,
    };
  }

  return {
    status: "pass",
    message: `Heap ${heapUsedMB}/${heapTotalMB}MB, RSS ${rss}MB`,
  };
}

function checkCache(): CheckResult {
  const stats = getCacheStats();
  return {
    status: "pass",
    message: `${stats.size} entries cached`,
  };
}

function checkConfiguration(): CheckResult {
  // Reports misconfiguration WITHOUT leaking secret values — safe to expose.
  // Lets on-call confirm "mass 500s = bad env" from the health endpoint alone.
  try {
    // Dynamic import avoided: keep health dependency-free so it works even
    // when other modules fail to load.
    const required = [
      "DATABASE_URL",
      "CLERK_SECRET_KEY",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "API_KEY_ENCRYPTION_SECRET",
      "INNGEST_EVENT_KEY",
      "INNGEST_SIGNING_KEY",
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      return { status: "fail", message: `Missing env: ${missing.join(", ")}` };
    }
    if (process.env.NODE_ENV === "production") {
      if ((process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").startsWith("pk_test_")) {
        return { status: "fail", message: "Clerk DEVELOPMENT keys (pk_test_) deployed to production" };
      }
      if ((process.env.CLERK_SECRET_KEY ?? "").startsWith("sk_test_")) {
        return { status: "fail", message: "Clerk DEVELOPMENT keys (sk_test_) deployed to production" };
      }
      if (/localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_APP_URL ?? "")) {
        return { status: "fail", message: "NEXT_PUBLIC_APP_URL still points at localhost" };
      }
    }
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return { status: "warn", message: "Upstash Redis not configured — single-instance in-memory rate limits; spend paths run fail-closed" };
    }
    return { status: "pass" };
  } catch (err) {
    return { status: "fail", message: err instanceof Error ? err.message : "Config check failed" };
  }
}

/**
 * GET /api/health
 *
 * Full health check — verifies database, memory, cache, and configuration.
 * Returns 200 if healthy/degraded, 503 if unhealthy.
 */
export async function GET() {
  const timer = performance.now();

  const [db, memory, cacheCheck] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkMemory()),
    Promise.resolve(checkCache()),
  ]);
  const configuration = checkConfiguration();

  const checks = { database: db, memory, cache: cacheCheck, configuration };
  const hasFailure = Object.values(checks).some((c) => c.status === "fail");
  const hasWarning = Object.values(checks).some((c) => c.status === "warn");

  const status = hasFailure ? "unhealthy" : hasWarning ? "degraded" : "healthy";
  const responseStatus = hasFailure ? 503 : 200;

  const body: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime: Math.round(process.uptime()),
    checks,
  };

  logger.info("health check", {
    statusCode: responseStatus,
    durationMs: Math.round(performance.now() - timer),
    status,
  });

  return NextResponse.json(body, {
    status: responseStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
