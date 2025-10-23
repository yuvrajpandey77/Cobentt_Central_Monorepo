# 🚀 E2B Custom Template Setup Guide

## Quick Setup (5 minutes)

### 1. Install E2B CLI
```bash
npm install -g @e2b/cli
# or
curl -fsSL https://e2b.dev/install.sh | sh
```

### 2. Login to E2B
```bash
e2b login
```

### 3. Create the Template
```bash
# Make the script executable
chmod +x create-e2b-template.sh

# Run the template creation script
./create-e2b-template.sh
```

### 4. Update Your Code
In `src/inngest/functions.ts`, replace:
```typescript
sandbox = await Sandbox.create("cogerphereailabsbeta1");
```

With:
```typescript
sandbox = await Sandbox.create("solidity-foundry-template");
```

### 5. Remove Installation Code
Since Foundry is pre-installed, you can remove all the installation logic:
- Remove the entire "Installing Foundry" section
- Remove system dependency installation
- Remove foundryup execution
- Keep only the compilation logic

## What's Included in the Template

✅ **Foundry Tools**:
- `forge` - Compiler and build tool
- `cast` - CLI for interacting with contracts
- `anvil` - Local testnet
- `chisel` - Solidity REPL

✅ **System Dependencies**:
- build-essential, libssl-dev, pkg-config
- curl, git, wget, tar, gzip
- nodejs, npm

✅ **Pre-configured Environment**:
- PATH includes Foundry binaries
- Working directory set to `/home/user/projects`
- User permissions configured

## Testing the Template

```bash
# Test the template
e2b template test solidity-foundry-template

# This will create a sandbox and you can verify:
forge --version
cast --version
anvil --version
```

## Benefits

🎯 **Reliability**: No more installation failures
⚡ **Speed**: Instant compilation (no download time)
🔧 **Consistency**: Same environment every time
🛡️ **Stability**: No dependency conflicts

## Troubleshooting

If template creation fails:
1. Check E2B CLI version: `e2b --version`
2. Ensure you're logged in: `e2b whoami`
3. Check Docker is running (for local testing)
4. Verify E2B API key is valid

## Next Steps

After creating the template:
1. Update your code to use the new template
2. Test contract compilation
3. Remove all installation-related code
4. Deploy and enjoy instant compilation! 🎉
