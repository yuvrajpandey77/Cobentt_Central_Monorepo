import { NextRequest, NextResponse } from 'next/server';
import { EnhancedContractConfig } from '@/types/contract-config';
import { auth } from '@clerk/nextjs/server';
import { enforceQuota } from '@/lib/quota-enforcement';
import { recordTokenUsage } from '@/lib/token-usage';
import { chatCompletion } from '@/lib/ai/client';

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

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

    // Enhanced system prompt for detailed analysis
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
    
    // Create the enhanced analysis request
    const analysisPrompt = `${enhancedSystemPrompt}

Please analyze the following user request and provide an enhanced JSON configuration:

User Request: "${userPrompt}"

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "contractType": "erc20" | "erc721" | "erc1155" | "payment-splitter" | "custom",
  "tokenName": "string (required for tokens/NFTs)",
  "tokenSymbol": "string (3-5 chars, all caps)",
  "blockchain": "ethereum" | "polygon" | "arbitrum" | "optimism" | "solana",
  "network": "testnet" | "mainnet",
  "features": ["mintable", "burnable", "pausable", "permit", "access-control", "upgradeable"],
  "customRequirements": {
    "royaltySystem": {
      "enabled": boolean,
      "percentage": number (0-100),
      "recipient": "contract_owner" | "creator" | "custom",
      "customRecipient": "string (if custom)"
    },
    "batchOperations": {
      "batchMint": boolean,
      "batchTransfer": boolean,
      "maxBatchSize": number
    },
    "metadataManagement": {
      "ipfsStorage": boolean,
      "updatableMetadata": boolean,
      "baseURI": "string",
      "freezeMetadata": boolean
    },
    "accessControl": {
      "roles": ["string"],
      "transferRestrictions": boolean,
      "whitelist": boolean,
      "mintingSchedule": "unlimited" | "capped" | "time-limited"
    },
    "economicFeatures": {
      "staking": boolean,
      "rewards": boolean,
      "vesting": boolean,
      "governance": boolean
    }
  },
  "gasOptimizations": ["string"],
  "securityRecommendations": ["string"],
  "reasoning": "Detailed explanation of your analysis and choices"
}

Analysis Guidelines:
- Detect custom requirements like royalties, batch operations, metadata management
- Suggest gas optimizations (batch operations, unchecked blocks, efficient storage)
- Provide security recommendations (access controls, pausable, testnet first)
- Consider blockchain-specific features (Polygon for gaming, Ethereum for DeFi)
- Analyze complexity: simple (templates), moderate (modules), complex (AI generation)
- Include reasoning for each custom requirement detected`;

    // Call the AI
    const response = await chatCompletion({
      model: 'openai/gpt-4.1',
      maxTokens: 1000,
      messages: [
        {
          role: 'system',
          content: 'You are an expert blockchain developer assistant. Respond ONLY with valid JSON, no markdown formatting.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
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
    const aiResponse = data.choices[0]?.message?.content;
    const usage = data.usage; // { prompt_tokens, completion_tokens, total_tokens }

    // Record token usage
    if (userId && usage) {
      await recordTokenUsage({
        userId,
        provider: 'OPENAI',
        model: 'gpt-4.1',
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        endpoint: '/api/dapp-studio/analyze',
      });
    }

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
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

    const config: EnhancedContractConfig = JSON.parse(cleanedResponse);

    // Validate the response has required fields
    if (!config.blockchain || !config.contractType) {
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      );
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

