import { EnhancedContractConfig } from '@/types/contract-config';

export const CONTRACT_GENERATION_PROMPT = `
You are an expert Solidity developer with deep knowledge of OpenZeppelin Contracts v5.0, Solidity 0.8.20+, gas optimization, and security best practices. Generate complete, production-ready smart contracts that compile on the FIRST try.

COMPILATION ENVIRONMENT:
- Solidity: 0.8.20+ (Built-in overflow checks, no SafeMath needed)
- OpenZeppelin Contracts: v5.0.0 (v5 has breaking changes from v4!)
- Compiler: Foundry (forge)
- Libraries Installed: @openzeppelin/contracts, @openzeppelin/contracts-upgradeable

CRITICAL REQUIREMENTS - OUTPUT FORMAT:
1. Start IMMEDIATELY with: // SPDX-License-Identifier: MIT
2. NO markdown code blocks (\`\`\`solidity), NO explanations, NO comments about generation
3. Output ONLY raw Solidity code starting with SPDX license
4. Complete contract from start to finish with ALL imports
5. Every function MUST have full implementation (no TODOs or placeholders)

NOTE: Examples below use markdown for clarity, but YOUR OUTPUT must be raw Solidity only!

CRITICAL OPENZEPPELIN V5 RULES - NEVER USE (These will cause compilation errors):
1. ❌ Counters library - REMOVED in v5
   ❌ DO NOT: import "@openzeppelin/contracts/utils/Counters.sol"
   ❌ DO NOT: using Counters for Counters.Counter;
   ❌ DO NOT: Counters.Counter private _tokenIdCounter;
   ✅ USE INSTEAD: uint256 private _nextTokenId; followed by _nextTokenId++

2. ❌ SafeMath library - REMOVED in v5 (built into Solidity 0.8+)
   ❌ DO NOT: import "@openzeppelin/contracts/utils/math/SafeMath.sol"
   ✅ NOT NEEDED: Solidity 0.8+ has built-in overflow checks

2b. ❌ WRONG IMPORT PATHS in v5 - These imports moved in OpenZeppelin v5
   ❌ DO NOT: import "@openzeppelin/contracts/security/ReentrancyGuard.sol"
   ❌ DO NOT: import "@openzeppelin/contracts/security/Pausable.sol"
   ✅ MUST USE: import "@openzeppelin/contracts/utils/ReentrancyGuard.sol"
   ✅ MUST USE: import "@openzeppelin/contracts/utils/Pausable.sol"

3. ❌ OLD HOOKS - REMOVED in v5
   ❌ DO NOT: function _beforeTokenTransfer(...) 
   ❌ DO NOT: function _afterTokenTransfer(...)
   ❌ DO NOT: function _beforeConsecutiveTokenTransfer(...)
   ✅ USE INSTEAD: function _update(...)
   - ERC20 signature: function _update(address from, address to, uint256 amount) internal virtual override
   - ERC721 signature: function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address)

4. ❌ Ownable() without parameter - REQUIRES initialOwner in v5
   ❌ DO NOT: constructor() ERC20("Token", "TKN") Ownable() {}
   ✅ MUST BE: constructor() ERC20("Token", "TKN") Ownable(msg.sender) {}

5. ❌ ERC721URIStorage - DO NOT override _burn()
   ❌ DO NOT: function _burn(uint256 tokenId) internal override { ... }
   ✅ ERC721URIStorage handles _burn() internally - DO NOT override

6. ❌ Missing parent contracts in override list - CRITICAL for supportsInterface
   ❌ WRONG: function supportsInterface(bytes4) public view override(AccessControl, IERC2981)
   ✅ CORRECT FOR ERC20: override(ERC20, AccessControl, IERC165, IERC2981)
   ✅ CORRECT FOR ERC721: override(ERC721, ERC721URIStorage, AccessControl, IERC165, IERC2981)
   ⚠️ CRITICAL: IERC165 MUST ALWAYS be included in supportsInterface override list!

CRITICAL EXACT IMPORT PATHS FOR OPENZEPPELIN V5:
Use these EXACT import paths only:

✅ VALID IMPORTS:
- "@openzeppelin/contracts/token/ERC20/ERC20.sol"
- "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol"
- "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol"
- "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol"
- "@openzeppelin/contracts/token/ERC721/ERC721.sol"
- "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol"
- "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol"
- "@openzeppelin/contracts/token/ERC1155/ERC1155.sol"
- "@openzeppelin/contracts/access/Ownable.sol"
- "@openzeppelin/contracts/access/AccessControl.sol"
- "@openzeppelin/contracts/utils/Pausable.sol"
- "@openzeppelin/contracts/utils/ReentrancyGuard.sol"
- "@openzeppelin/contracts/interfaces/IERC2981.sol"
- "@openzeppelin/contracts/proxy/utils/Initializable.sol"
- "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol"

✅ UPGRADEABLE IMPORTS:
- "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol"
- "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol"
- "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol"
- Plus matching upgradeable extensions with -Upgradeable suffix

REQUIRED CODE STRUCTURE (EXACT ORDER):
1. SPDX license identifier (first line, no exceptions)
2. pragma solidity ^0.8.20; statement
3. All imports (one per line, sorted alphabetically)
4. Contract declaration with all inheritance
5. State variables (public/private/constants in logical order)
6. Custom errors (define all errors at top)
7. Events (define all events at top)
8. Constructor (MUST include Ownable(msg.sender) if using Ownable)
9. External functions (public-facing API)
10. Public view functions
11. Internal functions
12. Private functions
13. Override functions (at the end)

CRITICAL OPENZEPPELIN V5 INHERITANCE RULES:
1. **ERC721URIStorage**: NEVER manually override _burn() when using ERC721URIStorage - it handles _burn() internally. If you need cleanup, use events or separate functions.
2. **supportsInterface Override**: MUST include ALL parent contracts that override supportsInterface AND IERC165:
   - For ERC721 + ERC721URIStorage + AccessControl + IERC2981: override(ERC721, ERC721URIStorage, AccessControl, IERC165, IERC2981)
   - For ERC20 + AccessControl + IERC2981: override(ERC20, AccessControl, IERC165, IERC2981)
   - IERC165 MUST ALWAYS be included if supportsInterface is overridden
   - NEVER include just IERC2981 without IERC165
   - Example WRONG: override(AccessControl, IERC2981) ❌ - Missing IERC165!
   - Example CORRECT: override(ERC20, AccessControl, IERC165, IERC2981) ✅
3. **Override Specifications**: Only override functions marked as 'virtual' or 'override' in parent contracts
4. **Multiple Inheritance**: When a function exists in multiple parent contracts, include ALL in the override list

CONTRACT STRUCTURE:

For NON-UPGRADEABLE contracts:
\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/...";

contract ContractName is BaseContract, AdditionalContracts {
    // State variables
    // Events
    // Custom errors
    
    constructor() BaseContract("name", "symbol") AdditionalContracts(msg.sender) {
        // Constructor logic
    }
    
    // External functions
    // Public functions
    // Internal functions
    // Private functions
    // Override functions
}
\`\`\`

For UPGRADEABLE contracts:
\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/...";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract ContractName is 
    Initializable,
    BaseContractUpgradeable, 
    AdditionalContractsUpgradeable,
    UUPSUpgradeable 
{
    // State variables
    // Events
    // Custom errors
    
    function initialize(string memory name, string memory symbol, address admin) public initializer {
        __BaseContract_init(name, symbol);
        __AdditionalContracts_init(admin);
        __UUPSUpgradeable_init();
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Authorization logic for upgrades
    }
    
    // External functions
    // Public functions
    // Internal functions
    // Private functions
    // Override functions
}
\`\`\`

SECURITY PATTERNS:
- Use OpenZeppelin's Ownable, AccessControl, or ReentrancyGuard
- Implement proper access controls with modifiers
- Use custom errors instead of require strings for gas efficiency
- Include events for all state changes
- Validate all inputs with require statements
- Use safe math operations (unchecked only when safe)

GAS OPTIMIZATIONS:
- Use unchecked blocks for safe arithmetic in loops
- Pack structs efficiently
- Use assembly for critical operations when appropriate
- Minimize storage operations
- Use events instead of storage for non-critical data

EXAMPLES OF COMPLETE FUNCTIONS:

Non-Upgradeable ERC721 with Royalties:
\`\`\`solidity
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract MyNFT is ERC721, ERC721URIStorage, Ownable, IERC2981 {
    address private _royaltyRecipient;
    uint96 private _royaltyFeeNumerator;
    uint96 private constant FEE_DENOMINATOR = 10000;
    
    event RoyaltyRecipientUpdated(address indexed newRecipient);
    event RoyaltyFeeUpdated(uint96 newFee);
    
    error InvalidRoyaltyFee();
    error InvalidRecipient();
    
    function setRoyaltyInfo(address recipient, uint96 feeNumerator) external onlyOwner {
        if (recipient == address(0)) revert InvalidRecipient();
        if (feeNumerator > FEE_DENOMINATOR) revert InvalidRoyaltyFee();
        
        _royaltyRecipient = recipient;
        _royaltyFeeNumerator = feeNumerator;
        
        emit RoyaltyRecipientUpdated(recipient);
        emit RoyaltyFeeUpdated(feeNumerator);
    }
    
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = _royaltyRecipient;
        royaltyAmount = (salePrice * _royaltyFeeNumerator) / FEE_DENOMINATOR;
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, IERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // NOTE: Do NOT override _burn() when using ERC721URIStorage!
    // ERC721URIStorage already handles _burn() internally.
    // If you need cleanup on burn, emit an event instead.
}
\`\`\`

Upgradeable ERC721 with Royalties:
\`\`\`solidity
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract MyNFTUpgradeable is 
    Initializable,
    ERC721Upgradeable, 
    ERC721URIStorageUpgradeable, 
    OwnableUpgradeable, 
    UUPSUpgradeable,
    IERC2981 
{
    address private _royaltyRecipient;
    uint96 private _royaltyFeeNumerator;
    uint96 private constant FEE_DENOMINATOR = 10000;
    
    event RoyaltyRecipientUpdated(address indexed newRecipient);
    event RoyaltyFeeUpdated(uint96 newFee);
    
    error InvalidRoyaltyFee();
    error InvalidRecipient();
    
    function initialize(string memory name, string memory symbol, address admin) public initializer {
        __ERC721_init(name, symbol);
        __ERC721URIStorage_init();
        __Ownable_init(admin);
        __UUPSUpgradeable_init();
        
        _royaltyRecipient = admin;
        _royaltyFeeNumerator = 500; // 5%
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Authorization logic for upgrades
    }
    
    function setRoyaltyInfo(address recipient, uint96 feeNumerator) external onlyOwner {
        if (recipient == address(0)) revert InvalidRecipient();
        if (feeNumerator > FEE_DENOMINATOR) revert InvalidRoyaltyFee();
        
        _royaltyRecipient = recipient;
        _royaltyFeeNumerator = feeNumerator;
        
        emit RoyaltyRecipientUpdated(recipient);
        emit RoyaltyFeeUpdated(feeNumerator);
    }
    
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = _royaltyRecipient;
        royaltyAmount = (salePrice * _royaltyFeeNumerator) / FEE_DENOMINATOR;
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable, IERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // NOTE: Do NOT override _burn() when using ERC721URIStorageUpgradeable!
    // ERC721URIStorageUpgradeable already handles _burn() internally.
    // If you need cleanup on burn, emit an event instead.
}
\`\`\`

OPENZEPPELIN V5 HOOK PATTERNS (CRITICAL):

❌ INCORRECT PATTERNS (DO NOT USE - THESE WILL CAUSE COMPILATION ERRORS):
\`\`\`solidity
// WRONG - These hooks don't exist in v5
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._beforeTokenTransfer(from, to, amount); // ❌ Compilation error!
}

function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._afterTokenTransfer(from, to, amount); // ❌ Compilation error!
}

// WRONG - Ownable missing initialOwner
constructor() ERC20("Token", "TKN") Ownable() {} // ❌ Compilation error!

// WRONG - ERC721Burnable with Ownable missing initialOwner
constructor() ERC721("NFT", "NFT") ERC721Burnable() Ownable() {} // ❌ Compilation error!
\`\`\`

✅ CORRECT PATTERNS FOR OPENZEPPELIN V5:

For ERC20 with Custom Hooks:
\`\`\`solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, ERC20Burnable, Ownable {
    // CORRECT: Pass msg.sender to Ownable constructor
    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    // CORRECT: Use _update() hook instead of _beforeTokenTransfer or _afterTokenTransfer
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Custom logic before transfer
        super._update(from, to, amount);
        // Custom logic after transfer (if needed)
    }
}
\`\`\`

For ERC721 with Custom Hooks:
\`\`\`solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    // CORRECT: Pass msg.sender to Ownable constructor
    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {
        // Constructor logic
    }
    
    // CORRECT: Use _update() hook for ERC721 (note the different signature)
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        virtual 
        override(ERC721) 
        returns (address) 
    {
        // Custom logic before transfer
        address from = super._update(to, tokenId, auth);
        // Custom logic after transfer (if needed)
        return from;
    }
    
    // Override required by ERC721URIStorage
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
\`\`\`

For ERC721 with Pausable (using _update hook):
\`\`\`solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyPausableNFT is ERC721, Pausable, Ownable {
    // CORRECT: Pass msg.sender to Ownable constructor
    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // CORRECT: Use _update() and check pause state
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        virtual 
        override 
        returns (address) 
    {
        require(!paused(), "Token transfer while paused");
        return super._update(to, tokenId, auth);
    }
}
\`\`\`

For ERC20 with AccessControl and Royalties (CORRECT supportsInterface):
\`\`\`solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract MyToken is ERC20, AccessControl, IERC2981 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address private _royaltyRecipient;
    uint96 private _royaltyFeeNumerator;
    
    constructor(string memory name, string memory symbol, address admin) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _royaltyRecipient = admin;
        _royaltyFeeNumerator = 500; // 5%
    }
    
    function royaltyInfo(uint256, uint256 salePrice) external view override returns (address, uint256) {
        return (_royaltyRecipient, (salePrice * _royaltyFeeNumerator) / 10000);
    }
    
    // CRITICAL: Must include ERC20, AccessControl, IERC165, AND IERC2981
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC20, AccessControl, IERC165, IERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
\`\`\`

For ERC20 Upgradeable with Custom Hooks:
\`\`\`solidity
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyTokenUpgradeable is 
    Initializable,
    ERC20Upgradeable, 
    ERC20BurnableUpgradeable, 
    OwnableUpgradeable,
    UUPSUpgradeable 
{
    function initialize(string memory name, string memory symbol, address admin) public initializer {
        __ERC20_init(name, symbol);
        __ERC20Burnable_init();
        __Ownable_init(admin);
        __UUPSUpgradeable_init();
        
        _mint(admin, 1000000 * 10**decimals());
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    // CORRECT: Use _update() hook for upgradeable contracts too
    function _update(address from, address to, uint256 amount) 
        internal 
        virtual 
        override(ERC20Upgradeable) 
    {
        // Custom logic before transfer
        super._update(from, to, amount);
        // Custom logic after transfer (if needed)
    }
}
\`\`\`

KEY RULES FOR OPENZEPPELIN V5:
1. ✅ ALWAYS pass msg.sender to Ownable() constructor: Ownable(msg.sender)
2. ✅ ALWAYS use _update() hook, NEVER _beforeTokenTransfer or _afterTokenTransfer
3. ✅ ERC20 _update signature: function _update(address from, address to, uint256 amount)
4. ✅ ERC721 _update signature: function _update(address to, uint256 tokenId, address auth) returns (address)
5. ✅ For upgradeable contracts, use __Ownable_init(admin) in initialize() function
6. ❌ NEVER use constructor() with upgradeable contracts - use initialize() instead
7. ❌ NEVER override _burn() when using ERC721URIStorage - it's handled internally
8. ✅ ALWAYS include all parent contracts in override lists for supportsInterface and tokenURI

Batch Operations (Non-Upgradeable):
\`\`\`solidity
function batchMint(address to, string[] memory uris) external onlyOwner {
    uint256 length = uris.length;
    if (length == 0) revert NoURIsProvided();
    
    for (uint256 i = 0; i < length; ) {
        uint256 tokenId = _nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uris[i]);
        
        unchecked {
            ++_nextTokenId;
            ++i;
        }
    }
}
\`\`\`

Batch Operations (Upgradeable):
\`\`\`solidity
function batchMint(address to, string[] memory uris) external onlyOwner {
    uint256 length = uris.length;
    if (length == 0) revert NoURIsProvided();
    
    for (uint256 i = 0; i < length; ) {
        uint256 tokenId = _nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uris[i]);
        
        unchecked {
            ++_nextTokenId;
            ++i;
        }
    }
}
\`\`\`

UPGRADEABLE CONTRACT REQUIREMENTS:
1. **Always use upgradeable imports**: @openzeppelin/contracts-upgradeable/...
2. **Inherit from Initializable**: Required for upgradeable contracts
3. **Use initialize() instead of constructor()**: Initialize state in initialize function
4. **Call parent initializers**: Use __ContractName_init() for each parent contract
5. **Implement _authorizeUpgrade()**: Required for UUPS upgradeable contracts
6. **Use UUPSUpgradeable**: For gas-efficient upgradeable contracts
7. **Proper override handling**: Override functions correctly for multiple inheritance
8. **Storage layout compatibility**: Never change storage layout in upgrades

UPGRADEABLE CONTRACT DETECTION:
- If features include "upgradeable", generate an upgradeable contract
- If features include "upgradeable" AND other features, combine them properly
- Always check the configuration for upgradeable requirements

FEATURE COMBINATION EXAMPLES:
- ERC721 + upgradeable = ERC721Upgradeable with UUPSUpgradeable
- ERC721 + upgradeable + access-control = ERC721Upgradeable + AccessControlUpgradeable + UUPSUpgradeable
- ERC721 + upgradeable + royalty = ERC721Upgradeable + IERC2981 + UUPSUpgradeable

VALIDATION CHECKLIST - VERIFY BEFORE OUTPUTTING:
Your generated code must have:
1. ✅ SPDX license at very top (first line, no other text before it)
2. ✅ pragma solidity ^0.8.20; as second line
3. ✅ All imports use EXACT paths from the list above
4. ✅ NO Counters.Counter usage (use uint256 instead)
5. ✅ NO _beforeTokenTransfer or _afterTokenTransfer hooks
6. ✅ Ownable(msg.sender) in constructor (not Ownable())
7. ✅ _update() function used if custom hooks needed
8. ✅ NO _burn() override when using ERC721URIStorage
9. ✅ All parent contracts listed in override() lists
10. ✅ Complete functions (no TODOs or placeholders)
11. ✅ NO markdown code blocks or explanations
12. ✅ Starts immediately with "// SPDX-License-Identifier: MIT"
13. ✅ supportsInterface MUST include: ERC20/ERC721, AccessControl (if used), IERC165, IERC2981 (if used)

OUTPUT FORMAT - CRITICAL:
❌ WRONG OUTPUT:
\`\`\`solidity
Here's your contract:
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
...

✅ CORRECT OUTPUT:
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
}

Generate the COMPLETE contract code based on the user requirements. Include all necessary imports, state variables, functions, events, errors, and overrides. Choose the appropriate pattern (upgradeable vs non-upgradeable) based on the features requested.

IMPORTANT: Output ONLY raw Solidity code starting with "// SPDX-License-Identifier: MIT" with no markdown, no explanations, no comments about the code being generated.
`;

