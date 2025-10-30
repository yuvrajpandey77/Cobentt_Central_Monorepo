# Cogerphere Dapp Builder - Environment Setup Guide

## 📋 Required Environment Variables

### **1. WalletConnect Project ID** ⚡ (REQUIRED - 5 minutes)

**Why**: Required for wallet connection (MetaMask, WalletConnect, etc.)

**How to get it**:
1. Go to https://cloud.walletconnect.com/
2. Sign up or log in
3. Click "Create Project"
4. Enter project name: "Cogerosphere Dapp Builder"
5. Copy the "Project ID"

**Add to your `.env` file**:
```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="abc123def456..."
```

---

### **2. Etherscan API Key** (RECOMMENDED - 5 minutes)

**Why**: Needed for contract verification on block explorers

**How to get it**:

#### For Ethereum Sepolia (Testnet):
1. Go to https://etherscan.io/
2. Sign up/login
3. Go to https://etherscan.io/myapikey
4. Create new API key
5. Copy the key

#### For Other Networks:
- **Polygon**: https://polygonscan.com/myapikey
- **Arbitrum**: https://arbiscan.io/myapikey
- **Optimism**: https://optimistic.etherscan.io/myapikey

**Add to your `.env` file**:
```env
ETHERSCAN_API_KEY="ABCD1234EFGH5678..."
POLYGONSCAN_API_KEY="..."
ARBISCAN_API_KEY="..."
OPTIMISTIC_ETHERSCAN_API_KEY="..."
```

---

### **3. RPC URLs** (OPTIONAL - Better Performance)

**Why**: Faster and more reliable blockchain connections

**Options**:
- **Alchemy** (Recommended): https://www.alchemy.com/
- **Infura**: https://www.infura.io/
- **QuickNode**: https://www.quicknode.com/

**How to get from Alchemy**:
1. Go to https://www.alchemy.com/
2. Sign up (free plan available)
3. Create new app
4. Select network (e.g., "Ethereum Sepolia")
5. Copy the HTTPS URL

**Add to your `.env` file**:
```env
NEXT_PUBLIC_ETHEREUM_RPC="https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY"
NEXT_PUBLIC_POLYGON_RPC="https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY"
NEXT_PUBLIC_SEPOLIA_RPC="https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY"
```

---

## 🎯 Complete .env Template

Create a `.env` file in your project root with these variables:

```env
# ===================================
# EXISTING VARIABLES (Already set)
# ===================================
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
OPENAI_API_KEY="sk-..."
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
E2B_API_KEY="..."

# ===================================
# NEW VARIABLES (Add these)
# ===================================

# REQUIRED: WalletConnect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your_project_id_here"

# RECOMMENDED: Etherscan API Keys
ETHERSCAN_API_KEY="your_etherscan_api_key"
POLYGONSCAN_API_KEY="your_polygonscan_api_key"
ARBISCAN_API_KEY="your_arbiscan_api_key"
OPTIMISTIC_ETHERSCAN_API_KEY="your_optimistic_etherscan_api_key"

# OPTIONAL: Custom RPC URLs
NEXT_PUBLIC_ETHEREUM_RPC="https://eth-mainnet.g.alchemy.com/v2/your-api-key"
NEXT_PUBLIC_POLYGON_RPC="https://polygon-mainnet.g.alchemy.com/v2/your-api-key"
NEXT_PUBLIC_SEPOLIA_RPC="https://eth-sepolia.g.alchemy.com/v2/your-api-key"

# Environment
NODE_ENV="development"
NEXT_PUBLIC_ENABLE_TESTNETS="true"
```

---

## 🚀 Quick Start

### **Minimum Setup (To Test Locally)**:

1. **Copy your existing `.env` file**
2. **Add only this line**:
   ```env
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="YOUR_PROJECT_ID"
   ```
3. **Restart your dev server**:
   ```bash
   npm run dev
   ```

### **Full Production Setup**:

1. Get WalletConnect Project ID
2. Get Etherscan API keys
3. (Optional) Get RPC URLs from Alchemy
4. Add all to `.env`
5. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```
6. Start server:
   ```bash
   npm run dev
   ```

---

## ✅ Verification

After adding environment variables, verify they're loaded:

```bash
# In your terminal
node -e "console.log(process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID)"
```

You should see your Project ID printed.

---

## ⚠️ Important Notes

### **Security**:
- **NEVER** commit your `.env` file to Git
- `.env` is already in `.gitignore`
- Only share `.env.example` (without real values)

### **Required vs Optional**:
- **REQUIRED**: `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- **RECOMMENDED**: Etherscan API keys (for verification)
- **OPTIONAL**: Custom RPC URLs (for performance)

### **Testnet First**:
- Always test on Sepolia testnet first
- Get free test ETH: https://sepoliafaucet.com/
- Verify on Sepolia Etherscan: https://sepolia.etherscan.io/

---

## 🔧 Troubleshooting

### **"No projectId found" Error**:
**Problem**: WalletConnect Project ID is missing  
**Solution**: Add `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` to `.env` and restart server

### **Wallet Won't Connect**:
**Problem**: RainbowKit can't initialize  
**Solution**: Check that Project ID is correct and starts with a valid format

### **Contract Verification Fails**:
**Problem**: No Etherscan API key  
**Solution**: Add `ETHERSCAN_API_KEY` to `.env`

### **Slow RPC Responses**:
**Problem**: Using public RPC endpoints  
**Solution**: Get dedicated RPC URLs from Alchemy/Infura

---

## 📚 Resources

- **WalletConnect Docs**: https://docs.walletconnect.com/
- **Etherscan API Docs**: https://docs.etherscan.io/
- **Alchemy Docs**: https://docs.alchemy.com/
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Sepolia Explorer**: https://sepolia.etherscan.io/

---

## 🎉 You're Ready!

Once you've added at minimum the `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, your Dapp Builder is ready to:
- ✅ Connect wallets
- ✅ Deploy smart contracts
- ✅ Interact with blockchains
- ✅ Track transactions

**Happy Building! 🚀**

