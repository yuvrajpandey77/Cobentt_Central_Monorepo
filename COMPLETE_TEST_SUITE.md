# 🧪 COMPLETE TEST SUITE FOR DAPP BUILDER

## 🎯 **Test Environment Setup**

### **Prerequisites:**
- ✅ Dev server running on http://localhost:3001
- ✅ Database connected (PostgreSQL)
- ✅ Inngest running
- ✅ E2B API key configured
- ✅ All dependencies installed

### **Environment Variables Required:**
```env
DATABASE_URL="postgresql://..."
CLERK_SECRET_KEY="sk_test_..."
OPENAI_API_KEY="sk-..."
INNGEST_EVENT_KEY="..."
E2B_API_KEY="..."
```

---

## 📋 **TEST SUITE 1: Form Functionality**

### **Test 1.1: Load Dapp Studio Page**
**Steps:**
1. Open http://localhost:3001
2. Click "Smart Contract" toggle OR navigate to `/dapp-studio`

**Expected Result:**
- ✅ Page loads without errors
- ✅ "Describe Your Smart Contract" heading visible
- ✅ AI prompt input field visible
- ✅ 6 example prompts shown
- ✅ Feature cards displayed

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 1.2: AI Prompt Analysis**
**Steps:**
1. Enter prompt: "I want to create a loyalty token for my coffee shop"
2. Click "Generate Config" or press Ctrl+Enter

**Expected Result:**
- ✅ "Analyzing..." loading state shows
- ✅ After 1-2 seconds, redirects to form
- ✅ Form is pre-filled with:
  - Blockchain: Ethereum
  - Contract Type: ERC-20
  - Token Name: "Loyalty Token"
  - Token Symbol: "LOYAL"
  - Supply: "1000000"
  - Decimals: "18"
  - Features: mintable, burnable

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 1.3: Manual Form Fill (4 Steps)**

**Step 1: Platform**
1. Select blockchain: Ethereum
2. Select contract type: ERC-20 Token
3. Click "Next"

**Expected:**
- ✅ Both selections are highlighted in blue
- ✅ "Next" button is enabled
- ✅ Advances to Step 2

**Step 2: Configuration**
1. Enter Token Name: "TestToken"
2. Enter Symbol: "TEST"
3. Enter Total Supply: "1000000"
4. Enter Decimals: "18"
5. Select Network: "Testnet"
6. Click "Next"

**Expected:**
- ✅ All fields accept input
- ✅ Validation works (min 2 chars for name/symbol)
- ✅ Advances to Step 3

**Step 3: Features**
1. Check "Mintable"
2. Check "Burnable"
3. Click "Next"

**Expected:**
- ✅ Checkboxes toggle correctly
- ✅ Advances to Step 4

**Step 4: Review**
1. Verify all configuration is shown
2. Check "Auto-verify on Etherscan" is checked
3. Check "Generate test suite" as needed
4. Click "Generate Contract" **← THIS BUTTON SHOULD NOW BE CLICKABLE**

**Expected:**
- ✅ Summary shows all entered data
- ✅ "What happens next?" section visible
- ✅ **"Generate Contract" button is ENABLED and CLICKABLE**
- ✅ Click triggers form submission

**Status:** [ ] PASS / [ ] FAIL

---

## 📋 **TEST SUITE 2: Project Creation & Build Page**

### **Test 2.1: Project Creation**
**Steps:**
1. After clicking "Generate Contract" on Step 4

**Expected Result:**
- ✅ Button shows "Creating Project..." with spinner
- ✅ Toast notification: "Project created! Building contract..."
- ✅ **Redirects to `/projects/[id]/build`** within 2 seconds
- ✅ No errors in console

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 2.2: Build Page Load**
**Steps:**
1. Verify build page renders after redirect

**Expected Result:**
- ✅ Page title shows token name (e.g., "TestToken (TEST)")
- ✅ Status badge shows "Building..." with spinner
- ✅ Left side shows configuration summary
- ✅ Right side shows Monaco editor
- ✅ Progress bar at 0-5%
- ✅ Build logs section visible

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 2.3: Real-time Progress Updates**
**Steps:**
1. Watch the build page for 60-90 seconds
2. Observe progress bar and logs

