# 🧪 Dapp Builder Testing Guide

## ✅ Setup Checklist

Before testing, make sure you have:
- [ ] Added `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` to `.env`
- [ ] MetaMask or another Web3 wallet installed
- [ ] Added Sepolia testnet to your wallet
- [ ] Got testnet ETH from faucet

---

## 🚀 Quick Test (15 minutes)

### **Step 1: Get WalletConnect Project ID** (5 min)

1. Go to https://cloud.walletconnect.com/
2. Sign up or log in
3. Click "New Project"
4. Enter name: "Cogerphere Test"
5. Copy the Project ID
6. Open your `.env` file and add:
   ```
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="paste_your_project_id_here"
   ```
7. Save the file

### **Step 2: Start Development Server** (1 min)

```bash
npm run dev
```

### **Step 3: Setup MetaMask for Sepolia** (3 min)

1. Open MetaMask
2. Click network dropdown at top
3. Enable "Show test networks" in settings if needed
4. Select "Sepolia test network"
5. Copy your wallet address

### **Step 4: Get Test ETH** (5 min)

Visit any of these faucets:
- https://sepoliafaucet.com/ (Requires Alchemy account)
- https://faucet.quicknode.com/ethereum/sepolia
- https://www.infura.io/faucet/sepolia

Paste your wallet address and request testnet ETH.
Wait 1-2 minutes for it to arrive.

### **Step 5: Test Dapp Builder** (15 min)

1. **Create Dapp Project**:
   - Go to http://localhost:3000
   - Toggle mode to "Smart Contract"
   - Fill in the Dapp Studio form:
     - Platform: Ethereum
     - Contract Type: ERC-20 Token
     - Token Name: "TestToken"
     - Token Symbol: "TEST"
     - Total Supply: "1000000"
     - Network: Testnet
   - Click "Deploy dApp"

2. **Wait for Contract Generation**:
   - Check Inngest dashboard for job status
   - Should see "contract/generate" event complete
   - Takes 30-60 seconds

3. **Navigate to Deploy Page**:
   - Click on your project
   - Click "Deploy" button
   - Or go to `/projects/{your-project-id}/deploy`

4. **Step 1 - Connect Wallet**:
   - Click "Connect Wallet"
   - Select MetaMask
   - Approve connection
   - Should see your wallet address

5. **Step 2 - Check Balance**:
   - Should show your Sepolia ETH balance
   - If balance > 0.001 ETH, continue button appears
   - If balance too low, use faucet links

6. **Step 3 - Deploy Contract**:
   - Click "Deploy Contract"
   - MetaMask popup appears
   - Review gas estimate
   - Click "Confirm"
   - Wait for transaction to confirm
   - Should see contract address displayed

7. **Step 4 - Verify Contract**:
   - Verification runs automatically
   - Check console for verification status
   - Get link to Sepolia Etherscan

8. **Verify on Etherscan**:
   - Open https://sepolia.etherscan.io/
   - Paste your contract address
   - Should see your deployed contract
   - Check if source code is verified (if you added ETHERSCAN_API_KEY)

---

## 🔍 Detailed Testing Scenarios

### **Scenario 1: ERC-20 Token**

**Expected Behavior**:
- Contract generated with mintable/burnable features if selected
- Deploys successfully with initial supply
- Verification passes if API key present

**Test**:
```
1. Create ERC-20 project
2. Enable "Mintable" and "Burnable" features
3. Deploy to Sepolia
4. Check token balance on Etherscan
5. Verify contract code is visible
```

### **Scenario 2: ERC-721 NFT**

**Expected Behavior**:
- NFT contract with URI storage
- Can mint NFTs after deployment
- OpenSea compatible

**Test**:
```
1. Create ERC-721 project
2. Token Name: "TestNFT"
3. Symbol: "TNFT"
4. Deploy to Sepolia
5. Check on OpenSea testnet
```

### **Scenario 3: Error Handling**

**Test User Rejection**:
```
1. Start deployment
2. Reject MetaMask transaction
3. Should see error: "Transaction was rejected"
4. Can retry deployment
```

**Test Insufficient Balance**:
```
1. Use wallet with 0 ETH
2. Try to deploy
3. Should see error about insufficient funds
4. Faucet button appears
```

**Test Network Mismatch**:
```
1. Create Sepolia project
2. Switch MetaMask to Mainnet
3. Try to connect wallet
4. Should prompt to switch network
```

---

## 📊 What to Check

### **In Browser Console**:
```javascript
// Should see:
"Contract deployed at: 0x..."
"Transaction hash: 0x..."
"Compilation successful"
```

### **In Inngest Dashboard**:
```
Events:
✅ contract/generate - Completed
✅ contract/verify - Completed (or Failed if no API key)
```

