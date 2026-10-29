import { NextRequest, NextResponse } from 'next/server';
import { EnhancedContractConfig } from '@/types/contract-config';
import { chatCompletion } from '@/lib/ai/client';
import { runAIPipeline, recordAITokens, aiErrorResponse } from '@/lib/ai/pipeline';
import { resolveByokCredential, ByokError } from '@/lib/byok';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { prompt: userPrompt } = await request.json();

    // Shared pipeline: auth, rate limit, sanitize, injection check, quota
    const pipeline = await runAIPipeline(userPrompt, {
      rateLimitKey: "ai",
      estimatedTokens: 2000,
      // BYOK calls are paid for by the user's own provider key.
      skipQuotaForByok: true,
    });
    if (!pipeline.ok) return pipeline.response;

    const { userId, sanitizedMessage } = pipeline.ctx;

    // SECURITY: bill the user's own key (BYOK), not the server key.
    // chatCompletion falls back to the server env key when `credential` is
    // omitted — always resolve explicitly so keyless users get a clear
    // "add your key" 402 instead of silently spending server balance.
    const requestedModel = 'openai/gpt-4.1';
    let credential;
    try {
      credential = await resolveByokCredential(userId, requestedModel);
    } catch (err) {
      if (err instanceof ByokError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      throw err;
    }
    const model = credential.model;

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
    
    const analysisPrompt = `${enhancedSystemPrompt}

Please analyze the following user request and provide an enhanced JSON configuration:

User Request: "${sanitizedMessage}"

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

    const start = Date.now();
    const response = await chatCompletion({
      model,
      credential,
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
      throw new Error(`AI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    const usage = data.usage;

    if (usage) {
      await recordAITokens({
        userId,
        model,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        endpoint: '/api/dapp-studio/analyze',
        durationMs: Date.now() - start,
      });
    }

    if (!aiResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    const config: EnhancedContractConfig = JSON.parse(cleanedResponse);

    if (!config.blockchain || !config.contractType) {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    if (!config.customRequirements) config.customRequirements = {};
    if (!config.gasOptimizations) config.gasOptimizations = [];
    if (!config.securityRecommendations) config.securityRecommendations = [];

    return NextResponse.json({ success: true, config });
  } catch (error: unknown) {
    return aiErrorResponse(error, 'Failed to analyze prompt');
  }
}
