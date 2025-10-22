import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@inngest/agent-kit';
import { buildPrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const { prompt: userPrompt } = await request.json();

    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt provided' },
        { status: 400 }
      );
    }

    // Build the AI prompt with full Dapp Builder context
    const systemPrompt = buildPrompt(userPrompt, 'analysis');

    // Call OpenAI with the context
    const model = openai({ model: 'gpt-4o' });
    
    // Create the analysis request
    const analysisPrompt = `${systemPrompt}

Please analyze the following user request and provide a JSON configuration:

User Request: "${userPrompt}"

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "blockchain": "ethereum" | "polygon" | "arbitrum" | "optimism" | "solana",
  "contractType": "erc20" | "erc721" | "erc1155" | "payment-splitter" | "custom",
  "tokenName": "string (required for tokens/NFTs)",
  "tokenSymbol": "string (3-5 chars, all caps)",
  "tokenSupply": "string (number)",
  "decimals": "string (0-18, typically 18 for tokens, 0 for NFTs)",
  "network": "testnet" | "mainnet",
  "features": ["mintable", "burnable", "pausable", "permit", "access-control", "upgradeable"],
  "reasoning": "Brief explanation of your choices"
}

Consider:
- Recommend testnet for new/unaudited contracts
- Recommend pausable + access-control for production tokens
- Choose blockchain based on use case (Polygon for gaming/NFTs, Ethereum for DeFi)
- Default to 18 decimals for ERC-20, 0 for NFTs
- Suggest appropriate features based on security needs`;

    // Call the AI
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
            content: 'You are an expert blockchain developer assistant. Respond ONLY with valid JSON, no markdown formatting.',
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
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
    const aiResponse = data.choices[0]?.message?.content;

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

    const config = JSON.parse(cleanedResponse);

    // Validate the response has required fields
    if (!config.blockchain || !config.contractType) {
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      );
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

