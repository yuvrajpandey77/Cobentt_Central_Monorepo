import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

const faucetSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  network: z.enum(['sepolia', 'polygon-mumbai', 'arbitrum-sepolia', 'optimism-sepolia']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = faucetSchema.parse(body);

    // Rate limiting - simple implementation
    const rateLimitKey = `faucet_${validatedData.address}_${validatedData.network}`;
    
    // In production, you'd use Redis or similar for rate limiting
    // For now, we'll just simulate the faucet request
    
    const faucetUrls = {
      'sepolia': 'https://sepoliafaucet.com',
      'polygon-mumbai': 'https://faucet.polygon.technology',
      'arbitrum-sepolia': 'https://faucet.quicknode.com/arbitrum/sepolia',
      'optimism-sepolia': 'https://faucet.quicknode.com/optimism/sepolia',
    };

    const faucetUrl = faucetUrls[validatedData.network];
    
    // Simulate faucet request
    const faucetResponse = await fetch(faucetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: validatedData.address,
        network: validatedData.network,
      }),
    });

    if (faucetResponse.ok) {
      return NextResponse.json({ 
        success: true, 
        message: `Testnet ETH requested for ${validatedData.address} on ${validatedData.network}`,
        faucetUrl 
      });
    } else {
      return NextResponse.json(
        { error: 'Faucet request failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error requesting faucet:', error);
    return NextResponse.json(
      { error: 'Failed to request testnet ETH' },
      { status: 500 }
    );
  }
}

