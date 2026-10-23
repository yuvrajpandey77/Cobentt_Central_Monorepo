# Staging test guide: wallet SQL and the payment matrix

Never run this against production data. Use a Neon **branch** of the database, Razorpay **test mode** keys, and a throwaway Clerk user.

## 0. Prepare
1. Neon → your project → Branches → create `staging-billing` from main. Copy its connection string:
   `export DATABASE_URL='postgres://...staging-billing...'`
2. Razorpay Dashboard → switch to **Test Mode** → Settings → API Keys → generate. Note key id + secret.
3. Make a secret: `openssl rand -hex 32` → this is `INTERNAL_API_SECRET` (same value on the site and the Rust API).

## 1. Apply the SQL
```bash
cd <site repo>
psql "$DATABASE_URL" -f prisma/manual/2026-10-23_wallet.sql
npx prisma generate
psql "$DATABASE_URL" -c '\d token_wallets' -c '\d token_ledger' -c '\d payment_records' | grep -E "product|refId|planST"
```
Expect: `product` on payment_records, `planKey` on allowed_users (check with `\d allowed_users`), both new tables, and a unique index on `token_ledger.refId`.
The file is idempotent, so running it twice is safe.

## 2. Configure and start
Site `.env.local` (staging): `DATABASE_URL`, Clerk keys (same Clerk instance as the app), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`,
`RAZORPAY_WEBHOOK_SECRET` (pick any string, you enter it in the dashboard next), `INTERNAL_API_SECRET`, `USD_INR_RATE=85`, `BILLING_CURRENCY=INR`.
```bash
npm run dev            # http://localhost:3000
cloudflared tunnel --url http://localhost:3000   # or ngrok http 3000 → gives https://<id>.trycloudflare.com
```
Razorpay (Test Mode) → Settings → Webhooks → add `https://<tunnel>/api/razorpay/webhook`, secret = your `RAZORPAY_WEBHOOK_SECRET`,
events: `payment.authorized`, `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`.

Rust API (separate terminal, `apps/api-rust`):
```bash
export APP_ENV=development REQUIRE_AUTH=0 BILLING_ENFORCE=1
export SITE_INTERNAL_URL=http://localhost:3000 INTERNAL_API_SECRET=<same secret>
export GATEWAY_UPSTREAM_KEY=<a real provider key or skip the gateway tests g/h> GATEWAY_MODELS=openai/gpt-4o-mini,anthropic/claude-3-opus
export DATABASE_URL=<the Rust API's own database url>
cargo run
```
(With `REQUIRE_AUTH=0` the Rust API accepts the header `x-clerk-user-id: user_xxx` as the caller, so you can test without a real token.)

## 3. Pick a test user
Sign up on the site with a throwaway account, then find the Clerk id (`user_...`) in the Clerk dashboard. `export UID_=user_xxx`.
Helper to see state at any time: `psql "$DATABASE_URL" -v uid="'$UID_'" -f scripts/payments/wallet-report.sql`

## 4. The matrix
Run in order. Tick each box only when the stated result is exactly what you see.