**Expected Timeline:**
```
0s   → 5%   "Starting contract generation..."
5s   → 10%  "Generating contract from template..."
10s  → 20%  "Contract generated ✅"
15s  → 30%  "Initializing build environment..."
20s  → 35%  "Setting up npm project..."
25s  → 40%  "Installing OpenZeppelin dependencies..."
55s  → 50%  "Dependencies installed ✅"
60s  → 60%  "Installing Solidity compiler..."
70s  → 70%  "Compiling contract..."
80s  → 85%  "Parsing compilation output..."
85s  → 95%  "Compilation successful! ✅"
90s  → 100% "Build complete! Ready to deploy 🎉"
```

**Expected Result:**
- ✅ Progress bar animates smoothly
- ✅ Logs appear with timestamps: `[12:34:56] Log message`
- ✅ Build steps show checkmarks when complete:
  - ✅ Contract Generated
  - ✅ Dependencies Installed
  - ✅ Contract Compiled
  - ✅ Artifacts Ready
- ✅ Status badge changes from "Building..." to "Ready"
- ✅ Entire process completes in 60-120 seconds

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 2.4: Monaco Editor Functionality**
**Steps:**
1. Wait for source code to appear in editor (at ~20% progress)
2. Try editing the code
3. Click on tabs: Source / ABI / Bytecode

**Expected Result:**
- ✅ Solidity code appears with syntax highlighting
- ✅ Line numbers visible
- ✅ **Code is EDITABLE** (can type, delete, paste)
- ✅ Tab "Source Code" shows .sol file
- ✅ Tab "ABI" shows JSON (appears at 100%)
- ✅ Tab "Bytecode" shows hex (appears at 100%)
- ✅ All tabs are read-only except Source

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 2.5: Download Artifacts**
**Steps:**
1. Wait for build to reach 100%
2. Click "Download Artifacts" button

**Expected Result:**
- ✅ JSON file downloads: `TestToken-artifacts.json`
- ✅ File contains:
  ```json
  {
    "sourceCode": "// SPDX-License-Identifier: MIT...",
    "abi": [...],
    "bytecode": "0x..."
  }
  ```
- ✅ ABI array has functions
- ✅ Bytecode starts with "0x"

**Status:** [ ] PASS / [ ] FAIL

---

## 📋 **TEST SUITE 3: Deploy Integration**

### **Test 3.1: Deploy Button Activation**
**Steps:**
1. Wait for build to complete (100%)
2. Check "Deploy Contract" button

**Expected Result:**
- ✅ Button becomes enabled (not grayed out)
- ✅ Button shows rocket icon + "Deploy Contract"
- ✅ Click redirects to `/projects/[id]/deploy`

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 3.2: Deploy Wizard Flow**
**Steps:**
1. Click "Deploy Contract"
2. Follow 4-step wizard

**Expected Result:**
- ✅ Step 1: Connect Wallet (WalletConnect/MetaMask)
- ✅ Step 2: Check Balance (shows ETH balance)
- ✅ Step 3: Deploy Contract (triggers MetaMask)
- ✅ Step 4: Contract Deployed (shows address)

**Status:** [ ] PASS / [ ] FAIL

---

## 📋 **TEST SUITE 4: Error Handling**

### **Test 4.1: Network Error During Build**
**Steps:**
1. Start build process
2. Disconnect internet at 50%
3. Reconnect after 10 seconds

**Expected Result:**
- ✅ Build page shows error state
- ✅ "Retry" option appears (or auto-retries)
- ✅ No crash or white screen

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 4.2: Compilation Failure**
**Steps:**
1. Create project with invalid configuration
2. Watch build process

**Expected Result:**
- ✅ Build fails at compilation step
- ✅ Error message shows in logs
- ✅ Status shows "Failed" badge
- ✅ User can go back or retry

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 4.3: Page Refresh During Build**
**Steps:**
1. Start build process
2. Wait until 50% progress
3. Refresh the page (F5)

