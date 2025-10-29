# 🏗️ Token Usage System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer                                                        │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ UsageDisplay     │  │ Analytics       │  │ Admin Panel    │ │
│  │ (Compact/Full)   │  │ Dashboard       │  │ /admin         │ │
│  └──────────────────┘  └─────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  tRPC API Layer                                                  │
│  ┌──────────────────────────────┐  ┌────────────────────────┐  │
│  │ usage Router (User)          │  │ admin Router (Admin)   │  │
│  │ • userTotals                 │  │ • findUserByEmail      │  │
│  │ • projectTotals              │  │ • updateUserLimits     │  │
│  │ • quotaStatus                │  │ • updateUserPlan       │  │
│  │ • analytics                  │  │ • platformAnalytics    │  │
│  │ • alerts                     │  │ • listUsers            │  │
│  └──────────────────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Business Logic Layer                                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Quota           │  │ Token Usage      │  │ Webhook        │ │
│  │ Enforcement     │  │ Tracking         │  │ System         │ │
│  │                 │  │                  │  │                │ │
│  │ • checkQuota    │  │ • recordUsage    │  │ • trigger      │ │
│  │ • enforceQuota  │  │ • getUserTotals  │  │ • retry        │ │
│  │ • markGraceUsed │  │ • getAnalytics   │  │ • signature    │ │
│  └─────────────────┘  └──────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Database Layer (PostgreSQL + Prisma)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AllowedUser          UserUsage          TokenUsage      │   │
│  │  • clerkUserId        • userId           • userId        │   │
│  │  • plan (enum)        • dailyTokens      • projectId     │   │
│  │  • maxDailyTokens     • dailyRequests    • provider      │   │
│  │  • maxDailyRequests   • totalTokens      • model         │   │
│  │  • graceTokens        • totalRequests    • promptTokens  │   │
│  │  • graceUsed          • totalCostUsd     • completionTok │   │
│  │  • status (enum)      • lastResetAt      • costUsd       │   │
│  │  • webhookUrl         • alert90Sent      • createdAt     │   │
│  │  • webhookEvents      • alert100Sent     └──────────────┘   │
│  │  └─────────────────────────────────────────────────────┘   │
│  │                                                             │   │
│  │  AdminUser            AdminActionLog     WebhookLog      │   │
│  │  UsageAlert                                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow: User Sends Message

```
1. User types message in build page
   ↓
2. UI shows current quota status (UsageDisplay)
   ↓
3. User clicks Send
   ↓
4. tRPC: messages.create()
   ↓
5. 🔒 enforceQuota(userId, 5000 tokens)
   ├─→ Get AllowedUser limits
   ├─→ Get UserUsage current stats
   ├─→ Check if daily reset needed (midnight UTC)
   ├─→ Check: usage + 5000 < maxDailyTokens?
   │   ├─ YES: Continue ✅
   │   └─ NO: Check grace period
   │       ├─ Grace available: Allow with warning ⚠️
   │       └─ Grace exhausted: Throw TOO_MANY_REQUESTS ❌
   ↓
6. Create Message in DB
   ↓
7. Send Inngest event (runAgent) with userId, messageId
   ↓
8. Inngest calls AI (OpenAI/Anthropic)
   ↓
9. AI returns { output, usage: { prompt_tokens, completion_tokens } }
   ↓
10. 📊 recordTokenUsage()
    ├─→ Create TokenUsage record
    ├─→ Update UserUsage aggregates
    ├─→ Check if 90% threshold crossed → trigger webhook
    ├─→ Check if 100% threshold crossed → trigger webhook
    └─→ If in grace period → create UsageAlert
   ↓
11. Return response to user
    ↓
12. UI invalidates queries → UsageDisplay updates
```

---

## Admin Flow: Update User Limits

