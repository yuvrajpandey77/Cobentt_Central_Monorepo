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

// Configuration types for template modules
export interface RoyaltyConfig {
  percentage: number;
  recipient: 'contract_owner' | 'creator' | 'custom';
  customRecipient?: string;
}

export interface BatchConfig {
  batchMint: boolean;
  batchTransfer: boolean;
  maxBatchSize: number;
}

export interface MetadataConfig {
  ipfsStorage: boolean;
  updatableMetadata: boolean;
  baseURI: string;
  freezeMetadata: boolean;
}

export interface AccessControlConfig {
  roles: string[];
  transferRestrictions: boolean;
  whitelist: boolean;
  mintingSchedule: 'unlimited' | 'capped' | 'time-limited';
}

export interface EconomicConfig {
  staking: boolean;
  rewards: boolean;
  vesting: boolean;
  governance: boolean;
}

// Template module interface
export interface TemplateModule {
  name: string;
  imports: string[];
  stateVariables: string[];
  functions: string[];
  inheritance: string[];
  constructorInit: string[];
  overrides?: string[];
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Complexity levels
export type ComplexityLevel = 'simple' | 'moderate' | 'complex';

// Parsed custom logic interface
export interface ParsedCustomLogic {
  imports: string[];
  stateVariables: string[];
  events: string[];
  functions: string[];
  modifiers: string[];
}
