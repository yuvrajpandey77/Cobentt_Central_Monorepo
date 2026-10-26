import prisma from "@/lib/db";

/**
 * Safety check before serving hosted AI. Every unspent user balance is a liability we must be able to honour at the
 * provider, so the OpenRouter credit left must cover all liabilities plus a buffer. Fails closed: if the balance cannot
 * be read recently, hosted AI is refused rather than run unfunded.
 */
const CHECK_TTL_MS = 60_000;
const MAX_STALE_MS = 10 * 60_000;
const BUFFER_MICRO_USD = Number(process.env.TREASURY_BUFFER_USD ?? 5) * 1_000_000;

let last: { at: number; ok: boolean } | null = null;

export async function providerRemainingMicroUSD(fetchFn: typeof fetch = fetch): Promise<number | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetchFn("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { total_credits?: unknown; total_usage?: unknown } };
    const credits = Number(body.data?.total_credits);
    const used = Number(body.data?.total_usage);
    if (!Number.isFinite(credits) || !Number.isFinite(used)) return null;
    return Math.round((credits - used) * 1_000_000);
  } catch {
    return null;
  }
}

export async function userLiabilityMicroUSD(now = new Date()): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ total: bigint | null }>>`
    SELECT COALESCE(SUM(CASE WHEN "planExpiresAt" > ${now} THEN "planST" ELSE 0 END), 0)
         + COALESCE(SUM(CASE WHEN "paygExpiresAt" > ${now} THEN "paygST" ELSE 0 END), 0) AS total
    FROM token_wallets`;
  return Number(rows[0]?.total ?? 0);
}

type BalanceReader = () => Promise<number | null>;
let readBalance: BalanceReader = () => providerRemainingMicroUSD();

/** Tests only: replaces the OpenRouter balance read. Pass null to restore the live reader. */
export function setProviderBalanceReader(fn: BalanceReader | null): void {
  readBalance = fn ?? (() => providerRemainingMicroUSD());
  last = null;
}

export async function treasuryCovers(now = Date.now()): Promise<boolean> {
  if (last && now - last.at < CHECK_TTL_MS) return last.ok;
  const remaining = await readBalance();
  if (remaining === null) return Boolean(last && now - last.at < MAX_STALE_MS && last.ok);
  const liability = await userLiabilityMicroUSD(new Date(now));
  const ok = remaining - liability >= BUFFER_MICRO_USD;
  last = { at: now, ok };
  return ok;
}