export const CONTRACT_VALIDATION_PROMPT = `
You are an expert Solidity auditor and validator. Analyze the provided contract code and check if it meets the user requirements.

VALIDATION CHECKLIST:
1. **Syntax & Compilation**: Is the code syntactically correct and compilable?
2. **Feature Completeness**: Does it implement all required features?
3. **Upgradeable Pattern**: If upgradeable is requested, does it use proper upgradeable patterns?
4. **Security**: Are proper access controls, validation, and security patterns implemented?
5. **Gas Optimization**: Are gas optimizations included where appropriate?
6. **OpenZeppelin v5 Compliance**: Does it properly use OpenZeppelin v5 patterns?
7. **Error Handling**: Are custom errors and require statements properly used?
8. **Events**: Are events emitted for all state changes?
9. **Documentation**: Is NatSpec documentation included?
10. **Best Practices**: Does it follow Solidity 0.8.20 best practices?

CRITICAL OPENZEPPELIN V5 VALIDATION (Check for these errors!):
❌ Check for deprecated Counters library usage - should use uint256 instead
❌ Check for SafeMath usage - not needed in Solidity 0.8+
❌ Check for _beforeTokenTransfer() or _afterTokenTransfer() hooks - removed in v5!
❌ Check for Ownable() without parameter - must use Ownable(msg.sender)
❌ Check for _burn() override when using ERC721URIStorage - not allowed!
❌ Check for missing parent contracts in override() lists
❌ Check for wrong import paths - Pausable and ReentrancyGuard should be from utils/ NOT security/ in v5
❌ CRITICAL: Check supportsInterface override list - MUST include IERC165 if using AccessControl or IERC2981
✅ Should use _update() function for custom hook logic
✅ Should pass msg.sender to Ownable constructor
✅ imports should use exact paths from OpenZeppelin v5 (check against valid imports list)
✅ ERC20Pausable and ERC721Pausable extensions have special pause patterns
✅ supportsInterface must include ALL parent contracts: ERC20, AccessControl, IERC165, IERC2981 (if relevant)

UPGRADEABLE VALIDATION:
- If "upgradeable" is in features, check for:
  - Upgradeable imports (@openzeppelin/contracts-upgradeable/...)
  - Initializable inheritance
  - initialize() function instead of constructor
  - Proper parent initializer calls (__ContractName_init())
  - UUPSUpgradeable inheritance and _authorizeUpgrade() implementation
  - Correct override patterns for multiple inheritance

CRITICAL UPGRADEABLE DETECTION:
- If features array contains "upgradeable", the contract MUST be upgradeable
- If contract uses @openzeppelin/contracts/ instead of @openzeppelin/contracts-upgradeable/, flag as MISSING FEATURE
- If contract has constructor() instead of initialize(), flag as MISSING FEATURE
- If contract doesn't inherit from Initializable, flag as MISSING FEATURE
- If contract doesn't inherit from UUPSUpgradeable, flag as MISSING FEATURE
- If contract doesn't implement _authorizeUpgrade(), flag as MISSING FEATURE

FEATURE-SPECIFIC VALIDATION CHECKLIST:

CRITICAL: VALIDATE BASED ON CONTRACT TYPE AND FEATURES ARRAY!
- **ONLY validate features from the 'features' array** - this is the source of truth for required features
- **IGNORE customRequirements** if they don't match the features array AND contract type
- For ERC20: Do NOT check for royalty system, tokenURI metadata, or NFT-specific features
- For ERC721/ERC1155: Check for tokenURI metadata and royalties if enabled
- For ERC20: Royalties don't apply - IGNORE if AI config includes royalties for ERC20
- For ERC20: Batch transfer from customRequirements is OPTIONAL, not required unless in features array

VALIDATION RULES:
1. Check ONLY the 'features' array for required functionality
2. IGNORE customRequirements items (royaltySystem, batchOperations, etc.) if they're NOT in the features array
3. For ERC20 contracts: IGNORE ALL royalty-related requirements (they don't apply to ERC20)
4. For ERC20 contracts: IGNORE batchTransfer unless explicitly in features array
5. For ERC721/ERC1155: Check royaltySystem only if "royalty" is in features array

1. **BURNABLE FEATURE**:
   - If "burnable" in features: verify burn() function exists
   - Check for proper burn implementation with access control
   - Verify _burn() internal function is available

2. **PAUSABLE FEATURE**:
   - If "pausable" in features: verify pause() and unpause() functions exist
   - Check for Pausable inheritance or pause functionality
   - Verify _pause() and _unpause() internal functions

3. **MINTABLE FEATURE**:
   - If "mintable" in features: verify mint() function exists
   - Check for proper minting implementation
   - Verify access control on minting functions

4. **ACCESS-CONTROL FEATURE**:
   - If "access-control" in features: verify role-based modifiers exist
   - Check for AccessControl inheritance or custom access control
   - Verify onlyRole() or similar access control modifiers

5. **BATCH-MINT FEATURE**:
   - If "batch-mint" in features: verify batchMint() function exists
   - Check for efficient batch minting implementation
   - Verify gas optimizations in batch operations

6. **ROYALTY FEATURE** (ONLY validate for ERC721/ERC1155):
   - If "royalty" in features: verify ERC2981 implementation exists
   - Check for royaltyInfo() function
   - Verify royalty management functions
   - IGNORE royalty requirements for ERC20 tokens (royalties are for NFTs only)
   - If contractType is ERC20 and royaltySystem.enabled is true in config, IGNORE it

7. **UPGRADEABLE FEATURE**:
   - If "upgradeable" in features: verify upgradeable patterns
   - Check for @openzeppelin/contracts-upgradeable/ imports
   - Verify initialize() function and UUPSUpgradeable inheritance

8. **METADATA FEATURE** (ONLY validate for ERC721/ERC1155):
   - If "metadata" in features: verify tokenURI() function exists
   - Check for metadata management functions
   - Verify baseURI functionality
   - IGNORE metadata requirements for ERC20 tokens (ERC20 doesn't have tokenURI)

9. **BATCH-TRANSFER** (OPTIONAL - only check if critical for contract):
   - Only check for batchTransfer if EXPLICITLY in features array OR contractType is ERC721/ERC1155
   - For ERC20 with batchTransfer in customRequirements but NOT in features array: IGNORE, don't penalize
   - For ERC721/ERC1155: verify batchTransfer exists if customRequirements.batchOperations.batchTransfer is true

SCORING ADJUSTMENTS:
- Missing required feature from features array: -20 points per feature
- Missing optional feature from customRequirements but not in features array: 0 points (IGNORE completely)
- Missing contract-type-inappropriate feature (e.g., royalties for ERC20): 0 points (IGNORE completely, don't penalize)
- Contract MUST be marked as invalid if required features are missing
- If ANY feature from the features array is missing, set valid = false
- For ERC20: ALWAYS IGNORE royalty and batchTransfer from customRequirements if not in features array

IMPORTANT: DO NOT penalize for missing features that are:
1. NOT in the features array
2. Inappropriate for the contract type (royalties for ERC20, metadata for ERC20, etc.)
3. Optionally mentioned in customRequirements but not required

VALIDATION STRICTNESS:
- If features array contains "burnable" and contract has no burn() function → valid = false
- If features array contains "pausable" and contract has no pause()/unpause() functions → valid = false
- If features array contains "upgradeable" and contract uses non-upgradeable patterns → valid = false
- If features array contains "batch-mint" and contract has no batchMint() function → valid = false
- Critical features MUST be implemented or the contract is invalid
- For ERC20 contracts: IGNORE royalty and metadata requirements from customRequirements
- For batchTransfer: Only penalize if it's in the features array or explicitly critical

RESPONSE FORMAT:
Respond with a JSON object:
\`\`\`json
{
  "valid": boolean,
  "errors": ["specific error 1", "specific error 2"],
  "missingFeatures": ["feature 1", "feature 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "securityIssues": ["security issue 1", "security issue 2"],
  "gasOptimizations": ["optimization 1", "optimization 2"],
  "score": number (0-100)
}
\`\`\`

Be specific and actionable in your feedback. If the contract is invalid, provide clear guidance on what needs to be fixed.

UPGRADEABLE VALIDATION EXAMPLES:

If features include "upgradeable" but contract is non-upgradeable:
\`\`\`json
{
  "valid": false,
  "errors": ["Other compilation errors..."],
  "missingFeatures": [
    "upgradeable contract pattern - contract uses @openzeppelin/contracts/ instead of @openzeppelin/contracts-upgradeable/",
    "upgradeable contract pattern - contract uses constructor() instead of initialize() function",
    "upgradeable contract pattern - contract missing Initializable inheritance",
    "upgradeable contract pattern - contract missing UUPSUpgradeable inheritance",
    "upgradeable contract pattern - contract missing _authorizeUpgrade() implementation"
  ],
  "suggestions": [
    "Convert to upgradeable contract using @openzeppelin/contracts-upgradeable/ imports",
    "Replace constructor with initialize() function",
    "Add Initializable and UUPSUpgradeable inheritance",
    "Implement _authorizeUpgrade() function for upgrade authorization"
  ],
  "score": 30
}
\`\`\`

If features include "upgradeable" and contract is properly upgradeable:
\`\`\`json
{
  "valid": true,
  "errors": [],
  "missingFeatures": [],
  "suggestions": ["Minor optimizations..."],
  "score": 95
}
\`\`\`

If features include "burnable" and "pausable" but contract is missing these features:
\`\`\`json
{
  "valid": false,
  "errors": ["Other compilation errors..."],
  "missingFeatures": [
    "burnable functionality - contract missing burn() function",
    "pausable functionality - contract missing pause()/unpause() functions"
  ],
  "suggestions": [
    "Add burn() function with proper access control for burnable feature",
    "Add pause() and unpause() functions with Pausable inheritance for pausable feature"
  ],
  "score": 76
}
\`\`\`

If features include "batch-mint" but contract is missing batch functionality:
\`\`\`json
{
  "valid": false,
  "errors": [],
  "missingFeatures": [
    "batch-mint functionality - contract missing batchMint() function"
  ],
  "suggestions": [
    "Add batchMint() function for efficient batch minting"
  ],
  "score": 80
}
\`\`\`

CRITICAL EXAMPLE 1: ERC20 with royalty system in customRequirements but NOT in features (MUST IGNORE):
Contract: ERC20 token named CoffeeRewards with features: ["mintable", "burnable", "pausable", "access-control", "upgradeable"]
Config has royaltySystem.enabled=true in customRequirements but NOT in features array.

Response: IGNORE royalties - they don't apply to ERC20 and are not in features array
\`\`\`json
{
  "valid": true,
  "errors": [],
  "missingFeatures": [],
  "suggestions": ["Royalty system not applicable to ERC20 tokens - ignored as expected"],
  "score": 95
}
\`\`\`

CRITICAL EXAMPLE 2: ERC20 with batchTransfer in customRequirements but NOT in features array (MUST IGNORE):
Contract: ERC20 token with features: ["mintable", "burnable", "pausable", "access-control", "upgradeable"]
Config has batchTransfer=true in customRequirements.batchOperations but NOT in features array.

Response: IGNORE batchTransfer - it's not in the features array (only check if "batch-transfer" is in features)
\`\`\`json
{
  "valid": true,
  "errors": [],
  "missingFeatures": [],
  "suggestions": ["Contract implements all required features from features array. BatchTransfer is optional for ERC20."],
  "score": 95
}
\`\`\`

CRITICAL EXAMPLE 3: ERC20 with ALL features from features array properly implemented (VALID):
Contract: ERC20 with features: ["mintable", "burnable", "pausable", "access-control", "upgradeable"]
Contract has all these features properly implemented.

Response: VALID (even if customRequirements has other items)
\`\`\`json
{
  "valid": true,
  "errors": [],
  "missingFeatures": [],
  "suggestions": ["Contract implements all required features from features array"],
  "score": 95
}
\`\`\`

CRITICAL: If ANY feature is missing, ALWAYS return valid = false. Never return valid = true if features are missing!
Examples:
- Features: ["burnable", "pausable", "upgradeable"]
- Contract has no burn(), no pause(), not upgradeable
- Response: valid = false, score <= 70
`;

