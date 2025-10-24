<!-- fbbcdda8-de8c-4a19-a43d-2d58795acadb 398c1609-6fce-47fa-a54d-bd979e6afa83 -->
# Hybrid AI + Template Smart Contract Generation Implementation Plan

## Current vs. Proposed Architecture Comparison

### Current Implementation (Template-Only)

**Workflow:**

1. User provides prompt → AI analyzes → Returns basic config (contractType, features, blockchain)
2. System routes to hardcoded template function (generateERC20Contract, generateERC721Contract, etc.)
3. Template assembles contract with fixed patterns based on binary feature flags
4. No customization beyond basic feature toggles (mintable, burnable, pausable)

**Limitations:**

- AI only used for configuration selection, not code generation
- Templates are rigid with limited composition
- No support for custom business logic (royalties, batch operations, metadata management)
- All ERC-721 contracts are identical if same features selected
- No gas optimization suggestions
- No security recommendations beyond basic features

### Proposed Implementation (Hybrid AI + Templates)

**Workflow:**

1. User prompt → Enhanced AI analysis → Returns rich configuration with custom requirements
2. System evaluates complexity: standard requirements use composed templates, complex requirements trigger AI code generation
3. Modular template composition with AI-suggested custom functions
4. AI generates only custom logic, templates handle standards
5. Validation of both template and AI-generated code

**Advantages:**

- AI analyzes requirements deeply (royalties, batch ops, metadata, access patterns)
- Modular template system with composable functions
- Custom logic generation for unique requirements
- Gas optimization and security recommendations
- Best of both worlds: template reliability + AI customization

## Implementation Phases

### Phase 1: Enhanced AI Configuration (Week 1-2)

#### 1.1 Create Enhanced Configuration Types

**File:** `src/types/contract-config.ts` (NEW)

```typescript
export interface EnhancedContractConfig {
  // Existing fields
  contractType: 'erc20' | 'erc721' | 'erc1155' | 'payment-splitter' | 'custom';
  tokenName: string;
  tokenSymbol: string;
  blockchain: string;
  network: string;
  features: string[];
  
  // NEW: AI-analyzed custom requirements
  customRequirements: {
    royaltySystem?: {
      enabled: boolean;
      percentage: number;
      recipient: 'contract_owner' | 'creator' | 'custom';
      customRecipient?: string;
    };
    batchOperations?: {
      batchMint: boolean;
      batchTransfer: boolean;
      maxBatchSize: number;
    };
    metadataManagement?: {
      ipfsStorage: boolean;
      updatableMetadata: boolean;
      baseURI: string;
      freezeMetadata: boolean;
    };
    accessControl?: {
      roles: string[];
      transferRestrictions: boolean;
      whitelist: boolean;
      mintingSchedule: 'unlimited' | 'capped' | 'time-limited';
    };
    economicFeatures?: {
      staking: boolean;
      rewards: boolean;
      vesting: boolean;
      governance: boolean;
    };
  };
  
  // NEW: AI-generated optimization suggestions
  gasOptimizations: string[];
  
  // NEW: AI security recommendations
  securityRecommendations: string[];
  
  // NEW: AI reasoning for configuration
  reasoning: string;
}
```

#### 1.2 Update AI Analysis Endpoint

**File:** `src/app/api/dapp-studio/analyze/route.ts`

**Changes:**

- Line 20-50: Replace existing prompt with enhanced system prompt
- Add structured JSON schema for customRequirements
- Include examples of complex requirements (royalties, batch ops, metadata)
- Parse and validate enhanced configuration
- Add error handling for malformed AI responses

**New System Prompt Structure:**

```typescript
const enhancedSystemPrompt = `You are a blockchain expert. Analyze user requirements and provide detailed configuration including:

1. Contract Type & Standard Features
2. Custom Business Logic Requirements:
   - Royalty systems (ERC-2981 compliance)
   - Batch operations for gas efficiency
   - Metadata management (IPFS, updatable, frozen)
   - Access control patterns (roles, restrictions, whitelists)
   - Economic features (staking, rewards, vesting, governance)

