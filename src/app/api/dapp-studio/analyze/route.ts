import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@inngest/agent-kit';
import { buildPrompt } from '@/lib/prompts';
import { EnhancedContractConfig } from '@/types/contract-config';
import { auth } from '@clerk/nextjs/server';
import { enforceQuota } from '@/lib/quota-enforcement';
import { recordTokenUsage } from '@/lib/token-usage';

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

/**
 * Normalizes contractType to match the expected format (lowercase with hyphen for frontend)
 * Handles all common variations: uppercase, lowercase, hyphens, underscores, spaces
 */
function normalizeContractType(contractType: string): string {
  if (!contractType) return 'custom';
  
  // Normalize: lowercase, trim, replace underscores/spaces with hyphens
  let normalized = contractType
    .toLowerCase()
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
  
  // Map all variations to correct format (lowercase with hyphen)
  const mappings: Record<string, string> = {
    'payment-splitter': 'payment-splitter',
    'payment_splitter': 'payment-splitter',
    'paymentsplitter': 'payment-splitter',
    'payment splitter': 'payment-splitter',
    'erc20': 'erc20',
    'erc-20': 'erc20',
    'erc_20': 'erc20',
    'erc721': 'erc721',
    'erc-721': 'erc721',
    'erc_721': 'erc721',
    'erc1155': 'erc1155',
    'erc-1155': 'erc1155',
    'erc_1155': 'erc1155',
    'custom': 'custom',
  };
  
  // Check direct mapping first
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Handle uppercase inputs (e.g., "PAYMENT-SPLITTER", "PAYMENT_SPLITTER")
  const upperNormalized = contractType
    .toUpperCase()
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
  
  const upperMappings: Record<string, string> = {
    'PAYMENT-SPLITTER': 'payment-splitter',
    'PAYMENT_SPLITTER': 'payment-splitter',
    'PAYMENTSPLITTER': 'payment-splitter',
    'PAYMENT SPLITTER': 'payment-splitter',
    'ERC20': 'erc20',
    'ERC-20': 'erc20',
    'ERC_20': 'erc20',
    'ERC721': 'erc721',
    'ERC-721': 'erc721',
    'ERC_721': 'erc721',
    'ERC1155': 'erc1155',
    'ERC-1155': 'erc1155',
    'ERC_1155': 'erc1155',
    'CUSTOM': 'custom',
  };
  
  if (upperMappings[upperNormalized]) {
    return upperMappings[upperNormalized];
  }
  
  // Fallback: try to infer from content
  const lower = normalized.toLowerCase();
  if (lower.includes('payment') || lower.includes('splitter')) {
    return 'payment-splitter';
  } else if (lower.includes('721') || lower.includes('nft')) {
    return 'erc721';
  } else if (lower.includes('1155') || lower.includes('multi')) {
    return 'erc1155';
  } else if (lower.includes('20') || lower.includes('token')) {
    return 'erc20';
  }
  
  return 'custom';
}

/**
 * Converts contractType from frontend format (lowercase with hyphen) to backend format (uppercase with underscore)
 */
function convertContractTypeToBackendFormat(contractType: string): string {
  const normalized = normalizeContractType(contractType);
  
  // Convert to uppercase underscore format for backend/Prisma
  const backendMappings: Record<string, string> = {
    'payment-splitter': 'PAYMENT_SPLITTER',
    'erc20': 'ERC20',
    'erc721': 'ERC721',
    'erc1155': 'ERC1155',
    'custom': 'CUSTOM',
  };
  
  return backendMappings[normalized] || normalized.toUpperCase().replace(/-/g, '_');
}

const analysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'contractType',
    'tokenName',
    'tokenSymbol',
    'blockchain',
    'network',
    'features',
    'customRequirements',
    'gasOptimizations',
    'securityRecommendations',
    'reasoning',
  ],
  properties: {
    contractType: {
      type: 'string',
      enum: ['erc20', 'erc721', 'erc1155', 'payment-splitter', 'custom'],
    },
    tokenName: { type: 'string', minLength: 1 },
    tokenSymbol: { type: 'string', minLength: 1 },
    blockchain: {
      type: 'string',
      enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana'],
    },
    network: {
      type: 'string',
      enum: ['mainnet', 'testnet'],
    },
    features: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['mintable', 'burnable', 'pausable', 'permit', 'access-control', 'upgradeable'],
      },
      minItems: 0,
      maxItems: 6,
    },
    customRequirements: {
      type: 'object',
      additionalProperties: false,
      properties: {
        royaltySystem: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            percentage: { type: 'number' },
            recipient: { type: 'string', enum: ['contract_owner', 'creator', 'custom'] },
            customRecipient: { type: 'string' },
          },
          required: ['enabled', 'percentage', 'recipient', 'customRecipient'],
        },
        batchOperations: {
          type: 'object',
          additionalProperties: false,
          properties: {
            batchMint: { type: 'boolean' },
            batchTransfer: { type: 'boolean' },
            maxBatchSize: { type: 'number' },
          },
          required: ['batchMint', 'batchTransfer', 'maxBatchSize'],
        },
        metadataManagement: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ipfsStorage: { type: 'boolean' },
            updatableMetadata: { type: 'boolean' },
            baseURI: { type: 'string' },
            freezeMetadata: { type: 'boolean' },
          },
          required: ['ipfsStorage', 'updatableMetadata', 'baseURI', 'freezeMetadata'],
        },
        accessControl: {
          type: 'object',
          additionalProperties: false,
          properties: {
            roles: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 5,
            },
            transferRestrictions: { type: 'boolean' },
            whitelist: { type: 'boolean' },
            mintingSchedule: {
              type: 'string',
              enum: ['unlimited', 'capped', 'time-limited'],
            },
          },
          required: ['roles', 'transferRestrictions', 'whitelist', 'mintingSchedule'],
        },
        economicFeatures: {
          type: 'object',
          additionalProperties: false,
          properties: {
            staking: { type: 'boolean' },
            rewards: { type: 'boolean' },
            vesting: { type: 'boolean' },
            governance: { type: 'boolean' },
          },
          required: ['staking', 'rewards', 'vesting', 'governance'],
        },
      },
      required: ['royaltySystem', 'batchOperations', 'metadataManagement', 'accessControl', 'economicFeatures'],
    },
    gasOptimizations: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
    securityRecommendations: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
    reasoning: { type: 'string', minLength: 1 },
  },
} as const;

/**
 * Attempts to repair incomplete/truncated JSON by removing incomplete properties and closing brackets
 */
function repairIncompleteJSON(jsonString: string): string {
  let repaired = jsonString.trim();
  
  // Count open/close brackets and braces
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  
  // Find the last complete property by searching backwards for complete key-value pairs
  // Look for patterns ending with: ", "}, "], or just " (end of object)
  const completePropertyPatterns = [
    /":\s*"[^"]*",\s*$/m,           // "key": "value",
    /":\s*"[^"]*"\s*$/m,             // "key": "value"
    /":\s*\d+,\s*$/m,                // "key": 123,
    /":\s*\d+\s*$/m,                 // "key": 123
    /":\s*(true|false|null),\s*$/m,  // "key": true,
    /":\s*(true|false|null)\s*$/m,   // "key": true
    /":\s*\{[^}]*\}\s*,?\s*$/m,      // "key": {...},
    /":\s*\[[^\]]*\]\s*,?\s*$/m,     // "key": [...],
  ];
  
  let cutPoint = repaired.length;
  for (const pattern of completePropertyPatterns) {
    const match = repaired.match(pattern);
    if (match && match.index !== undefined) {
      cutPoint = match.index + match[0].length;
      // Remove trailing comma
      while (cutPoint > 0 && repaired[cutPoint - 1] === ',') {
        cutPoint--;
      }
      break;
    }
  }
  
  // If we found a complete property, cut there
  if (cutPoint < repaired.length) {
    repaired = repaired.substring(0, cutPoint).trim();
  } else {
    // Fallback: find last colon and remove incomplete property
    const lastColon = repaired.lastIndexOf(':');
    if (lastColon > 0) {
      const beforeColon = repaired.substring(0, lastColon);
      // Find the start of this property (last comma or opening brace/bracket)
      const lastComma = beforeColon.lastIndexOf(',');
      const lastOpenBrace = beforeColon.lastIndexOf('{');
      const lastOpenBracket = beforeColon.lastIndexOf('[');
      const propertyStart = Math.max(lastComma + 1, lastOpenBrace, lastOpenBracket);
      repaired = repaired.substring(0, propertyStart).trim();
      // Remove trailing comma
      if (repaired.endsWith(',')) {
        repaired = repaired.slice(0, -1).trim();
      }
    }
  }
  
  // Close any unclosed strings
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < repaired.length; i++) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (repaired[i] === '\\') {
      escapeNext = true;
      continue;
    }
    if (repaired[i] === '"') {
      inString = !inString;
    }
  }
  if (inString) {
    repaired += '"';
  }
  
  // Close open brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']';
  }
  
  // Close open braces
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}';
  }
  
  return repaired;
}