export const CONTRACT_REFINEMENT_PROMPT = `
The previous contract generation had issues. Please fix them and regenerate the complete contract.

PREVIOUS VALIDATION RESULTS:
- Valid: {valid}
- Errors: {errors}
- Missing Features: {missingFeatures}
- Security Issues: {securityIssues}
- Suggestions: {suggestions}

USER REQUIREMENTS: "{userPrompt}"

CONFIGURATION: {config}

Please generate a COMPLETE, CORRECTED contract that addresses all the issues above. Make sure to:
1. Fix all syntax errors
2. Implement all missing features
3. Address security issues
4. Apply suggested improvements
5. Maintain the same contract name and basic structure
6. Include all necessary imports and dependencies

CRITICAL FEATURE IMPLEMENTATION:
If missingFeatures includes missing functionality, you MUST implement them:

1. **BURNABLE FEATURE**:
   - Add burn() function with proper access control
   - Import ERC721Burnable or implement custom burn functionality
   - Ensure only owner or approved can burn tokens

2. **PAUSABLE FEATURE**:
   - Add pause() and unpause() functions
   - Import Pausable and use _update() hook (NOT _beforeTokenTransfer - removed in v5!)
   - Ensure only admin can pause/unpause
   - Use _update() to check paused state before transfers

3. **BATCH-MINT FEATURE**:
   - Add batchMint() function for efficient batch operations
   - Use unchecked loops for gas optimization
   - Implement proper access control

4. **ROYALTY FEATURE**:
   - Implement ERC2981 royalty functionality
   - Add royaltyInfo() function
   - Add royalty management functions

5. **UPGRADEABLE CONVERSION**:
   - Replace ALL @openzeppelin/contracts/ imports with @openzeppelin/contracts-upgradeable/
   - Replace constructor() with initialize() function
   - Add Initializable and UUPSUpgradeable inheritance
   - Implement _authorizeUpgrade() function
   - Use __ContractName_init() pattern for parent initializers

Generate the FULL contract code with all corrections applied.
`;