3. Gas Optimization Suggestions
4. Security Recommendations
5. Implementation Reasoning

Return enhanced JSON with customRequirements object.`;
```

#### 1.3 Update Database Schema

**File:** `prisma/schema.prisma`

**Add new fields to Project model:**

```prisma
model Project {
  // ... existing fields ...
  
  // NEW: Store enhanced AI configuration
  aiConfiguration Json? // Store full EnhancedContractConfig
  gasOptimizations String[] // AI-suggested optimizations
  securityNotes String[] // AI security recommendations
}
```

**Migration required:** `npx prisma migrate dev --name add_enhanced_config`

### Phase 2: Modular Template System (Week 3-4)

#### 2.1 Create Template Module System

**File:** `src/inngest/contract-templates/modules.ts` (NEW)

**Structure:**

```typescript
// Base module interface
export interface TemplateModule {
  name: string;
  imports: string[];
  stateVariables: string[];
  functions: string[];
  inheritance: string[];
  constructorInit: string[];
  overrides?: string[];
}

// Individual module generators
export const royaltyModule = (config: RoyaltyConfig): TemplateModule => {
  return {
    name: 'royaltySystem',
    imports: ['import "@openzeppelin/contracts/interfaces/IERC2981.sol";'],
    inheritance: ['IERC2981'],
    stateVariables: [
      `uint256 private _royaltyPercentage = ${config.percentage * 100};`,
      `address private _royaltyRecipient;`
    ],
    functions: [
      `function royaltyInfo(uint256, uint256 salePrice) external view override returns (address, uint256) {
        return (_royaltyRecipient, (salePrice * _royaltyPercentage) / 10000);
      }`,
      `function setRoyaltyRecipient(address newRecipient) external onlyOwner {
        _royaltyRecipient = newRecipient;
      }`
    ],
    constructorInit: [
      `_royaltyRecipient = ${config.recipient === 'contract_owner' ? 'msg.sender' : 'address(0)'};`
    ]
  };
};

export const batchOperationsModule = (config: BatchConfig): TemplateModule => {
  // Batch minting and transfer functions
};

export const metadataModule = (config: MetadataConfig): TemplateModule => {
  // IPFS storage, updatable metadata, freeze functionality
};
```

#### 2.2 Create Template Composer

**File:** `src/inngest/contract-templates/composer.ts` (NEW)

```typescript
export function composeContract(
  baseTemplate: string,
  modules: TemplateModule[],
  config: EnhancedContractConfig
): string {
  // 1. Extract base contract structure
  // 2. Inject module imports
  // 3. Add module inheritance
  // 4. Insert state variables
  // 5. Add module functions
  // 6. Compose constructor with module initializations
  // 7. Handle overrides and conflicts
  
  return composedContract;
}
```

#### 2.3 Refactor Existing Template Functions

**File:** `src/inngest/functions.ts`

**Changes:**

- Lines 920-1009: Refactor generateERC20Contract to use module system
- Lines 1011-1109: Refactor generateERC721Contract to use module system
- Lines 1111-1184: Refactor generateERC1155Contract to use module system
- Extract common patterns into reusable modules
- Keep backward compatibility with existing feature flags

**New structure:**

```typescript
function generateERC721Contract(
  name: string,
  symbol: string,
  features: string[],
  customRequirements?: CustomRequirements
) {
  // 1. Get base template
  const baseTemplate = getERC721BaseTemplate(name, symbol);
  
  // 2. Determine required modules
  const modules: TemplateModule[] = [];
  
  // Standard features
  if (features.includes('mintable')) modules.push(mintableModule());
  if (features.includes('burnable')) modules.push(burnableModule());
  if (features.includes('pausable')) modules.push(pausableModule());
  
  // Custom requirements
  if (customRequirements?.royaltySystem?.enabled) {
    modules.push(royaltyModule(customRequirements.royaltySystem));
  }
  if (customRequirements?.batchOperations) {
    modules.push(batchOperationsModule(customRequirements.batchOperations));
  }
  if (customRequirements?.metadataManagement) {
    modules.push(metadataModule(customRequirements.metadataManagement));
  }
  
  // 3. Compose contract
  return composeContract(baseTemplate, modules, { name, symbol, features });
}
```

