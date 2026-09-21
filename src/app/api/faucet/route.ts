import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

const faucetSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  network: z.enum(['sepolia', 'polygon-mumbai', 'arbitrum-sepolia', 'optimism-sepolia']),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = faucetSchema.parse(body);

    // Throttle per user: unauthenticated, unthrottled server-side POSTs to
    // third parties are free abuse/egress. Fail closed if Redis is down.
    const rateLimit = await checkRateLimit(`faucet:${userId}`, {
      requests: 5,
      window: "60 s",
      failClosed: true,
    });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many faucet requests. Try again later.' },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
      );
    }
    
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