### **On Sepolia Etherscan**:
```
✅ Contract address exists
✅ Transaction confirmed
✅ Contract balance: 0 ETH
✅ Token total supply matches input
✅ Source code verified (if API key added)
```

### **In Database**:
```sql
-- Check build jobs
SELECT id, type, status FROM "BuildJob" ORDER BY "createdAt" DESC LIMIT 5;

-- Should show:
-- GENERATE - COMPLETED
-- COMPILE  - COMPLETED
-- DEPLOY   - COMPLETED
-- VERIFY   - COMPLETED or FAILED
```

---

## 🐛 Troubleshooting

### **Issue: "No projectId found" Error**

**Cause**: Missing WalletConnect Project ID

**Solution**:
```bash
# Add to .env:
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your_id_here"

# Restart server:
npm run dev
```

### **Issue: Wallet Won't Connect**

**Cause**: Browser cache or wrong network

**Solution**:
```
1. Clear browser cache
2. Disconnect wallet from site in MetaMask
3. Refresh page
4. Try again
```

### **Issue: Contract Not Deploying**

**Cause**: Various reasons

**Check**:
```
1. Is wallet connected?
2. Is Sepolia selected in MetaMask?
3. Do you have enough testnet ETH?
4. Check browser console for errors
5. Check Inngest logs for build job failures
```

### **Issue: Verification Failing**

**Expected**: Verification will fail without API key

**Solution** (Optional):
```
1. Get API key from https://etherscan.io/myapikey
2. Add to .env:
   ETHERSCAN_API_KEY="your_api_key"
3. Restart server
4. Deploy new contract
```

### **Issue: Compilation Failing**

**Cause**: OpenZeppelin installation in E2B sandbox

**Check**:
```
1. Check Inngest logs
2. Look for "npm install @openzeppelin/contracts" step
3. If failing, check E2B_API_KEY is valid
4. Try deploying again (sometimes sandbox timeout)
```

---

## ✅ Success Criteria

Your Dapp Builder is working correctly if:

- [ ] Wallet connects successfully
- [ ] Balance displays correctly
- [ ] Contract generates and compiles
- [ ] MetaMask transaction popup appears
- [ ] Transaction confirms on blockchain
- [ ] Contract address is extracted and displayed
- [ ] Contract appears on Sepolia Etherscan
- [ ] Can view transaction details
- [ ] Error messages are user-friendly
- [ ] Can deploy multiple contracts

---

## 📈 Performance Benchmarks

**Expected Times**:
- Contract Generation: 30-60 seconds
- Contract Compilation: 20-40 seconds (OpenZeppelin install)
- Transaction Confirmation: 10-30 seconds (Sepolia)
- Verification Submission: 5-10 seconds

**Total End-to-End**: ~2-3 minutes from "Create Project" to "Verified Contract"

---

## 🎯 Advanced Testing

### **Test Multiple Contract Types**:
```
- [ ] ERC-20 Token
- [ ] ERC-721 NFT
- [ ] ERC-1155 Multi-Token
- [ ] Payment Splitter
```

### **Test Different Features**:
```
- [ ] Mintable tokens
- [ ] Burnable tokens
- [ ] Pausable contracts
- [ ] Access control
```

### **Test Different Networks**:
```
- [ ] Ethereum Sepolia
- [ ] Polygon Mumbai  
- [ ] Arbitrum Sepolia
- [ ] Optimism Sepolia
```

---

## 📝 Test Report Template

```
Date: ___________
Tester: __________

Contract Type: __________
Network: __________
Features Enabled: __________

Results:
[ ] Project creation: PASS / FAIL
[ ] Contract generation: PASS / FAIL
[ ] Wallet connection: PASS / FAIL
[ ] Balance check: PASS / FAIL
[ ] Deployment: PASS / FAIL
[ ] Address extraction: PASS / FAIL
[ ] Verification: PASS / FAIL / SKIPPED

Contract Address: 0x___________
Transaction Hash: 0x___________
Etherscan Link: https://sepolia.etherscan.io/address/0x___________

Issues Found:
_______________________
_______________________

Notes:
_______________________
_______________________
```

---

## 🎉 Next Steps After Testing

Once testing is successful:

1. **Production Deployment**:
   - Get WalletConnect Production Project ID
   - Get Mainnet RPC URLs (Alchemy/Infura)
   - Set up monitoring (Sentry, etc.)
   - Deploy to Vercel/production

2. **User Documentation**:
   - Create user guide
   - Record tutorial videos
   - Add tooltips in UI

3. **Advanced Features**:
   - Add contract interaction UI
   - Generate frontend scaffold
   - Add testing suite generation
   - Implement gas estimation

---

## 🆘 Support

If you encounter issues during testing:

1. Check browser console
2. Check Inngest dashboard
3. Check database for build jobs
4. Review error messages carefully
5. Refer to WORKFLOW_AND_NEXT_STEPS.md

Happy Testing! 🚀