### Phase 3: AI Code Generation for Complex Logic (Week 5-6)

#### 3.1 Create AI Code Generator

**File:** `src/inngest/ai-code-generator.ts` (NEW)

```typescript
export async function generateCustomLogic(
  userPrompt: string,
  baseContract: string,
  config: EnhancedContractConfig
): Promise<string> {
  const prompt = `Given this base Solidity contract:

${baseContract}

User requirements: "${userPrompt}"

Configuration: ${JSON.stringify(config.customRequirements, null, 2)}

Generate ONLY the additional custom functions and logic needed.
Follow these rules:
1. Use OpenZeppelin patterns and imports
2. Include proper access controls (onlyOwner, roles)
3. Add gas optimizations (unchecked blocks where safe, batch operations)
4. Include error handling and custom errors
5. Add events for all state changes
6. Include NatSpec documentation
7. Follow Solidity 0.8.20 best practices

Return ONLY the additional code (functions, state variables, events), not the full contract.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Solidity expert. Generate secure, gas-optimized code following OpenZeppelin standards.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent code
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content;
}
```

#### 3.2 Create Code Injector

**File:** `src/inngest/code-injector.ts` (NEW)

```typescript
export function injectCustomLogic(
  baseContract: string,
  customLogic: string
): string {
  // Parse AI-generated code
  const parsedLogic = parseCustomLogic(customLogic);
  
  // Inject imports, state variables, functions, events
  // Handle positioning and formatting
  // Validate no conflicts with base contract
  
  return injectedContract;
}

