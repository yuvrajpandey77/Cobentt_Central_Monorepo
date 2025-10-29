# 🎉 Auto-Provisioning: Free Tier for All Users

## Overview

The quota system now **automatically provisions all new users with a Free Tier account**. No manual setup required!

## How It Works

When a user signs in for the first time:
1. ✅ System checks if user exists in `allowed_users` table
2. ✅ If not found, **automatically creates** a Free Tier account
3. ✅ User can immediately start using the app
4. ✅ Token usage tracking begins automatically

## Free Tier Limits

New users automatically get:

- **Plan**: FREE
- **Daily Requests**: 6 per day
- **Daily Tokens**: 200,000 per day
- **Grace Tokens**: 20,000 (one-time use per day)
- **Status**: APPROVED (immediate access)
- **Resets**: Midnight UTC daily

## Benefits

### For Users
- 🚀 Instant access - no waiting for approval
- 📊 Usage tracking from day one
- 🎯 Clear quota limits displayed in UI
- 🔄 Automatic daily resets

### For Admins
- 🤖 Zero manual provisioning
- 📈 All users tracked automatically
- 🛡️ Quota enforcement still active
- 💰 Easy upgrade path to paid tiers

## User Lifecycle

```
New User Signs In
       ↓
System checks allowed_users table
       ↓
User not found?
       ↓
AUTO-CREATE with Free Tier
       ↓
Status: APPROVED
       ↓
User can use app immediately!
```

## Upgrading Users

Admins can upgrade users through:

### 1. Admin Panel
Navigate to `/admin` → User Management → Select user → Upgrade plan

### 2. Database (Prisma Studio)
```bash
npx prisma studio
```
Then edit the user's `plan` and quota fields

### 3. API/Script
```typescript
await prisma.allowedUser.update({
  where: { clerkUserId: userId },
  data: {
    plan: "PRO",
    tier: "professional",
    maxDailyRequests: 100,
    maxDailyTokens: 2000000,
    graceTokens: 200000,
  },
});
```

## Available Plans

### FREE (Default)
- 6 requests/day
- 200K tokens/day
- 20K grace tokens
- Perfect for testing

### DEVELOPER
- 100 requests/day
- 500K tokens/day
- 50K grace tokens
- For active development

### PRO
- 1000 requests/day
- 2M tokens/day
- 200K grace tokens
- For production use

### ENTERPRISE
- Unlimited requests
- 10M+ tokens/day
- 1M grace tokens
- Custom limits available

## Monitoring & Analytics

All auto-provisioned users are tracked:

- Daily token usage
- Request counts
- Grace period usage
- Cost tracking (for internal metrics)
- Alert history

## Technical Details

### Auto-Provisioning Location
File: `src/lib/quota-enforcement.ts`
Function: `checkQuota()`
Lines: 41-58

```typescript
if (!allowedUser) {
  console.log(`[Auto-provisioning] Creating free tier account for user ${userId}`);
  allowedUser = await prisma.allowedUser.create({
    data: {
      clerkUserId: userId,
      email: `${userId}@cogerphere.local`,
      displayName: "Free User",
      status: "APPROVED",
      approvedAt: new Date(),
      plan: "FREE",
      tier: "free",
      maxDailyRequests: 6,
      maxDailyTokens: 200000,
      graceTokens: 20000,
    },
  });
}
```

### Database Tables

#### allowed_users
Stores user quotas and limits

#### user_usage
Tracks actual usage (auto-created on first request)

#### token_usage
Detailed per-request token tracking

#### usage_alerts
Quota warnings and notifications

## User Experience

### First-Time User Flow

1. **Sign in with Clerk** → Authenticated
2. **Navigate to app** → Auto-provisioned
3. **See token bar** → Shows 0 / 200,000 (green)
4. **Send first message** → Usage tracked
5. **Token bar updates** → Shows actual usage

### Token Bar Display

The green token bar shows:
- **Left side**: Daily usage `X / 200,000`
- **Right side**: Percentage bar + `%`
- **Color coding**:
  - 🟢 Green (0-74%): All good
  - 🟡 Yellow (75-89%): Getting high
  - 🟠 Orange (90-99%): Warning
  - 🔴 Red (100%+): Limit reached

## Warnings & Alerts

Users receive automatic alerts at:
- **90% usage**: Warning notification
- **100% usage**: Limit reached notification
- **Grace period activated**: Using bonus tokens

## Grace Period

When daily limit is reached:
- ✅ 20,000 grace tokens activate automatically
- ⚠️ User is notified they're in grace period
- 🔄 Grace tokens reset at midnight UTC
- ❌ Only one grace period per day

## Disabling Auto-Provisioning

If you want manual approval instead:

### Option 1: Environment Variable
```env
REQUIRE_MANUAL_APPROVAL=true
```

Then modify `quota-enforcement.ts` to check this variable.

### Option 2: Code Change
Remove the auto-create block (lines 41-58) and restore the original rejection:

```typescript
if (!allowedUser) {
  return {
    allowed: false,
    reason: "User not registered. Please contact admin for access.",
  };
}
```

## Best Practices

### For Development
- ✅ Keep auto-provisioning enabled
- ✅ Use generous free tier limits for testing
- ✅ Monitor usage through admin panel

### For Production
- ✅ Keep auto-provisioning enabled for smooth onboarding
- ✅ Set appropriate free tier limits
- ✅ Implement upgrade prompts at 90% usage
- ✅ Set up webhook alerts for admin monitoring

## Security Considerations

- ✅ Only authenticated Clerk users can be provisioned
- ✅ Quotas prevent abuse even with auto-provisioning
- ✅ Admins can revoke access anytime
- ✅ All usage is tracked and auditable

## FAQ

### Q: Will this create spam accounts?
**A:** No, only users authenticated via Clerk can be provisioned.

### Q: Can I limit who gets auto-provisioned?
**A:** Yes, add email domain checks or other validation in the auto-provisioning code.

### Q: What if I want invite-only access?
**A:** Disable auto-provisioning and use the manual approval workflow.

### Q: How do I bulk upgrade users?
**A:** Use Prisma Studio or create a migration script.

## Migration from Manual Provisioning

If you were using manual provisioning before:

1. ✅ Existing users in `allowed_users` are unaffected
2. ✅ New users get auto-provisioned
3. ✅ No data migration needed
4. ✅ All quotas and limits preserved

## Monitoring

Check auto-provisioning in logs:
```bash
[Auto-provisioning] Creating free tier account for user_ABC123
```

View all users:
```bash
npx prisma studio
# Navigate to allowed_users table
```

## Support

For issues or questions:
- Check server logs for provisioning messages
- Verify database connectivity
- Ensure Clerk authentication is working
- Review quota limits in admin panel

---

**Now anyone can sign up and start using Cogerphere immediately!** 🎉

