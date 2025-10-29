# OpenZeppelin v5 Quick Reference

## Quick Fix Guide for Common Errors

### Error 1: "Function has override specified but does not override anything"
```
Error (7792): Function has override specified but does not override anything.
   --> src/MyToken.sol:103:93:
    |
103 |     function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {
```

**Fix:** Remove `_afterTokenTransfer` completely and use `_update()` instead:

```solidity
// ❌ Remove this
function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._afterTokenTransfer(from, to, amount);
}

// ✅ Use this instead (ERC20)
function _update(address from, address to, uint256 amount) internal virtual override {
    super._update(from, to, amount);
}

// ✅ Use this instead (ERC721)
function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
    return super._update(to, tokenId, auth);
}
```

---

### Error 2: "No arguments passed to the base constructor"
```
Error (3415): No arguments passed to the base constructor. Specify the arguments or mark "MyToken" as abstract.
  --> src/MyToken.sol:12:1:
   |
12 | contract MyToken is ERC20, ERC20Burnable, Ownable {
```

**Fix:** Add `msg.sender` parameter to `Ownable()` constructor:

```solidity
// ❌ Wrong
constructor() ERC20("MyToken", "MTK") Ownable() {
    // ...
}

// ✅ Correct
constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
    _mint(msg.sender, 1000000 * 10**decimals());
}
```

---

### Error 3: "Member '_afterTokenTransfer' not found"
```
Error (9582): Member "_afterTokenTransfer" not found or not visible after argument-dependent lookup in type(contract super MyToken).
   --> src/MyToken.sol:104:9:
    |
104 |         super._afterTokenTransfer(from, to, amount);
```

**Fix:** Remove all calls to `_afterTokenTransfer` - it doesn't exist in v5:

```solidity
// ❌ Remove this entire function
function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._afterTokenTransfer(from, to, amount);
    // your custom logic
}

// ✅ Use this instead
function _update(address from, address to, uint256 amount) internal virtual override {
    super._update(from, to, amount);
    // your custom logic (put it before or after super call as needed)
}
```

---

## Complete Working Examples

### ERC20 Token (Non-Upgradeable)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, ERC20Burnable, Ownable {
    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    // Optional: Custom transfer logic
    function _update(address from, address to, uint256 amount) internal virtual override {
        super._update(from, to, amount);
        // Add custom logic here if needed
    }
}
```

### ERC721 NFT (Non-Upgradeable)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    uint256 private _nextTokenId;
    
    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}
    
    function safeMint(address to, string memory uri) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
    
    // Optional: Custom transfer logic
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        virtual 
        override(ERC721) 
        returns (address) 
    {
        address from = super._update(to, tokenId, auth);
        // Add custom logic here if needed
        return from;
    }
    
    // Required overrides
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
```

### ERC721 with Pausable
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyPausableNFT is ERC721, Pausable, Ownable {
    uint256 private _nextTokenId;
    
    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function safeMint(address to) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }
    
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
```

### Upgradeable ERC20
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(string memory name, string memory symbol, address admin) public initializer {
        __ERC20_init(name, symbol);
        __ERC20Burnable_init();
        __Ownable_init(admin);
        __UUPSUpgradeable_init();
        
        _mint(admin, 1000000 * 10**decimals());
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    // Optional: Custom transfer logic
    function _update(address from, address to, uint256 amount) 
        internal 
        virtual 
        override(ERC20Upgradeable) 
    {
        super._update(from, to, amount);
        // Add custom logic here if needed
    }
}
```

---

## Migration Checklist

When converting v4 contracts to v5:

- [ ] Replace all `_beforeTokenTransfer` with `_update`
- [ ] Replace all `_afterTokenTransfer` with `_update`
- [ ] Add `msg.sender` parameter to all `Ownable()` constructors
- [ ] Update ERC20 `_update` signature: `(address from, address to, uint256 amount)`
- [ ] Update ERC721 `_update` signature: `(address to, uint256 tokenId, address auth) returns (address)`
- [ ] For upgradeable contracts, use `__Ownable_init(admin)` not `__Ownable_init()`
- [ ] Update all override lists to include correct parent contracts
- [ ] Test compilation with Forge: `forge build`
- [ ] Run tests: `forge test`

---

## Key Differences: v4 vs v5

| Feature | v4 | v5 |
|---------|----|----|
| Transfer hooks | `_beforeTokenTransfer`, `_afterTokenTransfer` | `_update` only |
| Ownable constructor | `Ownable()` | `Ownable(address initialOwner)` |
| Ownable init (upgradeable) | `__Ownable_init()` | `__Ownable_init(address initialOwner)` |
| ERC20 hook signature | `(address from, address to, uint256 amount)` | Same for `_update` |
| ERC721 hook signature | `(address from, address to, uint256 tokenId)` | `(address to, uint256 tokenId, address auth) returns (address)` |

---

## Additional Resources

- [OpenZeppelin v5 Migration Guide](https://docs.openzeppelin.com/contracts/5.x/upgradeable)
- [OpenZeppelin v5 Breaking Changes](https://github.com/OpenZeppelin/openzeppelin-contracts/releases/tag/v5.0.0)
- [Foundry Book](https://book.getfoundry.sh/)

