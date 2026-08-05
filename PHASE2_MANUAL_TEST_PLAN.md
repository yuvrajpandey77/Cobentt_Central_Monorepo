# PHASE 2 — Payment Manual Test Plan

## Pre-Test Setup
- [ ] `.env` has `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` configured
- [ ] Database has been migrated (`npx prisma db push` or `npx prisma migrate dev`)
- [ ] Razorpay webhook URL configured in Razorpay dashboard: `https://your-domain.com/api/razorpay/webhook`
- [ ] Test Razorpay account (not live)

---

## Order Creation Tests

### TC-OC-01: Successful Order Creation
- [ ] Login as authenticated user
- [ ] Click "Upgrade to Pro" on pricing page
- [ ] Verify: Razorpay checkout opens with ₹20 amount
- [ ] Verify: `POST /api/razorpay/create-order` returns 200 with `order_id`
- [ ] Verify: `PaymentRecord` created in database with status `CREATED`
- [ ] Verify: Audit log entry `order.created` exists

### TC-OC-02: Unauthenticated Order Creation
- [ ] Without logging in, attempt to create order via API
- [ ] Verify: Returns 401 Unauthorized

### TC-OC-03: Amount Tampering Rejection
- [ ] Login as authenticated user
- [ ] Intercept `create-order` request, change `amount` to 1 (paise)
- [ ] Verify: Returns 400 "Amount does not match plan price"
- [ ] Verify: No `PaymentRecord` created

### TC-OC-04: Invalid Plan Rejection
- [ ] Send request with `plan: "invalid"`
- [ ] Verify: Returns 400 "Invalid plan"

### TC-OC-05: Rate Limiting
- [ ] Send 21 rapid requests to `create-order`
- [ ] Verify: 21st request returns 429 "Too many requests"

---

## Payment Verification Tests

### TC-PV-01: Successful Verification
- [ ] Complete payment via Razorpay checkout
- [ ] Verify: `POST /api/razorpay/verify-payment` returns 200
- [ ] Verify: `PaymentRecord.status` updated to `AUTHORIZED`
- [ ] Verify: `signatureVerified` set to `true`
- [ ] Verify: Audit log `payment.verified` exists

### TC-PV-02: Signature Mismatch
- [ ] Send request with forged `razorpay_signature`
- [ ] Verify: Returns 400 "Payment signature verification failed"
- [ ] Verify: Audit log `payment.verification_failed` with `success: false`

### TC-PV-03: Missing Fields
- [ ] Send request without `razorpay_payment_id`
- [ ] Verify: Returns 400 "Missing required payment fields"

---

## Payment Confirmation Tests

### TC-PC-01: Successful Confirmation (Full Flow)
- [ ] Complete full payment flow: create order → pay → verify → confirm
- [ ] Verify: `POST /api/payments/confirm` returns 200
- [ ] Verify: `PaymentRecord.status` = `CAPTURED`
- [ ] Verify: `AllowedUser.plan` = `PRO` (or `ENTERPRISE` for teams)
- [ ] Verify: `AllowedUser.subscriptionStatus` = `ACTIVE`
- [ ] Verify: `AllowedUser.currentPeriodEnd` = 30 days from now
- [ ] Verify: `AllowedUser.maxDailyTokens` matches plan limits
- [ ] Verify: Clerk `publicMetadata.plan` synced
- [ ] Verify: Audit log `payment.confirmed` with all details

### TC-PC-02: Idempotency
- [ ] Send same `confirm` request twice with same `razorpay_payment_id`
- [ ] Verify: Both return 200 (second returns "Payment already confirmed")
- [ ] Verify: Only one `PaymentRecord` with status `CAPTURED`
- [ ] Verify: Audit log `payment.confirm_idempotent` for second request

### TC-PC-03: Signature Mismatch on Confirm
- [ ] Send confirm with forged signature
- [ ] Verify: Returns 400
- [ ] Verify: Audit log `payment.confirm_failed` with `success: false`

### TC-PC-04: Transaction Atomicity
- [ ] Complete payment, but mock Clerk API to fail
- [ ] Verify: `PaymentRecord` still created (transaction committed)
- [ ] Verify: `AllowedUser` still updated (transaction committed)
- [ ] Verify: Clerk sync failure logged but doesn't block payment

---

## Webhook Tests

### TC-WH-01: Valid Webhook Signature
- [ ] Configure Razorpay webhook in dashboard
- [ ] Trigger `payment.captured` event
- [ ] Verify: Webhook processed, `PaymentRecord.status` = `CAPTURED`
- [ ] Verify: Audit log `webhook.payment.captured` exists

### TC-WH-02: Invalid Webhook Signature
- [ ] Send webhook with wrong signature
- [ ] Verify: Returns 400 "Invalid signature"

### TC-WH-03: Payment Failed Webhook
- [ ] Trigger `payment.failed` event
- [ ] Verify: `PaymentRecord.status` = `FAILED`
- [ ] Verify: `AllowedUser.subscriptionStatus` = `PAST_DUE`
- [ ] Verify: Audit log `webhook.payment.failed` exists

### TC-WH-04: Refund Webhook
- [ ] Trigger `refund.created` then `refund.processed` events
- [ ] Verify: `PaymentRecord.refundStatus` = `PROCESSED`
- [ ] Verify: `PaymentRecord.status` = `REFUNDED` (full) or `PARTIALLY_REFUNDED`
- [ ] Verify: If full refund, user downgraded to FREE

