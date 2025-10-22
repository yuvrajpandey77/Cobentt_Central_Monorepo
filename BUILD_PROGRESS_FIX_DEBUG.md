# 🔧 BUILD PROGRESS FIX - DEBUGGING GUIDE

## ✅ **CRITICAL FIX APPLIED**

### **The Problem:**
- ❌ "Generate Contract" button clicked
- ❌ Project created successfully
- ❌ Build page shows: `{"error":"No build job found"}`
- ❌ Progress bar stuck at 0%
- ❌ No Inngest job running

### **Root Cause:**
The `createDapp` mutation was sending an Inngest event **WITHOUT creating a BuildJob first**.

The Inngest function expects a `buildJobId` but it was never created:
```typescript
// OLD (BROKEN):
await inngest.send({
  name: "contract/generate",
  data: {
    projectId: createdProject.id, // ❌ No buildJobId!
    contractType: input.contractType,
    // ...
  },
});
```

### **The Fix:**
Now creates BuildJob BEFORE sending Inngest event:
```typescript
// NEW (FIXED):
// 1. Create BuildJob
const buildJob = await prisma.buildJob.create({
  data: {
    projectId: createdProject.id,
    type: 'GENERATE',
    status: 'PENDING',
    progress: 0,
    currentStep: 'Queued for generation...',
  },
});

// 2. Send Inngest event WITH buildJobId
await inngest.send({
  name: "contract/generate",
  data: {
    buildJobId: buildJob.id, // ✅ Now has buildJobId!
    projectId: createdProject.id,
    // ...
  },
});
```

**File Fixed:** `src/modules/projects/server/procedures.ts`

---

## 🧪 **Test Again (Fresh Test)**

### **Step 1: Clear Previous Test Data**
```sql
-- Optional: Clean up failed attempts
-- Run in your database:
DELETE FROM "BuildJob" WHERE status = 'PENDING' AND "createdAt" < NOW() - INTERVAL '1 hour';
```

### **Step 2: Test the Flow**
```
1. Go to: http://localhost:3001/dapp-studio

2. Enter prompt: "create a test token"

3. Click "Generate Config"

4. Click through 4 steps

5. Click "Generate Contract"

6. WATCH FOR:
   ✅ "Creating Project..." loading state
   ✅ Toast: "Project created! Building contract..."
   ✅ Redirect to /projects/[id]/build
   
7. ON BUILD PAGE - Check immediately:
   ✅ Progress starts at 5-10% (not 0%)
   ✅ Current step shows: "Starting contract generation..."
   ✅ Logs start appearing within 5 seconds
   ✅ Progress increases over time
```

---

## 🔍 **Debugging Checklist**

### **If Build Page Still Shows Error:**

#### **Check 1: Database**
Open your database and check:
```sql
-- Check if project was created
SELECT * FROM "Project" ORDER BY "createdAt" DESC LIMIT 1;

-- Check if BuildJob was created
SELECT * FROM "BuildJob" ORDER BY "createdAt" DESC LIMIT 1;

-- Should see:
-- BuildJob with status='PENDING' or 'RUNNING'
-- BuildJob.projectId matches Project.id
```

#### **Check 2: Inngest Dashboard**
1. Open Inngest dashboard (if running locally)
2. Check for "contract/generate" event
3. Should see event with `buildJobId` in data
4. Check function execution status

#### **Check 3: Server Logs**
In your terminal where dev server is running, look for:
```
✅ GOOD:
- "Build job created: [uuid]"
- "Inngest event sent: contract/generate"
- "Generating contract..."

❌ BAD:
- Any error messages
- "No buildJobId provided"
- Database errors
```

#### **Check 4: Browser Console**
Open DevTools (F12), look for:
```
✅ GOOD:
- "Project created successfully"
- Redirect to /projects/[id]/build
- API calls to /api/projects/[id]/build-status
- Status 200 responses

❌ BAD:
- 404 errors
- 500 errors
- "No build job found"
- Network errors
```

#### **Check 5: Network Tab**
1. Open DevTools → Network tab
2. Click "Generate Contract"
3. Watch for:
   ```
   ✅ POST /api/trpc/projects.createDapp → Status 200
   ✅ GET /api/projects/[id]/build-status → Status 200
   ```

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: "No build job found"**
**Cause:** BuildJob wasn't created  
**Fix:** ✅ Already fixed in code!  
**Verify:** Check database for BuildJob record

