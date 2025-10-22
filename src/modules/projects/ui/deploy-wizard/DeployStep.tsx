"use client";

import { useState, useEffect } from 'react';
import { useAccount, useDeployContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Loader2, AlertCircle, ExternalLink, XCircle } from 'lucide-react';

interface DeployStepProps {
  onNext: () => void;
  onBack: () => void;
  contractABI: any[];
  contractBytecode: string;
  constructorArgs?: any[];
}

export function DeployStep({ onNext, onBack, contractABI, contractBytecode, constructorArgs = [] }: DeployStepProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { deployContract, data: hash, error: writeError, isPending } = useDeployContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const handleDeploy = async () => {
    if (!contractABI || !contractBytecode) {
      setError('Contract artifacts not available');
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      // Deploy the contract
      deployContract({
        abi: contractABI,
        bytecode: contractBytecode as `0x${string}`,
        args: constructorArgs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
      setIsDeploying(false);
    }
  };

  // Extract real contract address from transaction receipt
  useEffect(() => {
    const extractContractAddress = async () => {
      if (isConfirmed && hash && publicClient) {
        try {
          setIsDeploying(false);
          
          // Get transaction receipt to extract contract address
          const txReceipt = await publicClient.getTransactionReceipt({ hash });
          
          if (txReceipt && txReceipt.contractAddress) {
            const contractAddress = txReceipt.contractAddress;
            setDeployedAddress(contractAddress);
            
            console.log('Contract deployed at:', contractAddress);
            console.log('Transaction hash:', hash);
            
            // Optional: Save to database via API
            // This could be done in a separate step or automatically
            /*
            try {
              await fetch(`/api/projects/${projectId}/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  buildJobId: 'current-build-job-id', // You'd pass this as prop
                  contractAddress,
                  transactionHash: hash,
                }),
              });
            } catch (saveError) {
              console.error('Failed to save deployment to database:', saveError);
            }
            */
          } else {
            console.error('No contract address in receipt');
            setError('Failed to extract contract address from transaction');
          }
        } catch (err) {
          console.error('Error extracting contract address:', err);
          setError('Failed to get contract address');
        }
      }
    };

    extractContractAddress();
  }, [isConfirmed, hash, publicClient]);

  // Show write error if contract deployment fails
  useEffect(() => {
    if (writeError) {
      const errorMessage = writeError.message;
      if (errorMessage.includes('User rejected')) {
        setError('Transaction was rejected. Please try again.');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient funds for gas fees. Please add more ETH to your wallet.');
      } else if (errorMessage.includes('nonce')) {
        setError('Transaction nonce error. Please try again.');
      } else {
        setError(`Deployment failed: ${errorMessage.substring(0, 100)}...`);
      }
      setIsDeploying(false);
    }
  }, [writeError]);

  const isDeploymentComplete = isConfirmed && deployedAddress;

  return (
    <Card className="border-white/10 bg-white/8 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <CheckCircle2 className="h-5 w-5" />
          Deploy Contract
        </CardTitle>
        <p className="text-sm text-white/60">
          Deploy your smart contract to the blockchain
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Deployment Error</AlertTitle>
            <AlertDescription className="text-white/90">{error}</AlertDescription>
          </Alert>
        )}

        {!isDeploymentComplete ? (
          <div className="space-y-4">
            {/* Contract Info */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">Contract Details</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-white/60">ABI Functions</p>
                    <p className="text-white font-mono">{contractABI?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Bytecode Size</p>
                    <p className="text-white font-mono">
                      {contractBytecode ? `${Math.round(contractBytecode.length / 2)} bytes` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Deployment Status */}
            {isDeploying && (
              <div className="space-y-3">
                {isPending && (
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/10">
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-white">Deploying Contract</p>
                      <p className="text-xs text-white/60">Please confirm the transaction in your wallet</p>
                    </div>
                  </div>
                )}

                {isConfirming && (
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10">
                    <Loader2 className="h-5 w-5 text-yellow-400 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-white">Confirming Transaction</p>
                      <p className="text-xs text-white/60">Waiting for blockchain confirmation...</p>
                    </div>
                  </div>
                )}

                {hash && (
                  <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                    <p className="text-sm font-medium text-white mb-2">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-white/80 bg-white/10 px-2 py-1 rounded">
                        {hash.slice(0, 10)}...{hash.slice(-8)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://etherscan.io/tx/${hash}`, '_blank')}
                        className="text-white/60 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-white">Deployment Failed</p>
                  <p className="text-xs text-white/60">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isDeploying}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                onClick={handleDeploy}
                disabled={isDeploying || !contractABI || !contractBytecode}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  'Deploy Contract'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success State */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-white">Contract Deployed Successfully!</p>
                <p className="text-xs text-white/60">
                  Your contract is now live on the blockchain
                </p>
              </div>
            </div>

            {/* Contract Address */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5">
              <p className="text-sm font-medium text-white mb-2">Contract Address</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-white/80 bg-white/10 px-2 py-1 rounded flex-1">
                  {deployedAddress}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://etherscan.io/address/${deployedAddress}`, '_blank')}
                  className="text-white/60 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                onClick={onNext}
                className="bg-green-500 text-white hover:bg-green-600"
              >
                Continue to Verification
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
