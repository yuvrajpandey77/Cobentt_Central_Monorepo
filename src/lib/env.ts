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
