"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { ContractInteraction } from '@/modules/projects/ui/components/ContractInteraction';
import { WalletProvider } from '@/components/providers/wallet-provider';

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
  
  const [project, setProject] = useState<any>(null);
  const [buildJob, setBuildJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
          // Find the latest deployed contract
          const deployedJob = jobsData.buildJobs?.find(
            (job: any) => job.contractAddress && job.artifacts
          );
          if (deployedJob) {
            setBuildJob(deployedJob);
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
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60 mx-auto mb-4" />
          <p className="text-white/60">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (!project || !buildJob || !buildJob.contractAddress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-white/60 mb-4">No deployed contract found for this project.</p>
          <Button
            onClick={() => router.push(`/projects/${projectId}/deploy`)}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            Deploy Contract
          </Button>
        </div>
      </div>
    );
  }

  const artifacts = buildJob.artifacts as any;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Badge variant="outline" className="border-green-500/20 text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Deployed
            </Badge>
            <Badge variant="outline" className="border-white/20 text-white/70">
              {project.contractType}
            </Badge>
            <Badge variant="outline" className="border-white/20 text-white/70">
              {project.blockchain} {project.network}
            </Badge>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            {project.tokenName || project.name}
          </h1>
          
          <div className="flex items-center gap-4 text-white/60">
            <span>{project.tokenSymbol}</span>
            <span>•</span>
            <span>{project.contractType} Token</span>
          </div>
        </div>

        {/* Contract Interaction UI */}
        <ContractInteraction
          contractAddress={buildJob.contractAddress}
          contractABI={artifacts.abi || []}
          blockchain={project.blockchain}
          network={project.network}
        />

        {/* Additional Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {buildJob.transactionHash && (
            <div className="p-4 rounded-lg border border-white/10 bg-white/5">
              <p className="text-sm text-white/60 mb-2">Deployment Transaction</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-white font-mono flex-1 truncate">
                  {buildJob.transactionHash}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(`${getExplorerUrl()}/tx/${buildJob.transactionHash}`, '_blank')}
                  className="text-white/60 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {artifacts.verified && (
            <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">Contract Verified</p>
                  <p className="text-xs text-white/60">Source code verified on block explorer</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

