"use client";

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Wallet, AlertCircle } from 'lucide-react';

interface WalletStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function WalletStep({ onNext, onBack }: WalletStepProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <Card className="border-white/10 bg-white/8 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <p className="text-sm text-white/60">
          Connect your wallet to deploy your smart contract
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-white">Wallet Connected</p>
                <p className="text-xs text-white/60 font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Ready to Deploy</p>
                  <p className="text-xs text-white/60">
                    Your wallet is connected and ready for contract deployment. 
                    Make sure you have enough ETH for gas fees.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => disconnect()}
                className="border-white/20 text-white hover:bg-white/20 hover:text-black"
              >
                Disconnect
              </Button>
              <Button
                onClick={onNext}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                Continue to Deployment
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 mb-6">
                Connect your wallet to continue with deployment
              </p>
              <ConnectButton />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="border-white/20 text-white hover:bg-white/20 hover:text-black"
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

