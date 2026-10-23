# Payments, plans and metering: how it works and what to do before going live

## Flow (one-time 30-day plans via Razorpay)
1. `/overview/pricing` → button sends **only** `{plan}` to `POST /api/razorpay/create-order`. Price comes from `src/lib/payment-plans.ts` (server).
2. Razorpay Checkout pays the order. The browser then calls `POST /api/payments/confirm` (the old `/api/razorpay/verify-payment` is an alias).
3. `confirm` checks: signed-in user → rate limit → checkout signature → order belongs to the user → asks Razorpay for the payment (amount, currency, captured) → `activateOrder()`.
4. Razorpay's webhook `POST /api/razorpay/webhook` (HMAC-verified) calls the **same** `activateOrder()`. Whichever runs first grants the period; the other is a harmless replay.
5. `activateOrder()` (`src/lib/subscription.ts`): claims the order row atomically (`periodEnd IS NULL`) so a period is granted exactly once; stacks 30 days onto any remaining paid time;
   updates `AllowedUser`; writes `{plan, subscriptionStatus, currentPeriodEnd}` to Clerk public metadata (the mobile app/API read this to unlock Cobentt Cloud).
6. The daily Inngest cron `check-expired-subscriptions` downgrades expired plans and updates Clerk.
7. Refund webhook: a full refund with no other active payment downgrades to FREE.

## Bugs fixed in this pass (all would have hurt real customers)
- **Checkout could not start**: the button posted `{amount,currency,receipt}` but the API requires `{plan}` → every attempt got HTTP 400.
- **Paid but never activated**: the button called `verify-payment`, which marked the order CAPTURED without activating; the webhook then saw "already captured" and skipped activation.
- **Lost webhook retries**: events were marked "processed" before processing; a failure made Razorpay's retry look like a duplicate.
- **Paying users downgraded**: `payment.failed` for any attempt set the user to PAST_DUE and could overwrite a CAPTURED order; `payment.authorized` could overwrite CAPTURED. Both are now guarded.
- **Razorpay blocked by the browser**: CSP did not allow `checkout.razorpay.com` (script/frame/connect) and COOP `same-origin` severed payment popups. Fixed (`next.config.ts`).
- **Price mismatch**: page said `$20/$50`, checkout charged `₹20/₹50`. The page now renders the server price in ₹.
- **False claims** removed: "14-day free trial, no credit card", "Start Free Trial", "Contact Sales" on a paying button; the Free button no longer opens payment (it left a stuck spinner).
- Renewal reset the period to now+30 and discarded unused days; now stacks.
- Internal error text is no longer returned to the browser.

## Before real money (you must do these)
- [ ] **Set real prices**: `PLAN_PRO_PAISE`, `PLAN_TEAMS_PAISE` (integers, paise, min 100). Defaults are ₹20 / ₹50 which look like test values.
- [ ] Live keys: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET` (same Clerk instance as the app: confirmed).
- [ ] Razorpay Dashboard → Webhooks → URL `https://<site>/api/razorpay/webhook`, active events: `payment.authorized`, `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`.
- [ ] Upstash Redis (`UPSTASH_REDIS_REST_URL/TOKEN`) so rate limits are shared across serverless instances (the in-memory fallback is per instance).
- [ ] Razorpay merchant compliance pages on the site: Terms, Privacy (exist), **Cancellation & Refund policy** (missing: write it, link in footer), contact details. GST invoices if registered.
- [ ] Run one live ₹ test purchase end to end: pay → plan active on the site → open the mobile app signed in → Cloud unlocked. Then refund it and confirm the plan drops.
- [ ] `npm run test:payments` (pure rules + signature checks) in CI. DB-backed activation has no automated test yet: add an integration test against a Neon branch.
- [ ] Decide on auto-renew: plans are one-time passes (no mandate). If you want auto-renewal, switch to Razorpay Subscriptions (webhook handlers for `subscription.*` already exist but nothing creates subscriptions).

## Not done / known gaps
- No in-app or site UI yet showing "plan active until <date>" outside the checkout message (the billing history page exists at `/settings/billing/history`).
- Teams plan is a self-serve ₹ price here; the old page said "Contact Sales".
- Idempotency of `create-order` reuses a pending order for 5 minutes per plan; abandoned orders stay `CREATED` (harmless).


---
# Plans, tokens and "no pay, no use" (added after the pricing decision)

## What is sold
| Product | Price (USD) | You get |
|---|---|---|
| Starter | $5 / 30 days | 10M standard tokens, standard models, 300 req/day |
| Plus | $12 / 30 days | 25M standard tokens, + premium models, 800 req/day |
| Pro | $20 / 30 days | 40M standard tokens, all models, 2000 req/day |
| Pay-as-you-go | $5 / $10 / $25 | 8M / 17M / 45M standard tokens, valid 12 months |