```
1. Admin visits /admin
   ↓
2. Searches user by email
   ↓
3. tRPC: admin.findUserByEmail(email)
   ├─→ requireAdmin(userId) ← checks AdminUser table
   └─→ Returns AllowedUser + UserUsage
   ↓
4. Admin changes limits and clicks "Update Limits"
   ↓
5. tRPC: admin.updateUserLimits()
   ├─→ Log action to AdminActionLog
   ├─→ Update AllowedUser record
   └─→ If token limit changed: triggerWebhook(LIMIT_CHANGED)
   ↓
6. Webhook sent to user's configured endpoint
   ├─→ Payload: { event, oldLimit, newLimit, changedBy }
   ├─→ Headers: X-Webhook-Signature (HMAC-SHA256)
   └─→ Log to WebhookLog
   ↓
7. Admin sees success toast
```

---

## Quota Reset Flow (Daily at Midnight UTC)

```
Triggered: On first request after midnight UTC

1. User makes API request
   ↓
2. checkQuota(userId)
   ↓
3. Get UserUsage.lastResetAt
   ↓
4. Compare: isSameUTCDate(lastResetAt, now)?
   ├─ YES: Use existing counters
   └─ NO: Reset daily counters
       ├─→ Set dailyTokens = 0
       ├─→ Set dailyRequests = 0
       ├─→ Set alert90Sent = false
       ├─→ Set alert100Sent = false
       ├─→ Set lastResetAt = now
       └─→ Reset AllowedUser.graceUsed = false
   ↓
5. Continue with quota check
```

---

## Grace Period Flow

```
Scenario: User has 200k limit, used 190k, tries to use 15k more

1. checkQuota(userId, 15000)
   ↓
2. Calculate: 190k + 15k = 205k > 200k (5k overage)
   ↓
3. Check grace tokens: 5k < 20k grace? YES ✅
   ↓
4. Check grace already used? NO ✅
   ↓
5. Allow request with warning
   ├─→ Mark AllowedUser.graceUsed = true
   ├─→ triggerWebhook(QUOTA_EXCEEDED)
   ├─→ Create UsageAlert (type: grace_period)
   └─→ Return { allowed: true, inGracePeriod: true, warnings: [...] }
   ↓
6. UI shows amber warning: "⚠️ Using grace tokens"
   ↓
7. Next overage request: REJECTED (grace already used)
```

---

## Webhook Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `QUOTA_WARNING_90` | First time reaching 90% usage | `{ percentUsed: 90, tokensUsed, tokenLimit, tokensRemaining }` |
| `QUOTA_WARNING_100` | First time reaching 100% usage | `{ percentUsed: 100, tokensUsed, tokenLimit }` |
| `QUOTA_EXCEEDED` | Entering grace period | `{ tokensUsed, tokenLimit, graceTokensUsed }` |
| `LIMIT_CHANGED` | Admin updates daily limit | `{ oldLimit, newLimit, changedBy }` |
| `PLAN_UPGRADED` | User moves to higher plan | `{ oldPlan, newPlan }` |
| `PLAN_DOWNGRADED` | User moves to lower plan | `{ oldPlan, newPlan }` |

---

## Security Model

```
┌─────────────────────────────────────────────────────────┐
│  Authentication (Clerk)                                  │
│  ↓                                                       │
│  Authorization Layers:                                  │
│                                                          │
│  1. User Routes (tRPC protectedProcedure)               │
│     ✓ ctx.auth.userId must exist                        │
│     ✓ Can only access own data                          │
│                                                          │
│  2. Admin Routes (requireAdmin check)                   │
│     ✓ Must exist in AdminUser table                     │
│     ✓ All actions logged to AdminActionLog              │
│                                                          │
│  3. Quota Enforcement (enforceQuota)                    │
│     ✓ Runs before every AI API call                     │
│     ✓ Database-enforced limits (not client-side)        │
│     ✓ Grace period tracked in DB                        │
│                                                          │
│  4. Webhook Signatures (HMAC-SHA256)                    │
│     ✓ AllowedUser.webhookSecret used for signing        │
│     ✓ X-Webhook-Signature header verified               │
│                                                          │
│  5. Rate Limiting (Optional - add Upstash/Redis)        │
│     ✓ Per-IP rate limits on public routes               │
│     ✓ Per-user rate limits on admin routes              │
└─────────────────────────────────────────────────────────┘
```