### TC-WH-05: Subscription Cancelled Webhook
- [ ] Trigger `subscription.cancelled` event
- [ ] Verify: `AllowedUser.subscriptionStatus` = `CANCELLED`
- [ ] Verify: Clerk metadata synced

### TC-WH-06: Unknown Event
- [ ] Send webhook with `event: "unknown.event"`
- [ ] Verify: Returns 200 (acknowledged, not processed)
- [ ] Verify: No error in logs

---

## Subscription Lifecycle Tests

### TC-SL-01: Subscription Expiry
- [ ] Manually set `AllowedUser.currentPeriodEnd` to past date
- [ ] Wait for cron job (or trigger manually)
- [ ] Verify: User downgraded to FREE
- [ ] Verify: `subscriptionStatus` = `EXPIRED`
- [ ] Verify: Clerk metadata synced to FREE

### TC-SL-02: Plan Upgrade
- [ ] User on PRO plan, purchase TEAMS plan
- [ ] Verify: `AllowedUser.plan` updated to `ENTERPRISE`
- [ ] Verify: `maxDailyTokens` updated to 10M
- [ ] Verify: `currentPeriodEnd` reset to 30 days from now

### TC-SL-03: Plan Downgrade via Refund
- [ ] User on TEAMS plan, full refund processed
- [ ] Verify: `AllowedUser.plan` = `FREE`
- [ ] Verify: `subscriptionStatus` = `CANCELLED`
- [ ] Verify: Quota limits reset to FREE tier

---

## Billing History Tests

### TC-BH-01: View Billing History
- [ ] Login as user with payment history
- [ ] Call `GET /api/billing/history`
- [ ] Verify: Returns array of `PaymentRecord` entries
- [ ] Verify: Fields include `amount`, `plan`, `status`, `createdAt`
- [ ] Verify: Sorted by `createdAt` descending

### TC-BH-02: Empty History
- [ ] Login as user with no payments
- [ ] Call `GET /api/billing/history`
- [ ] Verify: Returns empty array with subscription info

---

## Admin Refund Tests

### TC-AR-01: Admin Full Refund
- [ ] Login as admin
- [ ] Send `POST /api/admin/refund` with `paymentRecordId`
- [ ] Verify: Razorpay refund created
- [ ] Verify: `PaymentRecord.status` = `REFUNDED`
- [ ] Verify: User downgraded to FREE
- [ ] Verify: Audit log `refund.initiated` exists

### TC-AR-02: Admin Partial Refund
- [ ] Send refund with `amount` less than original
- [ ] Verify: `PaymentRecord.status` = `PARTIALLY_REFUNDED`
- [ ] Verify: User plan unchanged (partial refund)

### TC-AR-03: Non-Admin Refund Attempt
- [ ] Login as non-admin user
- [ ] Attempt refund via API
- [ ] Verify: Returns 403 "Admin access required"

### TC-AR-04: Double Refund Prevention
- [ ] Attempt refund on already-refunded payment
- [ ] Verify: Returns 400 "Payment already refunded"

---

## Security Tests

### TC-SEC-01: HMAC Verification
- [ ] All payment endpoints verify HMAC signature
- [ ] Forged signatures rejected with 400

### TC-SEC-02: Webhook Signature Verification
- [ ] Webhook endpoint verifies `x-razorpay-signature`
- [ ] Invalid signatures rejected with 400

### TC-SEC-03: No Secret Exposure
- [ ] Verify: `RAZORPAY_KEY_SECRET` never returned in API responses
- [ ] Verify: `RAZORPAY_WEBHOOK_SECRET` never returned in API responses
- [ ] Verify: No `NEXT_PUBLIC_` prefix on secret keys

### TC-SEC-04: Idempotency
- [ ] Duplicate `razorpay_payment_id` confirmations return original result
- [ ] No duplicate subscription activations

### TC-SEC-05: Atomic Transactions
- [ ] Payment confirmation uses `prisma.$transaction`
- [ ] All-or-nothing: payment record + subscription + quota update together

---

## Error Handling Tests

### TC-EH-01: Payment Cancelled by User
- [ ] User closes Razorpay checkout without paying
- [ ] Verify: No `PaymentRecord` created (or stays `CREATED`)
- [ ] Verify: User remains on current plan

### TC-EH-02: Network Timeout
- [ ] Simulate network timeout during confirm
- [ ] Verify: Returns 500 with generic error message
- [ ] Verify: No partial state in database

### TC-EH-03: Database Failure
- [ ] Simulate database unavailability during confirm
- [ ] Verify: Returns 500
- [ ] Verify: Payment record not partially created

---

## Audit Trail Tests

### TC-AT-01: Complete Audit Trail
- [ ] Complete full payment flow
- [ ] Verify: `PaymentAuditLog` entries exist for:
  - `order.created`
  - `payment.verified`
  - `payment.confirmed`
- [ ] Verify: Each entry has `clerkUserId`, `correlationId`, `timestamp`

### TC-AT-02: Failed Payment Audit
- [ ] Attempt payment with invalid signature
- [ ] Verify: Audit log `payment.confirm_failed` with `success: false`
- [ ] Verify: `errorMessage` field populated