**(a) No payment → blocked everywhere**
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8788/v1/chat/completions -H "x-clerk-user-id: $UID_" -H 'content-type: application/json' \
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'        # expect 402
```
In the site, signed in as that user, send a chat message → expect the "needs a plan or a top-up" response (HTTP 402). Wallet report: no `RESERVE` rows.

**(b) Buy Starter**
Site → /overview/pricing → "Get Starter". Pay with Razorpay's test card (see their Test Cards page; typical: `4111 1111 1111 1111`, any future expiry, CVV `123`, success on the OTP page).
Expect: green "Your plan is active until …". Wallet report: `planST = 10000000`, `planExpiresAt` ≈ +30 days, `planKey = starter`, payment `CAPTURED`, ledger has one `GRANT_PLAN`.
Then call the gateway twice: `gpt-4o-mini` → 200; `claude-3-opus` → **403** (not in Starter's tier).

**(c) Buy a top-up**
"Buy tokens" on a $5 pack. Expect `paygST = 8000000`, ledger `TOPUP`, plan untouched.

**(d) Exhaust the balance**
Simulate with SQL, then call the gateway:
```bash
psql "$DATABASE_URL" -c "UPDATE token_wallets SET \"planST\"=0, \"paygST\"=0 WHERE \"clerkUserId\"='$UID_'"
# gateway call as in (a) → expect 402
```
(The plan is still active, so daily limits still apply, but with zero balance every hosted call must be 402.)

**(e) Refund ends the plan**
Razorpay Dashboard → Payments → the Starter payment → Refund (full). Within seconds: payment `REFUNDED`, `allowed_users.plan = FREE`, Clerk public metadata `plan: FREE`, **`planST = 0`** and a `REVERSAL` ledger row (`refId = rev:<orderId>`).
Gateway call → 402. (An unexpired top-up from a *different* purchase stays usable. Refunding a top-up deducts exactly the tokens it granted, never below zero.) Resend the refund webhook: still one `REVERSAL` row.

**(f) Replay the webhook 3×**
Razorpay → Webhooks → the delivery log of `payment.captured` → "Resend" three times (or POST the same body+signature with curl).
Expect: ledger still has exactly one `GRANT_PLAN` for that order (`refId = grant:<orderId>`), wallet unchanged, site returns 200 each time.

**(g) Two parallel gateway calls with a tiny balance**
```bash
psql "$DATABASE_URL" -c "UPDATE token_wallets SET \"paygST\"=2000, \"paygExpiresAt\"=now()+interval '1 day' WHERE \"clerkUserId\"='$UID_'"
for i in 1 2; do curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8788/v1/chat/completions -H "x-clerk-user-id: $UID_" -H 'content-type: application/json' \
  -d '{"model":"openai/gpt-4o-mini","max_tokens":2000,"messages":[{"role":"user","content":"write a long story"}]}' & done; wait
```
Expect one `200` and one `402`. Wallet never negative (the table has a CHECK constraint, so SQL would error rather than go negative).

**(h) Bad signature on the internal API**
```bash
export INTERNAL_API_SECRET=<secret>
npx tsx scripts/payments/internal-call.ts status "{\"userId\":\"$UID_\"}"             # expect 200 {...}
npx tsx scripts/payments/internal-call.ts status "{\"userId\":\"$UID_\"}" --bad-sig   # expect 401
```
Also try with the secret unset/short → the script refuses; with the site missing `INTERNAL_API_SECRET` → every call is 401.

**(i) Unknown model**
```bash
npx tsx scripts/payments/internal-call.ts reserve "{\"userId\":\"$UID_\",\"requestId\":\"req_unknown01\",\"model\":\"made-up-model\",\"promptTokens\":10,\"maxOutputTokens\":10}"   # expect 403 MODEL_NOT_ALLOWED
```

## 5. Extra checks worth doing
- **Early renewal stacks:** buy Starter twice; `currentPeriodEnd` ≈ +60 days, wallet = 10M (replaced, not 20M: the allowance resets per purchase).
- **Mobile unlock:** open the app signed in as the same user → Settings → "Your plan" shows the paid state; Cloud features stop returning 402.
- **Tamper test:** in the browser devtools, change the `product` in the create-order request to `{"product":"plan:starter","amount":1}` → 400 (strict schema, no amount accepted).
- **Streaming settle:** after a successful streamed gateway call, wallet report shows a `SETTLE` row with a positive `deltaST` (unused part returned) — only if your provider honours `stream_options.include_usage`.
- **Logs:** grep both servers for `usage exceeded balance`, `meter settle did not succeed`, `billing is enforced but` — each should be absent in a healthy run.

## 6. Cleanup
Delete the Neon branch, revoke the test keys, remove the webhook from the Razorpay test dashboard, delete the throwaway Clerk user.