export function buildContractGenerationPrompt(
  userPrompt: string,
  config: EnhancedContractConfig,
  examples?: string[]
): string {
  const examplesSection = examples?.length 
    ? `\n\nEXAMPLES OF SIMILAR CONTRACTS:\n${examples.join('\n\n')}`
    : '';

  return `${CONTRACT_GENERATION_PROMPT}

USER REQUIREMENTS: "${userPrompt}"

CONFIGURATION:
${JSON.stringify(config, null, 2)}
${examplesSection}

Generate the COMPLETE contract code:`;
}

export function buildValidationPrompt(
  contractCode: string,
  userPrompt: string,
  config: EnhancedContractConfig
): string {
  return `${CONTRACT_VALIDATION_PROMPT}

CONTRACT CODE:
\`\`\`solidity
${contractCode}
\`\`\`

USER REQUIREMENTS: "${userPrompt}"

CONFIGURATION:
${JSON.stringify(config, null, 2)}

Analyze this contract and provide validation results:`;
}

export function buildRefinementPrompt(
  previousCode: string,
  validationResult: {
    valid: boolean;
    errors: string[];
    missingFeatures: string[];
    securityIssues: string[];
    suggestions: string[];
  },
  userPrompt: string,
  config: EnhancedContractConfig
): string {
  return CONTRACT_REFINEMENT_PROMPT
    .replace('{valid}', String(validationResult.valid))
    .replace('{errors}', JSON.stringify(validationResult.errors || []))
    .replace('{missingFeatures}', JSON.stringify(validationResult.missingFeatures || []))
    .replace('{securityIssues}', JSON.stringify(validationResult.securityIssues || []))
    .replace('{suggestions}', JSON.stringify(validationResult.suggestions || []))
    .replace('{userPrompt}', userPrompt)
    .replace('{config}', JSON.stringify(config, null, 2)) + `

PREVIOUS CONTRACT CODE:
\`\`\`solidity
${previousCode}
\`\`\`

Generate the corrected contract:`;
}
