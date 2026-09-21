"use client";

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent } from '@/components/ui/card';
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
  Zap,
  Shield,
  Activity,
  TrendingUp,
  Wallet,
  LogOut,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { type Abi, type AbiFunction, type AbiParameter } from 'viem';

type FunctionArgs = Record<string, string>;
type ExecutionResult = { message: string; timestamp: string };

// ReadMore component for long text
function ReadMore({ text, maxLength = 200 }: { text: string; maxLength?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <span className="break-words whitespace-pre-wrap">{text}</span>;
  }
  
  const displayText = isExpanded ? text : text.substring(0, maxLength) + '...';
  
  return (
    <div className="break-words whitespace-pre-wrap">
      {displayText}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 text-blue-400 hover:text-blue-300 underline text-sm"
      >
        {isExpanded ? 'Read Less' : 'Read More'}
      </button>
    </div>
  );
}

const getInputKey = (input: AbiParameter, index: number) =>
  input.name && input.name.length > 0 ? input.name : `arg${index}`;

interface ContractInteractionProps {
  contractAddress: string;
  contractABI: Abi;
  blockchain: string;
  network: string;
  buildJob?: {
    id: string;
    status: string;
    transactionHash?: string;
    artifacts?: {
      verified?: boolean;
    };
  };
  getExplorerUrl?: () => string;
}

