/**
 * Signs and sends a server-to-server call to the site's wallet API, exactly like the Rust gateway does.
 *   INTERNAL_API_SECRET=... SITE_URL=http://localhost:3000 npx tsx scripts/payments/internal-call.ts reserve '{"userId":"user_x","requestId":"req_00000001","model":"gpt-4o-mini","promptTokens":100,"maxOutputTokens":500}'
 * Use `--bad-sig` to confirm that a wrong signature is rejected.
 */
import { signInternal } from "../../src/lib/internal-auth";

async function main() {
  const [, , path, json, flag] = process.argv;
  const secret = process.env.INTERNAL_API_SECRET ?? "";
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (!path || !json || secret.length < 32) {
    console.error("usage: INTERNAL_API_SECRET=<>=32 chars> [SITE_URL=...] tsx scripts/payments/internal-call.ts <reserve|settle|status> '<json>' [--bad-sig]");
    process.exit(2);
  }
  const ts = String(Date.now());
  const sig = flag === "--bad-sig" ? "0".repeat(64) : signInternal(secret, ts, json);
  const res = await fetch(`${base}/api/internal/wallet/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-cobentt-timestamp": ts, "x-cobentt-signature": sig },
    body: json,
  });
  console.log(res.status, await res.text());
}
void main();
