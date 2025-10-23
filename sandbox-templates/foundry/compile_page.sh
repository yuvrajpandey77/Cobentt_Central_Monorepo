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

# Verify OpenZeppelin installation
echo "🔍 Verifying OpenZeppelin installation..."
if [ -d "lib/openzeppelin-contracts" ]; then
    echo "✅ OpenZeppelin contracts installed"
else
    echo "❌ OpenZeppelin contracts not found"
    exit 1
fi

# Verify remappings
echo "🔍 Verifying remappings..."
if grep -q "@openzeppelin/contracts" remappings.txt; then
    echo "✅ Remappings configured"
else
    echo "❌ Remappings not configured"
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