A **standard token (ST)** = one token of a small model; 1,000,000 ST = $0.26 of provider cost. Bigger models burn ST faster, computed from real provider prices
(`src/lib/token-pricing.ts`). Allowances are sized to ≈50% of price (tests fail if any product exceeds 60%), leaving room for gateway fees, tax and margin. PAYG is priced above plans per token.
Plan allowance is spent first (expires with the period, no rollover); PAYG after. Charged in INR by default at `USD_INR_RATE` (default 85); set `BILLING_CURRENCY=USD` only if
International Payments is enabled on your Razorpay account.

## How "nobody can use paid things without paying" is enforced
1. **Server is the only authority.** The browser/app send only a product key. Price, currency, tokens and limits come from `pricing-catalog.ts` on the server.
2. **Prepaid wallet** (`token_wallets` + append-only `token_ledger`). Every grant/reserve/settle has a unique `refId`, so retries, double webhooks and double clicks cannot double-grant or double-charge.
   Spends and grants lock the user's wallet row (`SELECT … FOR UPDATE`), so concurrent requests cannot overspend.
3. **Mobile/hosted gateway (strict):** the Rust API asks the website to `reserve` the *worst-case* cost (prompt estimate + max output) **before** any provider call.
   No successful reservation ⇒ no provider call (tested). `max_tokens` is clamped to the plan. The provider is asked for a usage chunk; real usage is settled afterwards and the
   unused part returned. A stream that never reports usage stays charged in full; a provider failure is released. Unknown models are rejected (never free); model tier is enforced per plan.
4. **Website AI flows:** `enforceQuota` (single choke point used by chat/build/agent routes) now also requires a live balance; finished calls are billed by `recordTokenUsage → chargeUsage`
   (unknown model ⇒ billed at the most expensive rate). Daily request/token caps stay as speed/abuse limits. Responses use HTTP 402 `PAYMENT_REQUIRED` with a pricing URL.
5. **Server-to-server calls are signed** (HMAC-SHA256 over `timestamp.body`, 60 s window, constant-time compare, secret ≥ 32 chars). `/api/internal/*` is useless without the secret.
6. **Keys never leave servers:** provider keys exist only in the Rust API / site environment. Clients never receive them, error bodies from providers are never forwarded, prompts are not logged.
7. **Payment integrity:** order amount is created server-side and must equal Razorpay's captured amount and currency (checked in browser confirm and webhook); signature checks are constant-time;
   a paid period/grant is claimed atomically exactly once; a full refund ends the plan AND takes back the tokens that order granted (`revokeOrderGrant`); failed attempts never alter an active plan.
8. **Fails closed:** billing enforced but metering not configured ⇒ 503 (tested). Clerk/site outage ⇒ "not paid".

## Known limits (honest)
- Site flows are *pre-check + post-bill*, not reserve/settle: with N concurrent in-flight requests a user could overshoot their balance by at most N×(one request); bounded by `maxConcurrent`-style
  caps and daily limits, and any shortfall is logged (`[wallet] usage exceeded balance`). Move those routes to `authorizeHosted` for the strict model when convenient.
- A user can burn their allowance quickly by choosing expensive models; that is by design (they paid for it) but consider per-minute rate limits on the gateway.
- Reservation estimates use chars/3; extremely token-dense text (rare scripts) could under-estimate the prompt, but the real bill is settled from provider usage.
- No automated DB-backed tests for wallet SQL yet (pure math, signing, catalog and the Rust metering flow are tested). Run the manual flow below on a staging DB before launch.

## Before launch (do in this order)
1. Apply DB changes: `psql "$DATABASE_URL" -f prisma/manual/2026-10-23_wallet.sql` (or `prisma db push`), then `npx prisma generate`.
2. Site env: `INTERNAL_API_SECRET` (≥32 random chars), `USD_INR_RATE`, `BILLING_CURRENCY`, live Razorpay keys + webhook secret, Upstash Redis.
3. Rust API env: `SITE_INTERNAL_URL` (https), the **same** `INTERNAL_API_SECRET`, `BILLING_ENFORCE=1`, `GATEWAY_MODELS` ⊆ priced models (ids like `openai/gpt-4o-mini`), gateway key.
4. Staging test matrix: (a) no payment → 402 everywhere; (b) buy Starter → balance 10M, Starter limits, premium model → 403; (c) buy top-up → PAYG grows; (d) exhaust → 402; (e) refund → plan ends;
   (f) replay the webhook 3× → one grant; (g) two parallel gateway calls with a tiny balance → one succeeds; (h) bad HMAC → 401; (i) unknown model → 403.
5. Razorpay: webhook URL + events, Terms/Privacy/**Refund policy** pages, GST invoices if applicable.
6. Rotate any key that has ever been shared or committed.