**Expected Result:**
- ✅ Page reloads
- ✅ Progress resumes from last saved state
- ✅ Logs persist
- ✅ Polling reconnects automatically

**Status:** [ ] PASS / [ ] FAIL

---

## 📋 **TEST SUITE 5: All Contract Types**

### **Test 5.1: ERC-20 Token**
**Config:**
- Blockchain: Ethereum
- Type: ERC-20
- Features: Mintable, Burnable

**Expected:**
- ✅ Generates OpenZeppelin ERC20 contract
- ✅ Includes mint() and burn() functions
- ✅ Compiles successfully
- ✅ ABI has ~15 functions

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 5.2: ERC-721 NFT**
**Config:**
- Blockchain: Ethereum
- Type: ERC-721
- Features: Mintable, Burnable

**Expected:**
- ✅ Generates OpenZeppelin ERC721 contract
- ✅ Includes safeMint() function
- ✅ Compiles successfully
- ✅ ABI has NFT functions (mint, tokenURI, etc.)

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 5.3: ERC-1155 Multi-Token**
**Config:**
- Blockchain: Ethereum
- Type: ERC-1155
- Features: Mintable

**Expected:**
- ✅ Generates OpenZeppelin ERC1155 contract
- ✅ Supports batch operations
- ✅ Compiles successfully

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 5.4: Payment Splitter**
**Config:**
- Blockchain: Ethereum
- Type: Payment Splitter

**Expected:**
- ✅ Generates PaymentSplitter contract
- ✅ Includes release() functions
- ✅ Compiles successfully

**Status:** [ ] PASS / [ ] FAIL

---

## 📋 **TEST SUITE 6: Multi-Chain Support**

### **Test 6.1: Polygon**
**Steps:**
1. Select "Polygon" blockchain
2. Create ERC-20 token
3. Complete build

**Expected:**
- ✅ Build completes successfully
- ✅ Verification uses Polygonscan API
- ✅ Can deploy to Polygon Mumbai testnet

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 6.2: Arbitrum**
**Steps:**
1. Select "Arbitrum" blockchain
2. Create ERC-20 token
3. Complete build

**Expected:**
- ✅ Build completes successfully
- ✅ Verification uses Arbiscan API
- ✅ Can deploy to Arbitrum Sepolia

**Status:** [ ] PASS / [ ] FAIL

---

## 📋 **TEST SUITE 7: Edge Cases**

### **Test 7.1: Very Long Token Name**
**Input:** "ThisIsAVeryLongTokenNameThatExceedsNormalLengthsToTestValidation"

**Expected:**
- ✅ Validation error appears
- ✅ Cannot proceed to next step
- ✅ Error message is clear

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 7.2: Special Characters in Token Name**
**Input:** "Test<script>alert('xss')</script>Token"

**Expected:**
- ✅ Input is sanitized
- ✅ No XSS vulnerability
- ✅ Contract generates safely

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 7.3: Multiple Builds for Same Project**
**Steps:**
1. Create project
2. Complete build
3. Trigger another build for same project

**Expected:**
- ✅ New build job created
- ✅ Previous build history preserved
- ✅ Latest build shown on build page

**Status:** [ ] PASS / [ ] FAIL

---

## 📋 **TEST SUITE 8: Performance Tests**

### **Test 8.1: Page Load Time**
**Measurement:** Time from URL entry to page interactive

**Expected:**
- ✅ Homepage: < 2 seconds
- ✅ Dapp Studio: < 2 seconds
- ✅ Build Page: < 2 seconds
- ✅ Monaco Editor: < 1 second

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 8.2: Build Time**
**Measurement:** Total time from "Generate" click to 100% complete

**Expected:**
- ✅ ERC-20: 60-90 seconds
- ✅ ERC-721: 60-90 seconds
- ✅ ERC-1155: 60-90 seconds
- ✅ Never exceeds 120 seconds

**Status:** [ ] PASS / [ ] FAIL

