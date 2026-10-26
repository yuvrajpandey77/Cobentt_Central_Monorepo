import { createHash } from "crypto";

/** Header a client sends with every mutating request. The same key is reused on retries of that one action. */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

const KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export type StoredKey = { requestHash: string; status: number | null; responseBody: string | null };

export type Decision =
  | { action: "run" }
  | { action: "replay"; status: number; body: string }
  | { action: "conflict" }
  | { action: "in_progress" };

/** What a request with this key should do, given the row already stored for it (if any). */
export function decide(stored: StoredKey | null, requestHash: string): Decision {
  if (!stored) return { action: "run" };
  if (stored.requestHash !== requestHash) return { action: "conflict" };
  if (stored.status === null || stored.responseBody === null) return { action: "in_progress" };
  return { action: "replay", status: stored.status, body: stored.responseBody };
}

export function hashBody(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Null when the header is missing or not a well-formed key. */
export function parseKey(value: string | null): string | null {
  if (!value || !KEY_PATTERN.test(value)) return null;
  return value;
}
