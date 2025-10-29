# Quota System Setup Guide

## Problem

You're seeing a "TOO_MANY_REQUESTS" error when trying to use the application. This is because the quota enforcement system requires users to be registered in the `allowed_users` table.

## Quick Fix - Add Your User to Allowed Users

### Option 1: Interactive Setup (Recommended)

Run this interactive script that will guide you through the setup:

```bash
npx tsx prisma/quick-setup-user.ts
```

You'll be prompted to enter:
- Your Clerk User ID
- Your email (optional)
- Your display name (optional)

### Option 2: Direct Command

If you already know your Clerk User ID:

```bash
npx tsx prisma/seed-current-user.ts YOUR_CLERK_USER_ID
```

Replace `YOUR_CLERK_USER_ID` with your actual Clerk user ID.

### Option 3: Manual Database Insert

If you prefer to do it manually using Prisma Studio:

1. Open Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Navigate to the `allowed_users` table

3. Click "Add record" and fill in:
   - `clerkUserId`: Your Clerk User ID
   - `email`: Your email
   - `displayName`: Your name
   - `status`: APPROVED
   - `tier`: developer
   - `maxDailyRequests`: 100
   - `maxDailyTokens`: 500000
   - `graceTokens`: 50000
   - `approvedAt`: Current timestamp

4. Save the record

## How to Find Your Clerk User ID

### Method 1: Browser Console
1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Run this command:
   ```javascript
   // If using Clerk's useUser hook
   console.log(window.__CLERK_USER_ID__);
   
   // Or check the auth state in localStorage
   const token = localStorage.getItem('clerk-db-jwt');
   if (token) {
     const payload = JSON.parse(atob(token.split('.')[1]));
     console.log(payload.sub); // This is your user ID
   }
   ```

### Method 2: Clerk Dashboard
1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to "Users"
4. Find your user and click on it
5. Copy the User ID from the details page

### Method 3: Network Tab
1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to the Network tab
4. Make a request (try to send a message)
5. Look at the request headers - you'll see your user ID in the authentication headers

## Development Mode - Bypass Quota (Alternative)

If you want to disable quota checks during development, you can modify the code:

### Temporary Bypass in `src/modules/messages/server/procedures.ts`

Comment out the quota check:

```typescript
.mutation(async ({ input, ctx }) => {
    // Temporarily disable for development
    // const quotaCheck = await enforceQuota(ctx.auth.userId, 5000);

    const existingProject = await prisma.project.findUnique({
        // ... rest of the code
    });
```

**⚠️ Warning**: Remember to re-enable this in production!

### Environment-Based Quota

You can also add an environment variable to control this:

1. Add to `.env`:
   ```
   DISABLE_QUOTA_CHECK=true
   ```

2. Modify `src/lib/quota-enforcement.ts`:
   ```typescript
   export async function enforceQuota(
     userId: string,
     estimatedTokens?: number
   ): Promise<QuotaCheck> {
     // Bypass in development
     if (process.env.DISABLE_QUOTA_CHECK === 'true') {
       return {
         allowed: true,
         usage: {
           dailyTokens: 0,
           dailyRequests: 0,
           limit: 999999,
           percentUsed: 0,
           graceAvailable: 999999,
           graceUsed: 0,
         },
       };
     }
     
     const check = await checkQuota(userId, estimatedTokens);
     // ... rest of code
   }
   ```

## Default Quotas

The system comes with these default quotas:

- **Free Tier** (default):
  - 6 requests per day
  - 200,000 tokens per day
  - 20,000 grace tokens

- **Developer Tier** (set by setup script):
  - 100 requests per day
  - 500,000 tokens per day
  - 50,000 grace tokens

## Understanding the Quota System

### Daily Limits
- **Requests**: Number of API calls/messages you can send per day
- **Tokens**: Total tokens (input + output) you can use per day
- Resets at midnight UTC

### Grace Period
- Additional tokens available when you exceed your daily limit
- One-time use per day
- Resets at midnight UTC

### Alerts
- 90% usage: Warning alert
- 100% usage: Limit reached alert
- Grace period activated: Using grace tokens

## Admin Panel

You can also manage users through the admin panel:

1. Navigate to `/admin` in your application
2. Log in with admin credentials
3. Go to "User Management"
4. Add or approve users

## Troubleshooting

### Error: "User not registered"
- Your user is not in the `allowed_users` table
- Solution: Run one of the setup scripts above

### Error: "Your account is pending approval"
- Your user exists but status is PENDING
- Solution: Update status to APPROVED in database or use admin panel

### Error: "Daily request limit reached"
- You've made too many requests today
- Solution: Wait until midnight UTC or increase your limits

### Error: "Daily token limit exceeded"
- You've used all your tokens for today
- Solution: Wait until midnight UTC, use grace tokens, or increase your limits

### Error: "Grace tokens already used"
- You've already used your grace tokens today
- Solution: Wait until midnight UTC for reset

## Production Considerations

1. **Always enable quotas in production**
2. **Set appropriate limits per user tier**
3. **Monitor usage through the admin dashboard**
4. **Set up webhook alerts for quota violations**
5. **Implement proper billing integration**

## Need Help?

If you continue to have issues:
1. Check your Clerk User ID is correct
2. Verify database connection is working
3. Check Prisma migrations are up to date: `npx prisma migrate dev`
4. Restart your development server
5. Clear browser cache and cookies

## Quick Commands Reference

```bash
# Run interactive setup
npx tsx prisma/quick-setup-user.ts

# Add user directly
npx tsx prisma/seed-current-user.ts YOUR_USER_ID

# Open database viewer
npx prisma studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate dev
```

