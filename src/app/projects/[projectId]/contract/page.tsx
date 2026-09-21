"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  CheckCircle2,
  Loader2,
  XCircle,
  Zap,
  Shield,
  Activity,
  Globe,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ContractInteraction } from '@/modules/projects/ui/components/ContractInteraction';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { motion } from 'framer-motion';
import type { Abi } from 'viem';

export default function ContractPage() {
  return (
    <WalletProvider>
      <ContractPageContent />
    </WalletProvider>
  );
}

function ContractPageContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<{
    name: string;
    tokenName: string;
    tokenSymbol: string;
    contractType: string;
    blockchain: string;
    network: string;
    contractAddress?: string;
  } | null>(null);
  const [buildJob, setBuildJob] = useState<{
    id: string;
    status: string;
    contractAddress?: string;
    transactionHash?: string;
    artifacts?: {
      abi: unknown[];
      verified?: boolean;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch project
        const projectRes = await fetch(`/api/projects/${projectId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData);
        }

        // Fetch build jobs to get contract address and artifacts
        const jobsRes = await fetch(`/api/projects/${projectId}/build-jobs`);
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          console.log('🔍 Contract page - build jobs data:', jobsData);
          
          // Find the latest deployed contract (prioritize jobs with contractAddress)
          const deployedJob = jobsData.buildJobs?.find(
            (job: { contractAddress?: string }) => job.contractAddress
          );
          
          console.log('🔍 Contract page - deployed job found:', deployedJob);
          
          if (deployedJob) {
            setBuildJob(deployedJob);
          } else {
            // Fallback: use the latest job if no deployed contract found
            const latestJob = jobsData.buildJobs?.[0];
            console.log('🔍 Contract page - using latest job as fallback:', latestJob);
            if (latestJob) {
              setBuildJob(latestJob);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplorerUrl = () => {
    if (!project) return 'https://etherscan.io';
    
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
    
    const key = `${project.blockchain}-${project.network}`;
    return explorers[key] || 'https://etherscan.io';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-pulse"></div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading Contract</h3>
          <p className="text-text-secondary">Fetching contract details and interaction interface...</p>
        </motion.div>
      </div>
    );
  }

  // Check for contract address in both Project and BuildJob
  const contractAddress = project?.contractAddress || buildJob?.contractAddress;
  
  console.log('🔍 Contract page debug:', {
    projectId,
    hasProject: !!project,
    projectContractAddress: project?.contractAddress,
    hasBuildJob: !!buildJob,
    buildJobContractAddress: buildJob?.contractAddress,
    finalContractAddress: contractAddress,
    buildJobStatus: buildJob?.status,
    buildJobId: buildJob?.id
  });

  if (!project || !contractAddress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg mx-auto p-8"
        >
          <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-white" />
                </div>
                <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-red-500 to-pink-500 opacity-20 animate-pulse"></div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">No Deployed Contract Found</h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                This project doesn&apos;t have a deployed contract yet. Deploy your smart contract to start interacting with it on the blockchain.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="border-white/20 text-white hover:bg-white/20 hover:text-black hover:border-white/30 transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button
                  onClick={() => router.push(`/projects/${projectId}/deploy`)}
                  className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Deploy Contract
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const artifacts = buildJob?.artifacts as { abi: unknown[]; verified?: boolean };

  const networkLabel = `${project.blockchain} ${project.network}`;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="absolute top-1/3 right-0 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14 space-y-10">
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-3xl border border-white/12 bg-white/5 shadow-[0_20px_60px_-20px_rgba(14,34,64,0.7)] backdrop-blur-2xl"
          >
            <div className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="h-6 px-2 text-xs border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    Back
                  </Button>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className="h-6 px-2 py-0 text-xs border-emerald-400/50 bg-emerald-400/15 text-emerald-100">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Deployed
                    </Badge>
                    <Badge className="h-6 px-2 py-0 text-xs border-blue-400/40 bg-blue-500/15 text-blue-100">
                      <Shield className="mr-1 h-3 w-3" />
                      {project.contractType}
                    </Badge>
                    <Badge className="h-6 px-2 py-0 text-xs border-white/20 bg-white/10 text-text-secondary">
                      <Globe className="mr-1 h-3 w-3" />
                      {networkLabel}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-text-tertiary">Contract Interaction</p>
                  <h1 className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-white md:text-4xl">
                    {project.tokenName || project.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                    <span className="inline-flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      {project.tokenSymbol}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {project.contractType} Contract
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Latest Build Ready
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/15 bg-black/60 px-5 py-6 text-sm text-text-secondary">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Address</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(contractAddress)}
                      className="h-7 w-7 text-text-secondary hover:bg-white/20 hover:text-black"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => window.open(`${getExplorerUrl()}/address/${contractAddress}`, '_blank')}
                      className="h-7 w-7 text-text-secondary hover:bg-white/20 hover:text-black"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <code className="block truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white/80">
                  {contractAddress}
                </code>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Build Job</p>
                    <p className="mt-2 text-sm font-semibold text-white">{buildJob?.id.slice(0, 8)}…</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Status</p>
                    <p className="mt-2 text-sm font-semibold text-white/80">{buildJob?.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <ContractInteraction
            contractAddress={contractAddress}
            contractABI={(artifacts?.abi as Abi | undefined) ?? []}
            blockchain={project.blockchain}
            network={project.network}
            buildJob={buildJob ? {
              id: buildJob.id,
              status: buildJob.status,
              transactionHash: buildJob.transactionHash,
              artifacts: buildJob.artifacts ? {
                verified: buildJob.artifacts.verified
              } : undefined
            } : undefined}
            getExplorerUrl={getExplorerUrl}
          />
        </div>
      </div>
    </div>
  );
}