---

### **Test 8.3: Polling Performance**
**Measurement:** Check network tab for API calls

**Expected:**
- ✅ Build status polled every 2 seconds
- ✅ No redundant calls
- ✅ Polling stops when build completes
- ✅ No memory leaks

**Status:** [ ] PASS / [ ] FAIL

---

## 📋 **CRITICAL PATH TEST (E2E)**

### **Complete User Journey:**

**Start:** User wants to create a token  
**End:** Contract deployed on blockchain

**Steps:**
1. [ ] Open app (localhost:3001)
2. [ ] Toggle to "Smart Contract" mode
3. [ ] Enter AI prompt OR click Dapp Studio
4. [ ] Fill 4-step form
5. [ ] Click "Generate Contract" (MUST BE CLICKABLE)
6. [ ] Redirect to build page
7. [ ] Watch progress 0% → 100%
8. [ ] View source code in Monaco editor
9. [ ] Edit code (optional)
10. [ ] Download artifacts
11. [ ] Click "Deploy Contract"
12. [ ] Connect MetaMask wallet
13. [ ] Select Sepolia testnet
14. [ ] Get testnet ETH (if needed)
15. [ ] Confirm deployment in MetaMask
16. [ ] See deployed contract address
17. [ ] View on Sepolia Etherscan
18. [ ] Contract is verified (if API key present)

**Total Time:** ~5 minutes (excluding OpenZeppelin install wait)

**Status:** [ ] PASS / [ ] FAIL

---

## 🐛 **Known Issues to Test**

1. [ ] "Generate Contract" button clickability (FIXED)
2. [ ] Form validation on AI-filled values
3. [ ] Refresh during build state persistence
4. [ ] Multiple simultaneous builds
5. [ ] Very large token supplies (overflow check)
6. [ ] Network timeout handling
7. [ ] Inngest job failure recovery
8. [ ] Database connection loss
9. [ ] E2B sandbox timeout
10. [ ] MetaMask rejection handling

---

## ✅ **TEST COMPLETION CHECKLIST**

### **Form Tests:**
- [ ] Test 1.1 - 1.3: All form tests pass

### **Build Page Tests:**
- [ ] Test 2.1 - 2.5: All build page tests pass

### **Deploy Tests:**
- [ ] Test 3.1 - 3.2: Deploy integration works

### **Error Tests:**
- [ ] Test 4.1 - 4.3: Errors handled gracefully

### **Contract Types:**
- [ ] Test 5.1 - 5.4: All contract types work

### **Multi-Chain:**
- [ ] Test 6.1 - 6.2: Multiple chains supported

### **Edge Cases:**
- [ ] Test 7.1 - 7.3: Edge cases handled

### **Performance:**
- [ ] Test 8.1 - 8.3: Performance is acceptable

### **Critical Path:**
- [ ] E2E test passes completely

---

## 📊 **TEST RESULTS SUMMARY**

**Date:** __________  
**Tester:** __________  
**Environment:** Dev (localhost:3001)

**Results:**
- Total Tests: 30+
- Passed: _____ / _____
- Failed: _____ / _____
- Skipped: _____ / _____

**Critical Issues Found:**
1. _________________________
2. _________________________
3. _________________________

**Minor Issues Found:**
1. _________________________
2. _________________________

**Overall Status:** [ ] READY FOR PRODUCTION / [ ] NEEDS FIXES

---

## 🚀 **Quick Smoke Test (5 minutes)**

For rapid testing, run this minimal flow:

1. ✅ Open /dapp-studio
2. ✅ Use AI prompt: "Create loyalty token"
3. ✅ Click through 4 steps
4. ✅ **Verify "Generate Contract" button is CLICKABLE**
5. ✅ Click and wait for redirect
6. ✅ Watch progress reach 100%
7. ✅ Verify source code appears
8. ✅ Click "Deploy Contract"
9. ✅ Connect wallet (can cancel after)

**If all 9 steps work → Core functionality is working! ✅**

---

**Start testing now and report any issues! 🧪**