### **Issue 2: Progress stuck at 0%**
**Cause:** Inngest function not running  
**Fix:** 
- Check Inngest is running
- Check E2B_API_KEY is set
- Restart dev server

### **Issue 3: Build status API returns 404**
**Cause:** Wrong project ID or route issue  
**Fix:** 
- Check URL in browser: `/projects/[valid-uuid]/build`
- Check API route exists: `/api/projects/[projectId]/build-status`

### **Issue 4: Inngest event not triggered**
**Cause:** Inngest not configured  
**Fix:**
```bash
# Check Inngest env vars
echo $INNGEST_EVENT_KEY
echo $INNGEST_SIGNING_KEY

# Restart dev server
npm run dev
```

---

## ✅ **Success Criteria (Updated)**

After the fix, you should see:

### **Immediately after clicking "Generate Contract":**
1. ✅ Button shows loading spinner
2. ✅ Toast notification appears
3. ✅ Redirects to build page within 2 seconds

### **On build page load:**
4. ✅ Progress shows 0-5% (not error)
5. ✅ "Queued for generation..." or "Starting..." message
6. ✅ Within 10 seconds, progress increases to 10-20%
7. ✅ Logs start appearing

### **Within 30 seconds:**
8. ✅ Progress reaches 30-50%
9. ✅ Log: "Installing OpenZeppelin dependencies..."
10. ✅ Source code starts appearing in editor

### **Within 90 seconds:**
11. ✅ Progress reaches 100%
12. ✅ All checkmarks are green
13. ✅ "Deploy Contract" button enabled

---

## 🔄 **If Still Not Working - Full Reset**

### **1. Stop dev server** (Ctrl+C)

### **2. Clear all pending jobs:**
```sql
UPDATE "BuildJob" 
SET status = 'FAILED', 
    currentStep = 'Cancelled for testing'
WHERE status IN ('PENDING', 'RUNNING');
```

### **3. Restart dev server:**
```bash
npm run dev
```

### **4. Hard refresh browser:**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### **5. Test again with fresh project**

---

## 📊 **Expected Flow (Correct)**

```
1. User clicks "Generate Contract"
   ↓
2. Frontend calls: createDapp mutation
   ↓
3. Backend creates:
   - Project record ✅
   - BuildJob record ✅ (NEW!)
   ↓
4. Backend sends Inngest event:
   {
     name: "contract/generate",
     data: {
       buildJobId: "[uuid]", ✅ (NEW!)
       projectId: "[uuid]",
       contractType: "ERC20",
       // ... other data
     }
   }
   ↓
5. Backend returns: createdProject
   ↓
6. Frontend redirects to: /projects/[id]/build
   ↓
7. Build page loads
   ↓
8. Build page polls: /api/projects/[id]/build-status
   ↓
9. API finds BuildJob ✅ (NEW!)
   ↓
10. Returns: { status: 'PENDING', progress: 0, ... }
    ↓
11. Inngest function starts processing
    ↓
12. Progress updates every few seconds
    ↓
13. Build completes at 100%
```

---

## 🎯 **Verification Commands**

Run these in your database to verify the fix worked:

### **Check latest project:**
```sql
SELECT id, name, "projectType", "contractType", "createdAt" 
FROM "Project" 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

### **Check BuildJob for that project:**
```sql
SELECT bj.id, bj."projectId", bj.type, bj.status, bj.progress, bj."currentStep", bj."createdAt"
FROM "BuildJob" bj
JOIN "Project" p ON bj."projectId" = p.id
WHERE p."projectType" = 'DAPP'
ORDER BY bj."createdAt" DESC
LIMIT 5;
```

**Expected result:**
- ✅ BuildJob exists
- ✅ BuildJob.projectId matches Project.id
- ✅ BuildJob.status is 'PENDING', 'RUNNING', or 'COMPLETED'
- ✅ BuildJob.progress is between 0-100

---

## 🚀 **You're Done When:**

✅ Click "Generate Contract"  
✅ No error message on build page  
✅ Progress bar starts animating  
✅ Logs appear within 10 seconds  
✅ Progress reaches 100%  
✅ Contract ready to deploy  

**The fix is applied! Test it now! 🎉**

