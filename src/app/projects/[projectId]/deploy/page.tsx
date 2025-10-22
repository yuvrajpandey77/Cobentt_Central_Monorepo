"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { WalletStep } from '@/modules/projects/ui/deploy-wizard/WalletStep';
import { FundStep } from '@/modules/projects/ui/deploy-wizard/FundStep';
import { DeployStep } from '@/modules/projects/ui/deploy-wizard/DeployStep';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useTRPC } from '@/trpc/client';

const DEPLOY_STEPS = [
  { id: 'wallet', title: 'Connect Wallet', description: 'Connect your wallet to deploy' },
  { id: 'fund', title: 'Check Balance', description: 'Ensure sufficient funds for gas' },
  { id: 'deploy', title: 'Deploy Contract', description: 'Deploy your smart contract' },
  { id: 'verify', title: 'Verify Contract', description: 'Verify contract on explorer' },
];

// Wrapper component that handles wagmi provider
function DeployPageWrapper() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60 mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }
  
  return <DeployPageContent />;
}

function DeployPageContent() {
  const params = useParams();
  const projectId = params.projectId as string;
  const trpc = useTRPC();
  const [currentStep, setCurrentStep] = useState(0);
  const [contractArtifacts, setContractArtifacts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  // Use wagmi hook (safe because component only renders after mounting)
  const { address } = useAccount();

  // Fetch project and build jobs data
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        // Fetch project data
        const projectResponse = await fetch(`/api/projects/${projectId}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setProject(projectData);
        }

        // Fetch build jobs
        const jobsResponse = await fetch(`/api/projects/${projectId}/build-jobs`);
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          
          // Set contract artifacts from latest job
          if (jobsData.buildJobs && jobsData.buildJobs.length > 0) {
            const latestJob = jobsData.buildJobs[0];
            if (latestJob.artifacts) {
              setContractArtifacts(latestJob.artifacts);
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
      fetchProjectData();
    }
  }, [projectId]);

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, DEPLOY_STEPS.length - 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleGetFaucet = async () => {
    if (!address) return;
    
    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          network: 'sepolia', // Default to Sepolia for now
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Faucet request successful:', data.message);
        // You could show a toast notification here
        alert(`Testnet ETH requested! ${data.message}`);
      } else {
        console.error('Faucet request failed');
        alert('Faucet request failed. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting faucet:', error);
      alert('Error requesting faucet. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60 mx-auto mb-4" />
          <p className="text-white/60">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Badge variant="outline" className="border-white/20 text-white/70">
              {project.projectType}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{project.name}</h1>
          <p className="text-white/60">
            Deploy your {project.contractType} contract to {project.blockchain} {project.network}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {DEPLOY_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      index <= currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${
                      index <= currentStep ? 'text-white' : 'text-white/60'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-white/50">{step.description}</p>
                  </div>
                </div>
                {index < DEPLOY_STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-white/20 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {currentStep === 0 && (
            <WalletStep onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 1 && (
            <FundStep 
              onNext={nextStep} 
              onBack={prevStep} 
              onGetFaucet={handleGetFaucet}
            />
          )}
          {currentStep === 2 && (
            <DeployStep
              onNext={nextStep}
              onBack={prevStep}
              contractABI={contractArtifacts?.abi || []}
              contractBytecode={contractArtifacts?.bytecode || ''}
            />
          )}
          {currentStep === 3 && (
            <Card className="border-white/10 bg-white/8 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                  Contract Verified
                </CardTitle>
                <p className="text-sm text-white/60">
                  Your contract has been successfully deployed and verified
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/10">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Deployment Complete!</p>
                      <p className="text-xs text-white/60">
                        Your contract is now live and verified on the blockchain
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => window.location.href = `/projects/${projectId}/contract`}
                    className="bg-green-500 text-white hover:bg-green-600"
                  >
                    Interact with Contract
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = `/projects/${projectId}`}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    View Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeployPage() {
  return (
    <WalletProvider>
      <DeployPageWrapper />
    </WalletProvider>
  );
}