export async function POST(request: NextRequest) {
  try {
    // Check auth and enforce quota
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Enforce quota before processing (estimate 2000 tokens for analysis)
    await enforceQuota(userId, 2000);

    const { prompt: userPrompt } = await request.json();

    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt provided' },
        { status: 400 }
      );
    }

    // Build the AI prompt with full Dapp Builder context
    const systemPrompt = buildPrompt(userPrompt, 'analysis');

    // Call OpenAI with the context - using GPT-5.1 with optimized settings for faster summary
    const model = openai({ model: 'gpt-5.1' });
    
    // Concise instructions to keep responses small and schema-compliant
    const enhancedSystemPrompt = `${systemPrompt}

You are a senior blockchain architect. Fill a JSON configuration that matches the provided schema exactly.
Guidelines:
- Pick the most appropriate contract type and blockchain based on the user's request.
- Populate arrays with at most 5 focused items (omit filler text).
- Use "unknown" or defaults when the user does not specify a value.
- Highlight real trade-offs inside the reasoning field (<=150 words).
- Never add markdown, comments, or extra keys.`;
    
    const analysisPrompt = `User requirement:
"""${userPrompt}"""

Steps:
1. Infer the product goal, target users, and deployment environment.
2. Choose contractType, blockchain, network, and core features that best fit the need.
3. Capture critical custom requirements (royalties, batching, metadata, access control, economics).
4. List up to 5 practical gas optimizations and 5 actionable security recommendations.
5. Summarize your reasoning in plain English (why this architecture works, gaps or follow-ups).

Remember: respond only with JSON that satisfies the schema.`;

    // Call the AI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [
          {
            role: 'system',
            content: enhancedSystemPrompt,
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'DappStudioAnalysis',
            schema: analysisJsonSchema,
            strict: true,
          },
        },
        temperature: 0.2, // Lower temperature for consistent JSON
        max_completion_tokens: 2500, // Reduced to keep responses focused
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to analyze prompt with AI' },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Debug: Log response structure if needed
    if (!data.choices || !data.choices[0]) {
      console.error('Invalid OpenAI response structure:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: 'Invalid response structure from AI' },
        { status: 500 }
      );
    }
    
    const aiResponse = data.choices[0]?.message?.content;
    const usage = data.usage; // { prompt_tokens, completion_tokens, total_tokens }

    // Record token usage asynchronously (non-blocking)
    if (userId && usage) {
      // Don't await - let it run in background to avoid blocking the response
      recordTokenUsage({
        userId,
        provider: 'OPENAI',
        model: 'gpt-5.1',
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        endpoint: '/api/dapp-studio/analyze',
      }).catch((err) => {
        // Already logged in recordTokenUsage, just prevent unhandled rejection
        console.error('[usage] Background token recording failed:', err);
      });
    }

    // Check for length limit or empty response
    const finishReason = data.choices[0]?.finish_reason;
    if (!aiResponse || finishReason === 'length') {
      const errorDetails = finishReason === 'length' 
        ? 'The AI response exceeded the token limit. Please try a more specific prompt or break down your request.'
        : 'The AI response was empty or malformed';
      
      console.error('No AI response received. Response data:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { 
          error: 'No response from AI', 
          details: errorDetails,
          finishReason,
          usage: data.usage,
        },
        { status: 500 }
      );
    }

    // Parse the JSON response (remove markdown code blocks if present)
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    let config: EnhancedContractConfig;
    try {
      config = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // Try to repair incomplete JSON
      console.warn('Initial JSON parse failed, attempting repair...', {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
        responseLength: cleanedResponse.length,
        finishReason: data.choices[0]?.finish_reason,
      });
      
      try {
        const repairedJson = repairIncompleteJSON(cleanedResponse);
        config = JSON.parse(repairedJson);
        console.log('✅ Successfully repaired incomplete JSON');
      } catch (repairError) {
        // Log full response for debugging (truncated to avoid huge logs)
        const responsePreview = cleanedResponse.length > 2000 
          ? cleanedResponse.substring(0, 2000) + `\n... (truncated, total length: ${cleanedResponse.length})`
          : cleanedResponse;
        
        console.error('Failed to parse AI response as JSON (even after repair):', {
          originalError: parseError instanceof Error ? parseError.message : 'Unknown error',
          repairError: repairError instanceof Error ? repairError.message : 'Unknown error',
          responseLength: cleanedResponse.length,
          finishReason: data.choices[0]?.finish_reason,
          usage: data.usage,
          responsePreview,
        });
        
        return NextResponse.json(
          { 
            error: 'Invalid JSON response from AI',
            details: parseError instanceof Error ? parseError.message : 'JSON parse error',
            finishReason: data.choices[0]?.finish_reason,
            suggestion: data.choices[0]?.finish_reason === 'length' 
              ? 'Response was truncated. Please try a more specific prompt or break down your request.'
              : 'The AI response could not be parsed as valid JSON.',
          },
          { status: 500 }
        );
      }
    }

    // Normalize contractType to ensure it matches expected format
    if (config.contractType) {
      const originalType = config.contractType;
      config.contractType = normalizeContractType(config.contractType) as any;
      if (originalType !== config.contractType) {
        console.log(`[normalize] contractType normalized: "${originalType}" → "${config.contractType}"`);
      }
    }
    
    // Normalize blockchain to lowercase
    if (config.blockchain) {
      config.blockchain = config.blockchain.toLowerCase();
    }
    
    // Normalize network to lowercase
    if (config.network) {
      config.network = config.network.toLowerCase();
    }
    
    // Validate the response has required fields
    if (!config.blockchain || !config.contractType) {
      return NextResponse.json(
        { error: 'Invalid AI response format', details: 'Missing required fields: blockchain or contractType' },
        { status: 500 }
      );
    }
    
    // Validate contractType is one of the allowed values
    const validContractTypes = ['erc20', 'erc721', 'erc1155', 'payment-splitter', 'custom'];
    if (!validContractTypes.includes(config.contractType)) {
      console.warn('Invalid contractType received, normalizing:', config.contractType);
      // Try to fix common mistakes
      if (config.contractType.includes('payment') || config.contractType.includes('splitter')) {
        config.contractType = 'payment-splitter' as any;
      } else if (config.contractType.includes('721') || config.contractType.includes('nft')) {
        config.contractType = 'erc721' as any;
      } else if (config.contractType.includes('1155') || config.contractType.includes('multi')) {
        config.contractType = 'erc1155' as any;
      } else if (config.contractType.includes('20') || config.contractType.includes('token')) {
        config.contractType = 'erc20' as any;
      } else {
        config.contractType = 'custom' as any;
      }
    }

    // Ensure customRequirements exists with proper structure
    if (!config.customRequirements) {
      config.customRequirements = {};
    }

    // Ensure arrays exist
    if (!config.gasOptimizations) {
      config.gasOptimizations = [];
    }
    if (!config.securityRecommendations) {
      config.securityRecommendations = [];
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error analyzing prompt:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze prompt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

