import { z } from "zod";

/**
 * Environment variable validation.
 *
 * Validates required variables at startup and provides typed access.
 * Add variables here as they are needed — this prevents runtime crashes
 * from missing env vars and documents the full set of required configuration.
 */

const serverSchema = z.object({
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid PostgreSQL connection string" }),
  DIRECT_URL: z.string().url({ message: "DIRECT_URL must be a valid PostgreSQL connection string" }).optional(),
  CLERK_SECRET_KEY: z.string().min(1, { message: "CLERK_SECRET_KEY is required" }),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  // Required: BYOK ciphertexts are unreadable without it. Fail at boot
  // (via src/instrumentation.ts) instead of 500ing every api-keys request.
  // Generate: openssl rand -hex 32. Never rotate while keys are stored.
  API_KEY_ENCRYPTION_SECRET: z.string().min(1, { message: "API_KEY_ENCRYPTION_SECRET is required (openssl rand -hex 32)" }),
  BYOK_ALLOW_SERVER_FALLBACK: z.string().optional(),
  E2B_API_KEY: z.string().min(1).optional(),
  INNGEST_EVENT_KEY: z.string().min(1, { message: "INNGEST_EVENT_KEY is required" }),
  INNGEST_SIGNING_KEY: z.string().min(1, { message: "INNGEST_SIGNING_KEY is required" }),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  ETHERSCAN_API_KEY: z.string().optional(),
  ARBISCAN_API_KEY: z.string().optional(),
  POLYGONSCAN_API_KEY: z.string().optional(),
  OPTIMISTIC_ETHERSCAN_API_KEY: z.string().optional(),
  INTERNAL_API_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  PAYMENT_SUCCESS_URL: z.string().url().optional(),
  PAYMENT_CANCEL_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().optional(),
});

let _serverEnv: z.infer<typeof serverSchema> | null = null;
let _clientEnv: z.infer<typeof clientSchema> | null = null;

/**
 * Get validated server environment variables.
 * Throws on first call if required variables are missing.
 */
export function getServerEnv(): z.infer<typeof serverSchema> {
  if (_serverEnv) return _serverEnv;

  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    const missing = Object.entries(formatted)
      .filter(([, v]) => v && "_errors" in v && v._errors.length > 0)
      .map(([key, v]) => `  ${key}: ${(v as { _errors: string[] })._errors.join(", ")}`)
      .join("\n");
    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }
  _serverEnv = result.data;
  return _serverEnv;
}

/**
 * Get validated client environment variables.
 * Throws on first call if required variables are missing.
 */
export function getClientEnv(): z.infer<typeof clientSchema> {
  if (_clientEnv) return _clientEnv;

  const result = clientSchema.safeParse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  });
  if (!result.success) {
    const formatted = result.error.format();
    const missing = Object.entries(formatted)
      .filter(([, v]) => v && "_errors" in v && v._errors.length > 0)
      .map(([key, v]) => `  ${key}: ${(v as { _errors: string[] })._errors.join(", ")}`)
      .join("\n");
    throw new Error(`Missing or invalid client environment variables:\n${missing}`);
  }
  _clientEnv = result.data;
  return _clientEnv;
}

/**
 * Production safety checks. Call after getServerEnv() in instrumentation.
 *
 * The most common "works locally, 500s in production" causes:
 *  1. Clerk DEVELOPMENT keys (pk_test_/sk_test_) deployed to prod — Clerk
 *     rejects/produces auth failures on the production domain.
 *  2. NEXT_PUBLIC_APP_URL still pointing at localhost — breaks OAuth
 *     redirects, OpenRouter referer headers, and absolute URL building.
 * Throws with an actionable message so the deploy fails fast with ONE clear
 * error instead of scattered runtime 500s.
 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  const problems: string[] = [];
  const pub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secret = process.env.CLERK_SECRET_KEY ?? "";
  if (pub.startsWith("pk_test_")) {
    problems.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is a DEVELOPMENT key (pk_test_). Create a production Clerk instance and set its pk_live_ key.");
  }
  if (secret.startsWith("sk_test_")) {
    problems.push("CLERK_SECRET_KEY is a DEVELOPMENT key (sk_test_). Set the production instance's sk_live_ key.");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl) {
    problems.push("NEXT_PUBLIC_APP_URL is not set. Set it to the production origin (e.g. https://cobentt.com).");
  } else if (/localhost|127\.0\.0\.1/.test(appUrl)) {
    problems.push(`NEXT_PUBLIC_APP_URL points at localhost (${appUrl}). Set it to the production origin.`);
  }
  if (process.env.BYOK_ALLOW_SERVER_FALLBACK === "true") {
    problems.push("BYOK_ALLOW_SERVER_FALLBACK=true in production — every keyless user spends the SERVER AI key. Set it to false.");
  }
  if (problems.length > 0) {
    throw new Error(`Production environment misconfigured:\n  - ${problems.join("\n  - ")}`);
  }
}

/**
 * Helper to get a required server env var or throw.
 */
export function requireServerEnv(key: keyof z.infer<typeof serverSchema>): string {
  const env = getServerEnv();
  const value = env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}
