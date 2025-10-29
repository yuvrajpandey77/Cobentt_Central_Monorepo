# 🚀 Quick Fix: "TOO_MANY_REQUESTS" Error

## ✅ **UPDATE: Auto-Provisioning Now Enabled!**

**Good news!** The system now automatically creates a Free Tier account for all new users. You should no longer see the quota error!

If you're still seeing issues, try one of these solutions:

## Immediate Solution (Choose One)

### ✅ Option 1: Bypass Quota in Development (Fastest)

Add this line to your `.env` file:

```env
DISABLE_QUOTA_CHECK=true
```

**Steps:**
1. Open or create `.env` file in the root directory
2. Add the line: `DISABLE_QUOTA_CHECK=true`
3. Save the file
4. Restart your development server
5. Try again!

**⚠️ Important:** Remove this or set to `false` in production!

---

### ✅ Option 2: Add Your User to Database (Production-Ready)

Run this interactive command:

```bash
npx tsx prisma/quick-setup-user.ts
```

Then follow the prompts to enter your Clerk User ID.

**Don't know your Clerk User ID?** See below 👇

---

## How to Find Your Clerk User ID

### Quick Method (Browser Console):

1. Open your app in browser
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Paste and run this:

```javascript
// Method 1: Check Clerk session
const token = document.cookie.split(';').find(c => c.includes('__session'))?.split('=')[1];
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Your Clerk User ID:', payload.sub);
}

// Method 2: Check localStorage (if using JWT)
Object.keys(localStorage).forEach(key => {
  if (key.includes('clerk')) {
    console.log(key, localStorage.getItem(key));
  }
});
```

5. Copy the User ID that appears

### Alternative: Check Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Select your app
3. Click "Users" in sidebar
4. Find your user
5. Click on it
6. Copy the "User ID" from the top

---

## After Getting Your User ID

Run this command with your actual User ID:

```bash
npx tsx prisma/seed-current-user.ts user_YOUR_CLERK_USER_ID
```

Replace `user_YOUR_CLERK_USER_ID` with your actual ID (usually starts with `user_`).

This will:
- ✅ Add you to allowed users
- ✅ Set generous development limits (100 requests/day, 500k tokens)
- ✅ Approve your account automatically
- ✅ Create usage tracking

---

## Restart Required

After either option, **restart your development server**:

```bash
# Stop the server (Ctrl+C)
# Then start it again
npm run dev
```

---

## Verify It Worked

After restarting, try to:
1. Open your app
2. Create or open a project
3. Send a message
4. Check if the error is gone! 🎉

---

## Still Having Issues?

### Check Database Connection
```bash
npx prisma db push
```

### Check Migrations
```bash
npx prisma migrate dev
```

### View Database
```bash
npx prisma studio
```

Then check the `allowed_users` table to see if your user exists.

---

## Development vs Production

### Development (Option 1)
- ✅ Fast and easy
- ✅ No database setup needed
- ⚠️ Must disable in production
- ⚠️ No usage tracking

### Production (Option 2)
- ✅ Production-ready
- ✅ Usage tracking enabled
- ✅ Quota enforcement working
- ⏱️ Requires user ID

**Recommendation:** Use Option 1 for quick testing, then switch to Option 2 for production.

---

## Summary

**Quickest Fix (30 seconds):**
```bash
# 1. Add to .env
echo "DISABLE_QUOTA_CHECK=true" >> .env

# 2. Restart server
# (Ctrl+C then npm run dev)
```

**Best Practice Fix (2 minutes):**
```bash
# 1. Get your Clerk User ID from browser console
# 2. Run the setup script
npx tsx prisma/quick-setup-user.ts

# 3. Restart server
```

---

## Need More Help?

See the full guide: [QUOTA_SYSTEM_SETUP.md](./QUOTA_SYSTEM_SETUP.md)

