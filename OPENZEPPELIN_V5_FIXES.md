# OpenZeppelin v5 Compatibility Fixes

## Problem
The AI contract generator was creating contracts with OpenZeppelin v4 patterns that don't work in v5, causing compilation errors:

1. **Error: "Function has override specified but does not override anything"** - `_afterTokenTransfer()` doesn't exist in v5
2. **Error: "No arguments passed to the base constructor"** - `Ownable()` requires `initialOwner` parameter in v5
3. **Error: "Member '_afterTokenTransfer' not found"** - The hook was completely removed from v5

## Root Cause
OpenZeppelin v5 made breaking changes:
- Removed `_beforeTokenTransfer()` and `_afterTokenTransfer()` hooks
- Replaced them with a unified `_update()` hook
- Made `Ownable` constructor require an `initialOwner` parameter

## Solution Implemented

### 1. Updated Contract Generation Prompts (`src/lib/contract-prompts.ts`)

Added critical OpenZeppelin v5 rules at the top of the generation prompt:
- Explicitly state that `_afterTokenTransfer` and `_beforeTokenTransfer` were removed
- Explain the new `_update()` hook pattern for both ERC20 and ERC721
- Specify that `Ownable()` requires `msg.sender` parameter

Added comprehensive examples showing:
- ✅ **CORRECT** patterns with full code examples
- ❌ **INCORRECT** patterns that will cause compilation errors
- Hook patterns for ERC20, ERC721, Pausable, and Upgradeable contracts

### 2. Updated Forge Error Refiner (`src/inngest/ai-contract-generator.ts`)

Enhanced the AI agent that fixes compilation errors with:
- Explicit rules about removed hooks
- Common error patterns and their fixes
- Working example patterns for ERC20 and ERC721

### 3. Key Changes Summary

#### For ERC20 Contracts:
```solidity
// ❌ OLD (v4 - causes errors in v5)
constructor() ERC20("Token", "TKN") Ownable() {}

function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._afterTokenTransfer(from, to, amount);
}

// ✅ NEW (v5 - correct)
constructor() ERC20("Token", "TKN") Ownable(msg.sender) {
    _mint(msg.sender, 1000000 * 10**decimals());
}

function _update(address from, address to, uint256 amount) internal virtual override {
    super._update(from, to, amount);
    // Custom logic here
}
```

#### For ERC721 Contracts:
```solidity
// ❌ OLD (v4 - causes errors in v5)
constructor() ERC721("NFT", "NFT") Ownable() {}

function _afterTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
    super._afterTokenTransfer(from, to, tokenId);
}

// ✅ NEW (v5 - correct)
constructor() ERC721("NFT", "NFT") Ownable(msg.sender) {}

function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
    address from = super._update(to, tokenId, auth);
    // Custom logic here
    return from;
}
```

## Critical Rules for OpenZeppelin v5

1. ✅ **ALWAYS** pass `msg.sender` to `Ownable()` constructor: `Ownable(msg.sender)`
2. ✅ **ALWAYS** use `_update()` hook, **NEVER** `_beforeTokenTransfer` or `_afterTokenTransfer`
3. ✅ **ERC20 `_update` signature**: `function _update(address from, address to, uint256 amount)`
4. ✅ **ERC721 `_update` signature**: `function _update(address to, uint256 tokenId, address auth) returns (address)`
5. ✅ For upgradeable contracts, use `__Ownable_init(admin)` in `initialize()` function
6. ❌ **NEVER** use `constructor()` with upgradeable contracts - use `initialize()` instead
7. ❌ **NEVER** override `_burn()` when using `ERC721URIStorage` - it's handled internally
8. ✅ **ALWAYS** include all parent contracts in override lists for `supportsInterface` and `tokenURI`

## Testing
After these changes, the AI should generate contracts that:
- Compile successfully with Forge
- Use proper OpenZeppelin v5 patterns
- Don't trigger the three main compilation errors
- Follow modern Solidity best practices

## Files Modified
1. `src/lib/contract-prompts.ts` - Added v5 rules and comprehensive examples
2. `src/inngest/ai-contract-generator.ts` - Updated Forge error refiner with v5 patterns

## Expected Outcome
When users create smart contracts, the AI will now:
1. Generate v5-compatible code from the start
2. Automatically fix v5-related compilation errors during refinement
3. Avoid the three main errors that were occurring repeatedly
4. Produce working, compilable contracts consistently

