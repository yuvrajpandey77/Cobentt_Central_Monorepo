#!/bin/bash
# Script to create and publish E2B custom template with Foundry

set -e

echo "🚀 Creating E2B Custom Template with Foundry..."

# Check if E2B CLI is installed
if ! command -v e2b &> /dev/null; then
    echo "❌ E2B CLI not found. Please install it first:"
    echo "   npm install -g @e2b/cli"
    echo "   or"
    echo "   curl -fsSL https://e2b.dev/install.sh | sh"
    exit 1
fi

# Login to E2B (if not already logged in)
echo "🔐 Checking E2B authentication..."
if ! e2b auth info &> /dev/null; then
    echo "Please login to E2B:"
    e2b auth login
fi

# Create the template
echo "📦 Creating template..."
e2b template build --name "solidity-foundry-template"

echo "✅ Template created successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Update your code to use the new template:"
echo "   const sandbox = await e2b.sandbox.create({"
echo "     template: 'solidity-foundry-template'"
echo "   });"
echo ""
echo "2. Test the template:"
echo "   e2b sandbox create solidity-foundry-template"
echo ""
echo "3. The template includes:"
echo "   ✅ Foundry (forge, cast, anvil)"
echo "   ✅ Node.js and npm"
echo "   ✅ All required system dependencies"
echo "   ✅ Pre-configured environment"
