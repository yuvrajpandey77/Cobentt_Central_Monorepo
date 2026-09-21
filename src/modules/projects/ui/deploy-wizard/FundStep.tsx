"use client";

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Coins, ExternalLink } from 'lucide-react';

interface FundStepProps {
  onNext: () => void;
  onBack: () => void;
  onGetFaucet?: () => void;
}

export function FundStep({ onNext, onBack, onGetFaucet }: FundStepProps) {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });
  
  const [isCheckingBalance, setIsCheckingBalance] = useState(true);

  useEffect(() => {
    if (balance) {
      setIsCheckingBalance(false);
    }
  }, [balance]);

  const hasEnoughBalance = balance && parseFloat(balance.formatted) > 0.001; // 0.001 ETH minimum
  const isTestnet = balance?.symbol === 'ETH' && balance.formatted.includes('.'); // Simple testnet detection

  return (
    <Card className="border-white/10 bg-white/8 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Coins className="h-5 w-5" />
          Check Balance
        </CardTitle>
        <p className="text-sm text-text-secondary">
          Ensure your wallet has enough funds for gas fees
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isCheckingBalance ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40 mx-auto mb-4"></div>
            <p className="text-text-secondary">Checking wallet balance...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">Current Balance</p>
                <Badge variant="outline" className="border-white/20 text-text-secondary">
                  {balance?.symbol}
                </Badge>
              </div>
              <p className="text-lg font-mono text-white">
                {balance?.formatted} {balance?.symbol}
              </p>
            </div>

            {hasEnoughBalance ? (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">Sufficient Balance</p>
                  <p className="text-xs text-text-secondary">
                    You have enough funds to deploy your contract
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Insufficient Balance</p>
                    <p className="text-xs text-text-secondary">
                      You need at least 0.001 ETH for gas fees
                    </p>
                  </div>
                </div>

                {isTestnet && onGetFaucet && (
                  <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/10">
                    <div className="flex items-start gap-3">
                      <Coins className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">Get Testnet ETH</p>
                        <p className="text-xs text-text-secondary">
                          Use our faucet to get free testnet ETH for deployment
                        </p>
                        <Button
                          onClick={onGetFaucet}
                          size="sm"
                          className="bg-blue-500 text-white hover:bg-blue-600"
                        >
                          Get Testnet ETH
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <p className="text-sm font-medium text-white mb-2">Alternative Options</p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between border-white/20 text-white hover:bg-white/20 hover:text-black"
                      onClick={() => window.open('https://faucets.chain.link/', '_blank')}
                    >
                      <span>Chainlink Faucets</span>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between border-white/20 text-white hover:bg-white/20 hover:text-black"
                      onClick={() => window.open('https://faucet.quicknode.com/', '_blank')}
                    >
                      <span>QuickNode Faucet</span>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="border-white/20 text-white hover:bg-white/20 hover:text-black"
              >
                Back
              </Button>
              {hasEnoughBalance && (
                <Button
                  onClick={onNext}
                  className="bg-blue-500 text-white hover:bg-blue-600"
                >
                  Continue to Deployment
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

