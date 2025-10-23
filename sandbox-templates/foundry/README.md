# 🚀 E2B Foundry Template

A custom E2B sandbox template with Foundry pre-installed for Solidity development.

## 📁 Files Structure

```
sandbox-templates/foundry/
├── e2b.toml                    # E2B template configuration
├── e2b.Dockerfile              # Docker image with Foundry pre-installed
├── e2b-template-config.yaml    # Template configuration (alternative)
├── create-e2b-template.sh      # Automated template creation script
├── template-update-instructions.md # Code update instructions
├── SETUP_GUIDE.md              # Complete setup guide
└── README.md                   # This file
```

## 🎯 What's Included

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

## 🚀 Quick Setup

1. **Install E2B CLI:**
   ```bash
   npm install -g @e2b/cli
   ```

2. **Login to E2B:**
   ```bash
   e2b login
   ```

3. **Create the template:**
   ```bash
   chmod +x create-e2b-template.sh
   ./create-e2b-template.sh
   ```

4. **Update your code:**
   ```typescript
   // In src/inngest/functions.ts
   sandbox = await Sandbox.create("solidity-foundry-template");
   ```

## 🔧 Usage

After creating the template, you can use it in your code:

```typescript
import { Sandbox } from 'e2b'

// Create sandbox with Foundry pre-installed
const sandbox = await Sandbox.create('solidity-foundry-template')

// Foundry is ready to use immediately!
await sandbox.commands.run('forge --version')
await sandbox.commands.run('forge build')
```

## 📚 Documentation

- **`SETUP_GUIDE.md`** - Complete setup instructions
- **`template-update-instructions.md`** - Code update guide
- **`e2b-template-config.yaml`** - Alternative configuration format

## 🎉 Benefits

- **No installation failures** - Foundry is pre-installed
- **Instant compilation** - No download time
- **Reliable environment** - Same setup every time
- **All tools included** - Complete Solidity development stack

## 🔍 Testing

```bash
# Test the template
e2b template test solidity-foundry-template

# Verify Foundry tools
forge --version
cast --version
anvil --version
```

## 🛠️ Troubleshooting

If template creation fails:
1. Check E2B CLI version: `e2b --version`
2. Ensure you're logged in: `e2b whoami`
3. Check Docker is running (for local testing)
4. Verify E2B API key is valid

## 📝 Notes

- Template ID will be generated when created
- Update `e2b.toml` with the generated template ID
- Remove all installation code from your application
- Enjoy instant, reliable Solidity compilation! 🎉
