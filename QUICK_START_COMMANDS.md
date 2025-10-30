# ⚡ Quick Start Commands

## 🚀 Setup (Run These in Order)

```bash
# 1. Apply database migration
npx prisma migrate dev --name add_comprehensive_token_usage_system
# Type 'y' when prompted

# 2. Generate Prisma client
npx prisma generate

# 3. Start dev server
npm run dev
```

## 🔧 Seed Data (Run in PostgreSQL or via Prisma Studio)

### Create Admin User
```sql
INSERT INTO admin_users (id, email, role, "clerkUserId", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'YOUR_EMAIL@example.com', 'SUPER_ADMIN', 'YOUR_CLERK_USER_ID', NOW(), NOW());
```

### Create Test User (FREE Plan)
```sql
INSERT INTO allowed_users (
  id, email, status, plan, 
  "maxDailyTokens", "maxDailyRequests", "graceTokens",
  "clerkUserId", "invitedAt", "approvedAt", "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(), 
  'test@example.com', 
  'APPROVED', 
  'FREE',
  200000, 6, 20000,
  'test-clerk-id',
  NOW(), NOW(), NOW(), NOW()
);
```

### Create PRO User
```sql
INSERT INTO allowed_users (
  id, email, status, plan, 
  "maxDailyTokens", "maxDailyRequests", "graceTokens",
  "clerkUserId", "invitedAt", "approvedAt", "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(), 
  'pro-user@example.com', 
  'APPROVED', 
  'PRO',
  2000000, 100, 200000,
  'pro-clerk-id',
  NOW(), NOW(), NOW(), NOW()
);
```

## 🧪 Test Routes

```bash
# User-facing
http://localhost:3000/projects/[id]/build   # See usage display
http://localhost:3000/dapp-studio           # Test quota on analysis

# Admin panel
http://localhost:3000/admin                 # Manage users
```

## 📊 Verify Setup

### Check tables created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'allowed_users', 
    'user_usage', 
    'token_usage', 
    'admin_users', 
    'admin_action_logs', 
    'webhook_logs', 
    'usage_alerts'
  );
```

### Check admin user
```sql
SELECT email, role FROM admin_users;
```

### Check allowed users
```sql
SELECT email, status, plan, "maxDailyTokens" FROM allowed_users;
```

## 🔍 Debug Commands

### Reset daily usage (for testing)
```sql
UPDATE user_usage 
SET "dailyTokens" = 0, 
    "dailyRequests" = 0,
    "alert90Sent" = false,
    "alert100Sent" = false,
    "lastResetAt" = NOW()
WHERE "userId" = 'your-user-id';
```

### Simulate high usage (trigger 90% alert)
```sql
UPDATE user_usage 
SET "dailyTokens" = 185000 
WHERE "userId" = 'your-user-id';
```

### View recent token usage
```sql
SELECT 
  provider, 
  model, 
  "totalTokens", 
  "costUsd", 
  "createdAt" 
FROM token_usage 
WHERE "userId" = 'your-user-id' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Check webhook logs
```sql
SELECT 
  "eventType", 
  "webhookUrl", 
  success, 
  attempts, 
  "createdAt" 
FROM webhook_logs 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

## 🛠️ Admin Quick Actions

### Upgrade user to PRO
```sql
UPDATE allowed_users 
SET 
  plan = 'PRO',
  "maxDailyTokens" = 2000000,
  "maxDailyRequests" = 100,
  "graceTokens" = 200000
WHERE email = 'user@example.com';
```

### Revoke user access
```sql
UPDATE allowed_users 
SET status = 'REVOKED'
WHERE email = 'user@example.com';
```

### View platform usage (last 7 days)
```sql
SELECT 
  DATE("createdAt") as date,
  SUM("totalTokens") as total_tokens,
  SUM("costUsd") as total_cost,
  COUNT(*) as requests
FROM token_usage 
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY DATE("createdAt")
ORDER BY date DESC;
```

## 📦 Environment Variables Required

```env
# .env
DATABASE_URL="postgresql://user:pass@host/db"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
```

## 🐛 Troubleshooting

### Prisma generate fails (Windows)
```bash
# Close VS Code and dev server first
taskkill /F /IM node.exe
npx prisma generate
```

### Migration fails on duplicate clerkUserId
```sql
-- Find duplicates
SELECT "clerkUserId", COUNT(*) 
FROM allowed_users 
GROUP BY "clerkUserId" 
HAVING COUNT(*) > 1;

-- Delete duplicates (keep first one)
DELETE FROM allowed_users a
USING allowed_users b
WHERE a."clerkUserId" = b."clerkUserId" 
  AND a.id > b.id;
```

### Usage not updating in UI
```typescript
// In message-form.tsx, ensure these are called:
queryClient.invalidateQueries(trpc.usage.quotaStatus.queryKey());
queryClient.invalidateQueries(trpc.usage.projectTotals.queryKey({ projectId }));
```

## 📚 Quick Reference

| Plan | Daily Tokens | Requests | Grace |
|------|--------------|----------|-------|
| FREE | 200,000 | 6 | 20,000 |
| PRO | 2,000,000 | 100 | 200,000 |
| ENTERPRISE | 10,000,000 | 1,000 | 1,000,000 |

## 🎯 Testing Checklist

- [ ] Run migration successfully
- [ ] Generate Prisma client
- [ ] Create admin user
- [ ] Create test allowed user
- [ ] Start dev server
- [ ] Visit `/admin` and search user
- [ ] Visit `/projects/[id]/build` and see usage display
- [ ] Send a message and watch quota update
- [ ] Simulate 90% usage and check alert
- [ ] Update user limit via admin panel
- [ ] Verify webhook logs (if configured)

## ✅ Done!

Your comprehensive token usage system is ready. Visit `/admin` to start managing users! 🎉