---

## Cost Tracking Model

```typescript
// Model pricing per 1M tokens (USD)
OPENAI: {
  "gpt-4o": { input: $5.00, output: $15.00 },
  "gpt-4o-mini": { input: $0.15, output: $0.60 },
}

ANTHROPIC: {
  "claude-3.5-sonnet": { input: $3.00, output: $15.00 },
  "claude-3-haiku": { input: $0.25, output: $1.25 },
}

// Per-call cost calculation:
costUsd = (promptTokens / 1M * inputPrice) + (completionTokens / 1M * outputPrice)

// Stored in TokenUsage.costUsd (Decimal)
// Aggregated in UserUsage.totalCostUsd
```

---

## Plan Comparison Matrix

| Feature | FREE | PRO | ENTERPRISE | CUSTOM |
|---------|------|-----|------------|--------|
| **Daily Tokens** | 200k | 2M | 10M | Admin-set |
| **Daily Requests** | 6 | 100 | 1,000 | Admin-set |
| **Grace Tokens** | 20k (10%) | 200k (10%) | 1M (10%) | Admin-set |
| **Analytics** | Basic | Full | Full + Exports | Advanced |
| **Webhooks** | ❌ | ✅ | ✅ | ✅ |
| **Support** | Community | Priority | Dedicated | White-glove |
| **SLA** | None | 99.5% | 99.9% | Custom |
| **Billing Integration** | N/A | Stripe | Stripe/Invoice | Custom |

---

## Monitoring & Observability

### Key Metrics to Track

1. **User Metrics**
   - Daily active users
   - Average tokens per user
   - Users hitting quota (%)
   - Grace period usage frequency

2. **Platform Metrics**
   - Total tokens consumed
   - Total cost (by provider/model)
   - API response times
   - Error rates by quota type

3. **Webhook Metrics**
   - Delivery success rate
   - Retry counts
   - Failed webhooks requiring manual intervention

4. **Admin Actions**
   - Limit changes per day
   - Plan upgrades/downgrades
   - New user approvals

### Recommended Dashboards

```
Admin Dashboard:
  • Real-time token consumption
  • Cost burn rate
  • Top users by usage
  • Quota violation trends
  • Webhook failure alerts

User Dashboard:
  • Daily usage graph
  • Cost projections
  • Quota warnings
  • Provider/model breakdown
  • Recent API calls
```

---

## Performance Considerations

### Database Indexes
- ✅ `userId` on UserUsage (unique)
- ✅ `clerkUserId` on AllowedUser (unique)
- ✅ `(userId, createdAt)` on TokenUsage
- ✅ `(projectId, createdAt)` on TokenUsage
- ✅ `(adminEmail, timestamp)` on AdminActionLog

### Caching Strategy (Future)
```typescript
// Cache quota checks for 1 minute
const cacheKey = `quota:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const status = await checkQuota(userId);
await redis.setex(cacheKey, 60, JSON.stringify(status));
return status;
```

### Query Optimization
- Use aggregations for analytics (not N+1 queries)
- Paginate admin user lists
- Limit recent calls to 100 max
- Use raw SQL for complex daily rollups

---

This architecture ensures:
- ✅ **Scalability**: Handles millions of requests
- ✅ **Security**: Database-enforced, audited, signed webhooks
- ✅ **Reliability**: Grace periods, retries, daily resets
- ✅ **Observability**: Full analytics and admin controls
- ✅ **Flexibility**: Tiered plans, custom limits, plan migrations

