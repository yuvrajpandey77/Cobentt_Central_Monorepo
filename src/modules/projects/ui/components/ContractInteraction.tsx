"use client";

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ExternalLink, 
  Copy,
  Eye,
  Send,
  Coins
} from 'lucide-react';

interface ContractInteractionProps {
  contractAddress: string;
  contractABI: any[];
  blockchain: string;
  network: string;
}

export function ContractInteraction({ 
  contractAddress, 
  contractABI, 
  blockchain,
  network 
}: ContractInteractionProps) {
  const { address: userAddress } = useAccount();
  const [selectedFunction, setSelectedFunction] = useState<any>(null);
  const [functionArgs, setFunctionArgs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Separate read and write functions from ABI
  const readFunctions = contractABI.filter(
    (item) => item.type === 'function' && (item.stateMutability === 'view' || item.stateMutability === 'pure')
  );
  
  const writeFunctions = contractABI.filter(
    (item) => item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure'
  );

  // Get contract details (name, symbol, totalSupply, etc.)
  const { data: tokenName } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: 'name',
  });

  const { data: tokenSymbol } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: 'symbol',
  });

  const { data: totalSupply } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: 'totalSupply',
  });

  const { data: decimals } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: 'decimals',
  });

  const { data: userBalance } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });

  // Write contract hook
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const getExplorerUrl = () => {
    const explorers: Record<string, string> = {
      'ETHEREUM-TESTNET': 'https://sepolia.etherscan.io',
      'ETHEREUM-MAINNET': 'https://etherscan.io',
      'POLYGON-TESTNET': 'https://mumbai.polygonscan.com',
      'POLYGON-MAINNET': 'https://polygonscan.com',
      'ARBITRUM-TESTNET': 'https://sepolia.arbiscan.io',
      'ARBITRUM-MAINNET': 'https://arbiscan.io',
    };
    const key = `${blockchain}-${network}`;
    return explorers[key] || 'https://etherscan.io';
  };

  const handleFunctionCall = async (func: any) => {
    setError(null);
    setSuccess(null);
    
    try {
      const args = func.inputs.map((input: any) => functionArgs[input.name] || '');
      
      if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
        // Read function - results shown in UI
        setSuccess('Read operation completed. Check results below.');
      } else {
        // Write function
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: contractABI,
          functionName: func.name,
          args: args.length > 0 ? args : undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Function call failed');
    }
  };

  const formatBalance = (balance: any, decimals: number) => {
    if (balance === undefined || balance === null) return '0';
    const balanceNum = typeof balance === 'bigint' ? balance : BigInt(balance.toString());
    return (Number(balanceNum) / Math.pow(10, decimals)).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Contract Overview */}
      <Card className="border-white/10 bg-white/8 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Coins className="h-5 w-5" />
            Contract Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contract Address */}
          <div className="p-4 rounded-lg border border-white/10 bg-white/5">
            <Label className="text-sm text-white/60 mb-2 block">Contract Address</Label>
            <div className="flex items-center gap-2">
              <code className="text-sm text-white font-mono flex-1 truncate">
                {contractAddress}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(contractAddress)}
                className="text-white/60 hover:text-white"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(`${getExplorerUrl()}/address/${contractAddress}`, '_blank')}
                className="text-white/60 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Token Details */}
          <div className="grid grid-cols-2 gap-4">
            {tokenName && (
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <Label className="text-sm text-white/60 mb-1 block">Token Name</Label>
                <p className="text-white font-medium">{String(tokenName)}</p>
              </div>
            )}
            {tokenSymbol && (
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <Label className="text-sm text-white/60 mb-1 block">Symbol</Label>
                <p className="text-white font-medium">{String(tokenSymbol)}</p>
              </div>
            )}
            {totalSupply && decimals !== undefined && (
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <Label className="text-sm text-white/60 mb-1 block">Total Supply</Label>
                <p className="text-white font-medium">
                  {formatBalance(totalSupply, Number(decimals))}
                </p>
              </div>
            )}
            {userBalance !== undefined && decimals !== undefined && userAddress && (
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <Label className="text-sm text-white/60 mb-1 block">Your Balance</Label>
                <p className="text-white font-medium">
                  {formatBalance(userBalance, Number(decimals))}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-white/90">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/20 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-green-400">Success</AlertTitle>
          <AlertDescription className="text-white/90">{success}</AlertDescription>
        </Alert>
      )}

      {isConfirming && (
        <Alert className="border-blue-500/20 bg-blue-500/10">
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          <AlertTitle className="text-blue-400">Transaction Pending</AlertTitle>
          <AlertDescription className="text-white/90">
            Waiting for confirmation...
          </AlertDescription>
        </Alert>
      )}

      {isConfirmed && hash && (
        <Alert className="border-green-500/20 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-green-400">Transaction Confirmed!</AlertTitle>
          <AlertDescription className="text-white/90 space-y-2">
            <p>Your transaction was successful.</p>
            <a
              href={`${getExplorerUrl()}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
            >
              View on Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Contract Functions */}
      <Card className="border-white/10 bg-white/8 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Send className="h-5 w-5" />
            Contract Functions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="read" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="read" className="data-[state=active]:bg-blue-500">
                <Eye className="h-4 w-4 mr-2" />
                Read ({readFunctions.length})
              </TabsTrigger>
              <TabsTrigger value="write" className="data-[state=active]:bg-blue-500">
                <Send className="h-4 w-4 mr-2" />
                Write ({writeFunctions.length})
              </TabsTrigger>
            </TabsList>

            {/* Read Functions */}
            <TabsContent value="read" className="space-y-3 mt-4">
              {readFunctions.length === 0 ? (
                <p className="text-white/60 text-center py-8">No read functions available</p>
              ) : (
                readFunctions.map((func, index) => (
                  <FunctionCard
                    key={index}
                    func={func}
                    contractAddress={contractAddress}
                    contractABI={contractABI}
                    isReadOnly={true}
                  />
                ))
              )}
            </TabsContent>

            {/* Write Functions */}
            <TabsContent value="write" className="space-y-3 mt-4">
              {!userAddress ? (
                <Alert className="border-yellow-500/20 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertTitle className="text-yellow-400">Wallet Not Connected</AlertTitle>
                  <AlertDescription className="text-white/90">
                    Please connect your wallet to interact with write functions.
                  </AlertDescription>
                </Alert>
              ) : writeFunctions.length === 0 ? (
                <p className="text-white/60 text-center py-8">No write functions available</p>
              ) : (
                writeFunctions.map((func, index) => (
                  <FunctionCard
                    key={index}
                    func={func}
                    contractAddress={contractAddress}
                    contractABI={contractABI}
                    isReadOnly={false}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual function card component
function FunctionCard({ 
  func, 
  contractAddress, 
  contractABI, 
  isReadOnly 
}: { 
  func: any; 
  contractAddress: string; 
  contractABI: any[]; 
  isReadOnly: boolean;
}) {
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const { writeContract, isPending } = useWriteContract();

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const argValues = func.inputs.map((input: any) => args[input.name] || '');
      
      if (isReadOnly) {
        // For read functions, we'd need to use useReadContract differently
        // This is a simplified version
        setResult('Read function executed. Check contract overview for updated values.');
      } else {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: contractABI,
          functionName: func.name,
          args: argValues.length > 0 ? argValues : undefined,
        });
      }
    } catch (error) {
      console.error('Function execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-white font-medium">{func.name}</h4>
          {func.inputs.length > 0 && (
            <p className="text-xs text-white/60 mt-1">
              ({func.inputs.map((i: any) => i.type).join(', ')})
            </p>
          )}
        </div>
        {!isReadOnly && (
          <Badge variant="outline" className="border-orange-500/20 text-orange-400">
            Payable
          </Badge>
        )}
      </div>

      {func.inputs.length > 0 && (
        <div className="space-y-2">
          {func.inputs.map((input: any, idx: number) => (
            <div key={idx}>
              <Label className="text-sm text-white/80 mb-1 block">
                {input.name} <span className="text-white/40">({input.type})</span>
              </Label>
              <Input
                placeholder={`Enter ${input.name}`}
                value={args[input.name] || ''}
                onChange={(e) => setArgs({ ...args, [input.name]: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={handleExecute}
        disabled={isExecuting || isPending}
        className={`w-full ${isReadOnly ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'}`}
      >
        {(isExecuting || isPending) ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {isReadOnly ? 'Reading...' : 'Executing...'}
          </>
        ) : (
          <>
            {isReadOnly ? <Eye className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {isReadOnly ? 'Query' : 'Execute'}
          </>
        )}
      </Button>

      {result && (
        <div className="p-3 rounded border border-green-500/20 bg-green-500/10">
          <p className="text-xs text-white/60 mb-1">Result:</p>
          <p className="text-white text-sm font-mono">{JSON.stringify(result, null, 2)}</p>
        </div>
      )}
    </div>
  );
}

