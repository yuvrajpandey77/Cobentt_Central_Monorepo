#!/bin/bash

echo "🚀 Starting Foundry development environment verification..."

# Source environment to ensure PATH is available
source ~/.bashrc 2>/dev/null || true
source ~/.profile 2>/dev/null || true

# Explicitly add Foundry to PATH for this script
export PATH="$PATH:$HOME/.foundry/bin"

# Verify Foundry Installation
echo "🔍 Verifying Foundry installation..."
if command -v forge &> /dev/null; then
    FORGE_VERSION=$(forge --version)
    echo "✅ Forge installed: $FORGE_VERSION"
else
    echo "❌ Forge not found in PATH"
    echo "Current PATH: $PATH"
    echo "Checking if foundry exists:"
    ls -la ~/.foundry/bin/ || echo "Foundry bin directory not found"
    exit 1
fi

# Verify hello_template project exists
echo "📦 Verifying hello_template project..."
if [ -d "/home/user/hello_template" ]; then
    echo "✅ hello_template project found"
    cd /home/user/hello_template
else
    echo "❌ hello_template project not found"
    exit 1
fi

# Verify library installations
echo "🔍 Verifying Solidity library installations..."

check_library() {
    if [ -d "$1" ]; then
        echo "✅ $2 installed"
        return 0
    else
        echo "⚠️  $2 not found (may not be required)"
        return 1
    fi
}

check_library "lib/openzeppelin-contracts" "OpenZeppelin contracts"
check_library "lib/openzeppelin-contracts-upgradeable" "OpenZeppelin upgradeable contracts"
check_library "lib/openzeppelin-contracts/governance" "OpenZeppelin governance"
check_library "lib/solmate" "Solmate library"
check_library "lib/prb-math" "PRB Math"
check_library "lib/v3-core" "Uniswap V3 Core"
check_library "lib/v3-periphery" "Uniswap V3 Periphery"

# Verify critical remappings
echo "🔍 Verifying critical remappings..."
if grep -q "@openzeppelin/contracts" remappings.txt && grep -q "@openzeppelin/contracts-upgradeable" remappings.txt; then
    echo "✅ Critical remappings configured"
else
    echo "❌ Critical remappings not configured properly"
    exit 1
fi

# Test compilation
echo "🔨 Testing contract compilation..."
if forge build; then
    echo "✅ Contract compilation successful!"
else
    echo "❌ Contract compilation failed"
    exit 1
fi

# Verify artifacts
echo "🔍 Verifying compilation artifacts..."
if [ -d "out" ] && [ -f "out/Contract.sol/Contract.json" ]; then
    echo "✅ Compilation artifacts created successfully"
    echo "📄 Artifact details:"
    ls -la out/Contract.sol/
else
    echo "❌ Compilation artifacts not found"
    echo "Checking out directory:"
    ls -la out/ || echo "out directory not found"
    exit 1
fi

# Test forge remappings command
echo "🧪 Testing forge remappings..."
if forge remappings &> /dev/null; then
    echo "✅ Forge remappings working"
    forge remappings
else
    echo "❌ Forge remappings failed"
    exit 1
fi

echo "🎉 Foundry development environment verification complete!"
echo ""
echo "📋 Environment Summary:"
echo "  - Forge: $FORGE_VERSION"
echo "  - Project: hello_template"
echo "  - OpenZeppelin: ✅ Installed"
echo "  - Remappings: ✅ Configured"
echo "  - Compilation: ✅ Working"
echo "  - Artifacts: ✅ Generated"
echo ""
echo "🚀 Ready for Solidity development!"
