# ✅ Smart Contract Builder Prompt Improvements Complete

## 📋 Summary
Updated the AI prompt for smart contract generation to prevent common compilation errors and ensure contracts compile on the first try.

## 🔍 What Was Improved

### 1. **Explicit Environment Information**
Added compilation environment details to help AI understand the exact setup:
- Solidity 0.8.20+ (built-in overflow checks)
- OpenZeppelin Contracts v5.0.0 (emphasis on breaking changes from v4)
- Foundry compiler (forge)
- Installed libraries

### 2. **CRITICAL Forbidden Patterns Section**
Added a comprehensive "NEVER USE" section that explicitly tells AI to avoid patterns that cause compilation errors:

#### ❌ Counters Library (REMOVED in v5)
- ❌ DO NOT use: `import "@openzeppelin/contracts/utils/Counters.sol"`
- ❌ DO NOT use: `using Counters for Counters.Counter;`
- ✅ USE INSTEAD: `uint256 private _nextTokenId;` and `_nextTokenId++`

#### ❌ SafeMath Library (REMOVED in v5)
- ❌ DO NOT use: SafeMath (built into Solidity 0.8+)
- ✅ NOT NEEDED: Overflow checks are automatic

#### ❌ Old Hooks (REMOVED in v5)
- ❌ DO NOT use: `_beforeTokenTransfer()`
- ❌ DO NOT use: `_afterTokenTransfer()`
- ❌ DO NOT use: `_beforeConsecutiveTokenTransfer()`
- ✅ USE INSTEAD: `_update()` function with correct signatures:
  - ERC20: `function _update(address from, address to, uint256 amount) internal virtual override`
  - ERC721: `function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address)`

#### ❌ Ownable Without Parameter (REQUIRED in v5)
- ❌ WRONG: `constructor() ERC20("Token", "TKN") Ownable() {}`
- ✅ CORRECT: `constructor() ERC20("Token", "TKN") Ownable(msg.sender) {}`

#### ❌ ERC721URIStorage _burn Override
- ❌ DO NOT override `_burn()` when using ERC721URIStorage
- ✅ ERC721URIStorage handles it internally

#### ❌ Missing Parent Contracts in Override Lists
- ❌ WRONG: `override(ERC721, IERC2981)` when also inheriting ERC721URIStorage
- ✅ CORRECT: `override(ERC721, ERC721URIStorage, IERC2981)`

### 3. **Exact Import Paths**
Provided a curated list of exact OpenZeppelin v5 import paths to prevent invalid imports:
- Standard imports (ERC20, ERC721, Ownable, etc.)
- Upgradeable imports (with -Upgradeable suffix)
- Only valid, existing imports

### 4. **Required Code Structure**
Specified the exact order for code organization:
1. SPDX license (first line)
2. pragma statement
3. Imports (alphabetically sorted)
4. Contract declaration
5. State variables
6. Custom errors
7. Events
8. Constructor
9. Functions (external, public, internal, private)
10. Override functions

### 5. **Output Format Enforcement**
Clear rules to prevent markdown formatting in output:

❌ WRONG:
```
\`\`\`solidity
Here's your contract:
// SPDX-License-Identifier: MIT
...
```

✅ CORRECT:
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
...
```

### 6. **Validation Checklist**
Added a 12-point validation checklist that AI must verify before outputting:
- ✅ SPDX license at very top
- ✅ pragma solidity ^0.8.20;
- ✅ All imports use exact paths
- ✅ NO Counters.Counter usage
- ✅ NO deprecated hooks
- ✅ Ownable(msg.sender) correct usage
- ✅ _update() function used
- ✅ NO _burn() override with ERC721URIStorage
- ✅ All parents in override lists
- ✅ Complete functions (no TODOs)
- ✅ NO markdown formatting
- ✅ Starts with "// SPDX-License-Identifier: MIT"

### 7. **Enhanced Validation Prompt**
Updated the AI validator to specifically check for OpenZeppelin v5 compliance issues:

❌ Should check for:
- Deprecated Counters library usage
- SafeMath usage
- _beforeTokenTransfer() or _afterTokenTransfer() hooks
- Ownable() without parameter
- _burn() override with ERC721URIStorage
- Missing parent contracts in override lists

✅ Should verify:
- _update() function used correctly
- msg.sender passed to Ownable
- Exact import paths used

## 🎯 Expected Results

### Before:
- Multiple compilation errors
- Deprecated patterns causing failures
- Missing imports
- Incorrect override lists
- Markdown formatting issues

### After:
- ✅ Contracts compile on first try
- ✅ Uses only OpenZeppelin v5 patterns
- ✅ Correct import paths
- ✅ Proper override specifications
- ✅ Raw Solidity output (no markdown)

## 📝 Files Modified

### `src/lib/contract-prompts.ts`
- Enhanced `CONTRACT_GENERATION_PROMPT` with comprehensive rules
- Added critical forbidden patterns section
- Added exact import paths list
- Added validation checklist
- Added output format enforcement
- Enhanced `CONTRACT_VALIDATION_PROMPT` with v5-specific checks

## 🧪 Testing Recommendations

To verify the improvements work:

1. **Test Simple Contract**:
   ```
   Prompt: "Create a basic ERC20 token"
   ```
   Expected: Compiles without errors

2. **Test NFT Contract**:
   ```
   Prompt: "Create an NFT contract with URI storage"
   ```
   Expected: Uses ERC721URIStorage correctly, no _burn() override

3. **Test Upgradeable Contract**:
   ```
   Prompt: "Create an upgradeable ERC721 contract"
   ```
   Expected: Uses upgradeable imports and initialize() function

4. **Test with Hooks**:
   ```
   Prompt: "Create an ERC20 token with custom transfer logic"
   ```
   Expected: Uses _update() not _beforeTokenTransfer

## 🔗 Related Documentation

- OpenZeppelin v5 Breaking Changes: https://blog.openzeppelin.com/introducing-openzeppelin-contracts-5.0
- Foundry Documentation: https://book.getfoundry.sh
- Solidity 0.8.20 Documentation: https://docs.soliditylang.org

## ✅ Status: Complete

All improvements have been successfully applied to `src/lib/contract-prompts.ts`. The AI should now generate contracts that compile on the first try!

