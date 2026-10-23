import crypto from "crypto";

/** Server-to-server calls (the Rust API → this site) are signed: HMAC-SHA256 over `${timestamp}.${rawBody}`. */
export function signInternal(secret: string, timestamp: string, rawBody: string): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export const INTERNAL_MAX_SKEW_MS = 60_000;

export function verifyInternal(opts: { secret: string | undefined; timestamp: string | null; signature: string | null; rawBody: string; nowMs?: number }): boolean {
  const { secret, timestamp, signature, rawBody } = opts;
  if (!secret || secret.length < 32 || !timestamp || !signature) return false;
  const t = Number(timestamp);
  const now = opts.nowMs ?? Date.now();
  if (!Number.isFinite(t) || Math.abs(now - t) > INTERNAL_MAX_SKEW_MS) return false;
  const expected = signInternal(secret, timestamp, rawBody);
  if (!/^[0-9a-f]+$/i.test(signature) || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
