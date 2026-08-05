# Load & Resilience Testing Report — Phase 5.9

## Test Scenarios

### Scenario 1: Concurrent Chat Requests (100 users)

**Setup:** 100 parallel POST requests to `/api/chat/{conversationId}/stream`

**Expected behavior:**
- Rate limiter: First 30 requests/min pass, rest get 429
- Quota enforcement: Advisory locks serialize per-user checks
- Each request gets a unique streaming response
- No double-spending on quota

**Bottleneck:** AI provider rate limits (OpenRouter/OpenAI). The chat endpoint itself handles concurrency well — advisory locks prevent quota races, rate limiter prevents abuse.

### Scenario 2: Concurrent Mode Generation (50 users)

**Setup:** 50 parallel POST requests to `/api/modes/{mode}/generate`

**Expected behavior:**
- Rate limiter: 15 requests/min per user (AI bucket)
- Quota: 6000 token estimate reserved per request
- Injection detection runs on all inputs
- Each request gets a unique artifact

**Bottleneck:** AI provider throughput. Mode generation makes a single AI call per request.

### Scenario 3: Concurrent Deep Research (10 users)

**Setup:** 10 parallel POST requests to `/api/modes/deep-research/generate`

**Expected behavior:**
- Rate limiter: 3 requests/min per user (strict)
- Quota: 12000 token estimate reserved per request
- Each request spawns N+2 AI calls (plan + sections + summary)
- Total: up to 50+ concurrent AI calls

**Bottleneck:** AI provider rate limits. Deep research is the most expensive endpoint.

### Scenario 4: Payment Webhook Storm

**Setup:** 50 concurrent Razorpay webhook calls

**Expected behavior:**
- HMAC signature verification on every request
- Idempotent processing (findUnique by razorpayOrderId/razorpayPaymentId)
- Payment records created atomically
- Subscription updates are serialized per user

**Bottleneck:** Database write contention on `payment_records` and `allowed_users` tables.

### Scenario 5: Database Pressure

**Setup:** 200 concurrent reads + 50 concurrent writes

**Expected behavior:**
- Prisma connection pool handles concurrent queries
- Advisory locks serialize per-user quota operations
- Read queries use indexes (no full table scans)
- Write queries use transactions for consistency

**Bottleneck:** Connection pool size. Default Prisma pool is 10 connections. For 250 concurrent operations, this may be insufficient.

## Recommendations

1. **Increase Prisma connection pool** for production:
   ```
   DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=30"
   ```

2. **Add Redis caching** for read-heavy endpoints (project list, conversation list, settings) to reduce database pressure.

3. **Monitor AI provider rate limits** — implement provider-level circuit breakers.

4. **Add request queuing** for deep-research to prevent provider exhaustion.

5. **Set up load testing** with k6 or artillery for continuous regression testing.

## Current Mitigations

| Protection | Mechanism | Config |
|------------|-----------|--------|
| Rate limiting | Upstash Redis sliding window | 30/min chat, 15/min AI, 3/min deep-research |
| Quota enforcement | PostgreSQL advisory locks | Serialized per-user |
| Payment idempotency | findUnique on razorpay IDs | Database constraints |
| Input validation | Zod schemas + length limits | 10K char max |
| Injection detection | 15 patterns + 10 phrases | Blocking with audit log |
| Error handling | AppError classes | Consistent API responses |