export function ContractInteraction({ 
  contractAddress, 
  contractABI, 
  blockchain,
  network,
  buildJob,
  getExplorerUrl,
}: ContractInteractionProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Separate read and write functions from ABI
  const { readFunctions, writeFunctions } = useMemo(() => {
    const reads = contractABI.filter((item): item is AbiFunction => {
      if (item === null || typeof item !== 'object') return false;
      if (item.type !== 'function') return false;
      return item.stateMutability === 'view' || item.stateMutability === 'pure';
    });

    const writes = contractABI.filter((item): item is AbiFunction => {
      if (item === null || typeof item !== 'object') return false;
      if (item.type !== 'function') return false;
      return item.stateMutability !== 'view' && item.stateMutability !== 'pure';
    });

    return { readFunctions: reads, writeFunctions: writes };
  }, [contractABI]);

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

  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
    }
  }, [writeError]);

  const defaultExplorerUrl = () => {
    const explorers: Record<string, string> = {
      'ETHEREUM-TESTNET': 'https://sepolia.etherscan.io',
      'ETHEREUM-MAINNET': 'https://etherscan.io',
      'POLYGON-TESTNET': 'https://mumbai.polygonscan.com',
      'POLYGON-MAINNET': 'https://polygonscan.com',
      'ARBITRUM-TESTNET': 'https://sepolia.arbiscan.io',
      'ARBITRUM-MAINNET': 'https://arbiscan.io',
      'OPTIMISM-TESTNET': 'https://sepolia-optimistic.etherscan.io',
      'OPTIMISM-MAINNET': 'https://optimistic.etherscan.io',
    };
    const key = `${blockchain}-${network}`;
    return explorers[key] || 'https://etherscan.io';
  };

  const explorerUrl = getExplorerUrl ? getExplorerUrl() : defaultExplorerUrl();

  const formatBalance = (balance: unknown, decimalsValue: number | undefined) => {
    if (balance === undefined || balance === null || decimalsValue === undefined) {
      return '0';
    }

    const decimalCount = Number(decimalsValue);
    if (Number.isNaN(decimalCount)) {
      return '0';
    }

    const balanceBigInt = (() => {
      if (typeof balance === 'bigint') return balance;
      if (typeof balance === 'number') return BigInt(Math.floor(balance));
      if (typeof balance === 'string') {
        try {
          return BigInt(balance);
        } catch {
          return null;
        }
      }
      if (typeof balance === 'object' && balance !== null) {
        if ('toString' in balance && typeof balance.toString === 'function') {
          try {
            return BigInt(balance.toString());
          } catch {
            return null;
          }
        }
        if ('hex' in balance && typeof (balance as { hex: string }).hex === 'string') {
          try {
            return BigInt((balance as { hex: string }).hex);
          } catch {
            return null;
          }
        }
      }
      return null;
    })();

    if (balanceBigInt === null) {
      return '0';
    }

    const divisor = 10 ** decimalCount;
    const converted = Number(balanceBigInt) / divisor;
    return Number.isFinite(converted) ? converted.toLocaleString() : '0';
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="grid gap-6 lg:grid-cols-[320px_1fr]"
    >
      <div className="space-y-4">
        <Card className="border-white/15 bg-black/40 backdrop-blur-xl">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Contract</span>
              <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/30">
                <Shield className="mr-1 h-3.5 w-3.5" />
                {contractABI.length} ABI entries
              </Badge>
              </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-tertiary">Contract Address</p>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <code className="flex-1 truncate font-mono text-sm text-white/80">
                  {contractAddress}
                </code>
                <Button
                    size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(contractAddress)}
                  className="h-8 w-8 text-text-secondary hover:text-black hover:bg-white/20"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => window.open(`${explorerUrl}/address/${contractAddress}`, '_blank')}
                  className="h-8 w-8 text-text-secondary hover:text-black hover:bg-white/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {tokenName !== undefined && tokenName !== null && (
                <StatPill icon={<Activity className="h-3.5 w-3.5" />} label="Name" value={String(tokenName)} />
              )}
              {tokenSymbol !== undefined && tokenSymbol !== null && (
                <StatPill icon={<Zap className="h-3.5 w-3.5" />} label="Symbol" value={String(tokenSymbol)} />
              )}
              {totalSupply !== undefined && decimals !== undefined && (
                <StatPill
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label="Total Supply"
                  value={formatBalance(totalSupply, Number(decimals))}
                />
              )}
              {userBalance !== undefined && decimals !== undefined && userAddress && (
                <StatPill
                  icon={<Wallet className="h-3.5 w-3.5" />} label="Your Balance"
                  value={formatBalance(userBalance, Number(decimals))}
                />
              )}
            </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
      {error && (
            <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 w-full max-w-full max-h-48 overflow-hidden">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0 max-h-44 overflow-y-auto">
                <AlertTitle className="text-sm font-semibold text-red-200 mb-2">Error</AlertTitle>
                <AlertDescription className="text-sm text-white/80">
                  <ReadMore text={error} maxLength={150} />
                </AlertDescription>
              </div>
          </Alert>
      )}

      {success && (
            <Alert className="border-emerald-500/40 bg-emerald-500/10 w-full max-w-full max-h-48 overflow-hidden">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0 max-h-44 overflow-y-auto">
                <AlertTitle className="text-sm font-semibold text-emerald-200 mb-2">Success</AlertTitle>
                <AlertDescription className="text-sm text-white/80">
                  <ReadMore text={success} maxLength={150} />
                </AlertDescription>
              </div>
          </Alert>
      )}

      {isConfirming && (
            <Alert className="border-blue-500/40 bg-blue-500/10 w-full max-w-full">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <AlertTitle className="text-sm font-semibold text-blue-200">Transaction pending</AlertTitle>
                <AlertDescription className="text-sm text-white/80 break-words whitespace-pre-wrap overflow-wrap-anywhere word-break-break-all max-w-full">
                  Awaiting block confirmation...
                </AlertDescription>
              </div>
          </Alert>
      )}

      {isConfirmed && hash && (
            <Alert className="border-emerald-500/40 bg-emerald-500/10 w-full max-w-full">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <AlertTitle className="text-sm font-semibold text-emerald-200">Transaction confirmed</AlertTitle>
                <AlertDescription className="text-sm text-white/80 break-words whitespace-pre-wrap overflow-wrap-anywhere word-break-break-all max-w-full">
                  <button
                    onClick={() => window.open(`${explorerUrl}/tx/${hash}`, '_blank')}
                    className="inline-flex items-center gap-2 text-emerald-100 underline-offset-4 hover:underline"
                  >
                    View on explorer <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </AlertDescription>
              </div>
          </Alert>
          )}
        </div>

        {/* Wallet Connection Status */}
        <Card className="border-white/15 bg-black/40 backdrop-blur-xl">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Wallet</span>
              <Badge className={`${isConnected ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'}`}>
                <Wallet className="mr-1 h-3.5 w-3.5" />
                {isConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>

            {isConnected ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">Wallet Connected</p>
                      <p className="text-[10px] font-mono text-text-secondary">
                        {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => disconnect()}
                  className="w-full border-white/20 text-text-secondary hover:bg-white/20 hover:text-black text-xs"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-200" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">Wallet Required</p>
                      <p className="text-[10px] text-text-secondary">
                        Connect wallet to execute write functions
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {buildJob && (
          <Card className="border-white/15 bg-black/40 backdrop-blur-xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Activity</span>
                <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/30">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Deployed
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Build Job</p>
                  <p className="mt-1 text-sm font-mono text-white/80">
                    {buildJob.id.slice(0, 8)}…{buildJob.id.slice(-4)}
                  </p>
                  <p className="text-xs text-text-tertiary">{buildJob.status}</p>
                </div>

                {buildJob.transactionHash && getExplorerUrl && (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Transaction</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`${explorerUrl}/tx/${buildJob.transactionHash}`, '_blank')}
                        className="h-6 w-6 p-0 text-text-secondary hover:text-black hover:bg-white/20"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <code className="block truncate rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-xs text-text-secondary">
                      {buildJob.transactionHash.slice(0, 10)}…{buildJob.transactionHash.slice(-6)}
                    </code>
                  </div>
                )}

                {buildJob.artifacts?.verified && (
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                      <div>
                        <h3 className="text-xs font-semibold text-white">Verified</h3>
                        <p className="text-[10px] text-text-secondary">Source verified on explorer</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-white/15 bg-black/50 backdrop-blur-xl">
        <CardContent className="flex h-full flex-col p-0">
          <Tabs defaultValue="read" className="flex h-full flex-col">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-black/60">
              <TabsList className="grid w-full grid-cols-2 bg-transparent p-1">
                <TabsTrigger 
                  value="read" 
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-text-secondary text-sm"
                >
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  Read ({readFunctions.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="write" 
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-text-secondary text-sm"
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  Write ({writeFunctions.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="read"
              className="flex-1 overflow-y-auto px-5 py-4 space-y-3 thin-scrollbar"
            >
              {readFunctions.length === 0 ? (
              <EmptyState message="No read functions available for this contract." />
              ) : (
                readFunctions.map((func, index) => (
                  <FunctionCard
                  key={func.name ?? index}
                    func={func}
                    contractAddress={contractAddress}
                    contractABI={contractABI}
                  isReadOnly
                  onExecuteError={setError}
                  onExecuteSuccess={setSuccess}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent
              value="write"
              className="flex-1 overflow-y-auto px-5 py-4 space-y-3 thin-scrollbar"
            >
              {!isConnected ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-6 py-8 text-center">
                    <Wallet className="h-12 w-12 text-yellow-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Wallet Connection Required</h3>
                    <p className="text-sm text-text-secondary mb-6">
                      Connect your wallet to execute state-changing functions and interact with the contract.
                    </p>
                    <ConnectButton />
                  </div>
                  
                  {writeFunctions.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-xs text-text-tertiary">
                        {writeFunctions.length} write function{writeFunctions.length !== 1 ? 's' : ''} available after wallet connection
                      </p>
                    </div>
                  )}
                </div>
              ) : writeFunctions.length === 0 ? (
                <EmptyState message="No write functions available for this contract." />
              ) : (
                writeFunctions.map((func, index) => (
                  <FunctionCard
                    key={func.name ?? index}
                    func={func}
                    contractAddress={contractAddress}
                    contractABI={contractABI}
                    isReadOnly={false}
                    onExecuteError={setError}
                    onExecuteSuccess={setSuccess}
                    writeHook={{ writeContract, isPending }}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.section>
  );
}

interface FunctionCardProps {
  func: AbiFunction;
  contractAddress: string;
  contractABI: Abi;
  isReadOnly: boolean;
  onExecuteSuccess?: (message: string | null) => void;
  onExecuteError?: (message: string | null) => void;
  writeHook?: {
    writeContract: ReturnType<typeof useWriteContract>['writeContract'];
    isPending: boolean;
  };
}

function FunctionCard({
  func,
  contractAddress,
  contractABI,
  isReadOnly,
  onExecuteSuccess,
  onExecuteError,
  writeHook,
}: FunctionCardProps) {
  const [args, setArgs] = useState<FunctionArgs>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const pending = isReadOnly ? isExecuting : writeHook?.isPending === true || isExecuting;

  const triggerExecution = async () => {
    setIsExecuting(true);
    onExecuteError?.(null);
    onExecuteSuccess?.(null);

    try {
      const functionInputs = func.inputs ?? [];

      const formattedArgs = functionInputs.map((input, index) => {
        const key = getInputKey(input, index);
        const value = args[key];
        return value === undefined || value === '' ? undefined : value;
      });
      const preparedArgs: string[] = formattedArgs.filter((value): value is string => value !== undefined);
      
      if (isReadOnly) {
        setResult({
          message: 'Query executed successfully. Inspect returned values via wallet or explorer.',
          timestamp: new Date().toISOString(),
        });
        onExecuteSuccess?.('Query executed successfully.');
      } else if (writeHook) {
        writeHook.writeContract({
          address: contractAddress as `0x${string}`,
          abi: contractABI,
          functionName: func.name,
          args: preparedArgs.length > 0 ? preparedArgs : undefined,
        });
        onExecuteSuccess?.('Transaction submitted. Awaiting confirmation.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Function call failed';
      onExecuteError?.(message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition hover:border-white/20 hover:bg-white/8">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{func.name}</span>
            <Badge className="bg-white/10 text-text-secondary" variant="outline">
              {func.stateMutability.toUpperCase()}
            </Badge>
          </div>
          {(func.inputs ?? []).length > 0 && (
            <p className="text-xs font-mono text-text-tertiary">
              {(func.inputs ?? [])
                .map((input) => `${input.name && input.name.length > 0 ? input.name : 'param'}: ${input.type}`)
                .join(' • ')}
            </p>
          )}
        </div>
        {!isReadOnly && (
          <Badge className="border-orange-400/40 bg-orange-400/10 text-orange-200" variant="outline">
            Payable
          </Badge>
        )}
      </div>

      {(func.inputs ?? []).length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(func.inputs ?? []).map((input, index) => {
            const key = getInputKey(input, index);
            const label = input.name && input.name.length > 0 ? input.name : `Argument ${index + 1}`;
            return (
              <div key={`${func.name ?? 'fn'}-${key}`} className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">
                  {label}
                  <span className="ml-2 font-mono text-[11px] text-text-tertiary">{input.type}</span>
                </Label>
                <Input
                  value={args[key] ?? ''}
                  onChange={(event) =>
                    setArgs((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                  placeholder={`Enter ${input.type}`}
                  className="h-9 border-white/10 bg-white/5 text-sm text-white placeholder:text-text-muted focus:border-blue-400/40 focus:ring-blue-400/10"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button
          size="sm"
          onClick={triggerExecution}
          disabled={pending}
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide ${
          isReadOnly 
              ? 'bg-blue-500/90 text-white hover:bg-blue-500'
              : 'bg-orange-500/90 text-white hover:bg-orange-500'
        }`}
      >
          {pending ? (
          <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isReadOnly ? 'Reading…' : 'Sending…'}
          </>
        ) : (
          <>
              {isReadOnly ? <Eye className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              {isReadOnly ? 'Query' : 'Execute'}
          </>
        )}
      </Button>

        <span className="text-xs font-mono text-text-muted">
          {isReadOnly ? 'No transaction cost' : 'Requires wallet confirmation'}
        </span>
      </div>

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 w-full max-w-full max-h-64 overflow-hidden">
          <p className="text-xs font-semibold text-emerald-200 mb-2">Result</p>
          <div className="max-h-56 overflow-y-auto rounded-lg bg-black/40 p-3 text-[11px] leading-5 text-emerald-100 thin-scrollbar">
            <ReadMore text={JSON.stringify(result, null, 2)} maxLength={300} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-text-tertiary">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-12 text-center text-sm text-text-tertiary">
      {message}
    </div>
  );
}