function parseCustomLogic(code: string) {
  return {
    imports: extractImports(code),
    stateVariables: extractStateVars(code),
    events: extractEvents(code),
    functions: extractFunctions(code),
    modifiers: extractModifiers(code)
  };
}
```

#### 3.3 Create Complexity Analyzer

**File:** `src/inngest/complexity-analyzer.ts` (NEW)

```typescript
export function analyzeRequirementComplexity(
  config: EnhancedContractConfig,
  userPrompt: string
): 'simple' | 'moderate' | 'complex' {
  // Simple: Standard features only, covered by templates
  // Moderate: Standard + custom requirements covered by modules
  // Complex: Unique business logic requiring AI generation
  
  const hasUniqueRequirements = checkForUniquePatterns(userPrompt);
  const modulesCoverRequirements = allRequirementsCoveredByModules(config);
  
  if (hasUniqueRequirements && !modulesCoverRequirements) {
    return 'complex';
  }
  
  if (config.customRequirements && Object.keys(config.customRequirements).length > 0) {
    return 'moderate';
  }
  
  return 'simple';
}
```

#### 3.4 Update Contract Generation Logic

**File:** `src/inngest/functions.ts`

**Changes at line 420-450 (generate-contract step):**

```typescript
// In the "generate-contract" step
const code = await step.run("generate-contract", async () => {
  await updateBuildProgress(buildJobId, 10, 'Analyzing requirements...', 'Determining contract complexity');
  
  // Parse enhanced configuration
  const enhancedConfig = event.data as EnhancedContractConfig;
  
  // Analyze complexity
  const complexity = analyzeRequirementComplexity(enhancedConfig, event.data.userPrompt);
  
  let code: string;
  
  switch (complexity) {
    case 'simple':
      // Use standard template generation
      code = generateStandardContract(contractType, tokenName, tokenSymbol, features);
      break;
      
    case 'moderate':
      // Use modular template composition
      code = generateModularContract(contractType, tokenName, tokenSymbol, features, enhancedConfig.customRequirements);
      break;
      
    case 'complex':
      // Generate base template, then use AI for custom logic
      const baseContract = generateStandardContract(contractType, tokenName, tokenSymbol, features);
      const customLogic = await generateCustomLogic(event.data.userPrompt, baseContract, enhancedConfig);
      code = injectCustomLogic(baseContract, customLogic);
      break;
  }
  
  // Enhanced validation for AI-generated code
  const validation = validateContractSyntax(code, complexity === 'complex');
  
  return code;
});
```

### Phase 4: Enhanced Validation (Week 7)

#### 4.1 Update Validation System

**File:** `src/inngest/functions.ts` (lines 340-400)

**Enhancements:**

- Add AI-generated code validation
- Check for security anti-patterns
- Validate gas optimization claims
- Verify OpenZeppelin pattern compliance
- Test for common vulnerabilities (reentrancy, overflow, access control)
```typescript
function validateContractSyntax(
  contractCode: string,
  isAIGenerated: boolean = false
): ValidationResult {
  const errors = [];
  
  // Existing validations...
  
  if (isAIGenerated) {
    // Additional checks for AI-generated code
    errors.push(...checkSecurityPatterns(contractCode));
    errors.push(...checkGasOptimizations(contractCode));
    errors.push(...checkAccessControls(contractCode));
    errors.push(...checkReentrancyGuards(contractCode));
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: generateWarnings(contractCode)
  };
}
```


### Phase 5: Frontend Updates (Week 8)

#### 5.1 Update DApp Studio UI

**File:** `src/app/dapp-studio/page.tsx`

**Show enhanced configuration:**

- Display AI reasoning
- Show custom requirements detected
- Present gas optimization suggestions
- List security recommendations
- Allow user to modify AI suggestions before generation

#### 5.2 Update Build Page

**File:** `src/app/projects/[projectId]/build/page.tsx`

**Display enhanced information:**

- Show complexity level (simple/moderate/complex)
- Display which modules were used
- Show AI-generated custom logic separately
- Present gas estimates for different operations

## Rollout Strategy

### Week 1-2: Phase 1 Implementation

- Create enhanced config types
- Update AI analysis endpoint
- Database migration for new fields
- Test enhanced AI responses

### Week 3-4: Phase 2 Implementation

- Build modular template system
- Create template composer
- Refactor existing templates
- Test module composition

### Week 5-6: Phase 3 Implementation

- Implement AI code generator
- Create code injector
- Build complexity analyzer
- Integration testing

### Week 7: Phase 4 Implementation

- Enhanced validation system
- Security pattern checks
- Comprehensive testing

### Week 8: Phase 5 & Launch

- Frontend updates
- End-to-end testing
- Documentation
- Gradual rollout (10% → 50% → 100%)

## Testing Strategy

1. **Unit Tests**: Each module, composer, injector
2. **Integration Tests**: Full contract generation pipeline
3. **Validation Tests**: Syntax, security, gas optimization
4. **Compilation Tests**: All generated contracts must compile
5. **Security Audits**: Review AI-generated code patterns
6. **Gas Benchmarks**: Compare template vs AI-generated efficiency

## Backward Compatibility

- All existing projects continue using template-only system
- New projects opt-in to hybrid system
- Feature flag: `ENABLE_HYBRID_GENERATION=true`
- Gradual migration path for existing users

## Success Metrics

- Contract generation success rate > 95%
- AI-generated code compilation rate > 90%
- Average generation time < 30 seconds
- User satisfaction with customization options
- Gas efficiency improvements (target: 10-15% reduction)
- Security audit pass rate for AI-generated code

### To-dos

- [ ] Create enhanced configuration types in src/types/contract-config.ts
- [ ] Update AI analysis endpoint with enhanced prompt and parsing
- [ ] Update Prisma schema and run migration for enhanced config storage
- [ ] Create modular template system with reusable modules (royalty, batch, metadata)
- [ ] Build template composer to assemble contracts from modules
- [ ] Refactor existing template generators to use module system
- [ ] Create AI code generator for complex custom logic
- [ ] Build code injector to merge AI-generated code with base templates
- [ ] Create complexity analyzer to route between template, modular, and AI generation
- [ ] Integrate AI generation into main contract generation flow in inngest functions
- [ ] Enhance validation system with security and gas optimization checks
- [ ] Update frontend to display enhanced config, modules used, and AI reasoning
- [ ] Comprehensive testing including unit, integration, compilation, and security tests