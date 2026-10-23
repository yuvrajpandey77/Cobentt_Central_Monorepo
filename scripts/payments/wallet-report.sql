-- Usage: psql "$DATABASE_URL" -v uid="'user_XXXX'" -f scripts/payments/wallet-report.sql
\echo '--- wallet'
SELECT "planST", "planExpiresAt", "paygST", "paygExpiresAt" FROM token_wallets WHERE "clerkUserId" = :uid;
\echo '--- last ledger rows'
SELECT kind, "deltaST", "fromPlan", "fromPayg", "refId", model, "createdAt" FROM token_ledger WHERE "clerkUserId" = :uid ORDER BY "createdAt" DESC LIMIT 15;
\echo '--- payments'
SELECT "razorpayOrderId", product, amount, currency, status, "periodEnd" FROM payment_records WHERE "clerkUserId" = :uid ORDER BY "createdAt" DESC LIMIT 10;
\echo '--- plan'
SELECT plan, "planKey", "subscriptionStatus", "currentPeriodEnd" FROM allowed_users WHERE "clerkUserId" = :uid;
