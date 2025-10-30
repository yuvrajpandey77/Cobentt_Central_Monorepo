"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { WalletStep } from '@/modules/projects/ui/deploy-wizard/WalletStep';
import { FundStep } from '@/modules/projects/ui/deploy-wizard/FundStep';
import { DeployStep } from '@/modules/projects/ui/deploy-wizard/DeployStep';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CheckCircle2, ArrowLeft, ArrowRight, Loader2, Rocket, Wallet, Coins, Shield, ExternalLink } from 'lucide-react';
import { useTRPC } from '@/trpc/client';

const DEPLOY_STEPS = [
  { id: 'wallet', title: 'Connect Wallet', description: 'Connect your wallet to deploy', icon: Wallet },
  { id: 'fund', title: 'Check Balance', description: 'Ensure sufficient funds for gas', icon: Coins },
  { id: 'deploy', title: 'Deploy Contract', description: 'Deploy your smart contract', icon: Rocket },
  { id: 'verify', title: 'Verify Contract', description: 'Verify contract on explorer', icon: Shield },
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
  const router = useRouter();
  const projectId = params.projectId as string;
  const trpc = useTRPC();
  const [currentStep, setCurrentStep] = useState(0);
  const [contractArtifacts, setContractArtifacts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'completed' | 'failed'>('idle');

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
            console.log('🔍 Latest build job:', latestJob);
            console.log('🔍 Job artifacts:', latestJob.artifacts);
            if (latestJob.artifacts) {
              // Include buildJobId in artifacts for deployment
              const artifactsWithJobId = {
                ...latestJob.artifacts,
                buildJobId: latestJob.id
              };
              setContractArtifacts(artifactsWithJobId);
              console.log('✅ Contract artifacts set:', artifactsWithJobId);
            } else {
              console.log('❌ No artifacts found in latest job');
            }
          } else {
            console.log('❌ No build jobs found');
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">Project not found</p>
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentStep + 1) / DEPLOY_STEPS.length) * 100;

  return (
    <div className="h-screen bg-black">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel - Deployment Progress & Info */}
        <ResizablePanel
          defaultSize={30}
          minSize={20}
          maxSize={50}
          className="flex flex-col min-h-0"
        >
          {/* Header */}
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}/build`)}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Build
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {deploymentStatus === 'deploying' && (
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Deploying...
                  </Badge>
                )}
                {deploymentStatus === 'completed' && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Deployed
                  </Badge>
                )}
                {deploymentStatus === 'failed' && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="mt-4">
              <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white">
                Deploy Contract
              </h1>
              <p className="text-white/60 text-sm">
                {project?.contractType} • {project?.blockchain} {project?.network}
              </p>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-4">
            {/* Project Summary */}
            <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">Project Details</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/60">Contract Name</p>
                    <p className="text-white font-medium text-sm">{project?.tokenName || project?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Contract Type</p>
                    <p className="text-white font-medium text-sm">{project?.contractType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Blockchain</p>
                    <p className="text-white font-medium text-sm">{project?.blockchain}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Network</p>
                    <p className="text-white font-medium text-sm capitalize">{project?.network?.toLowerCase()}</p>
                  </div>
                </div>

                {project?.features && project.features.length > 0 && (
                  <div>
                    <p className="text-xs text-white/60 mb-2">Features</p>
                    <div className="flex flex-wrap gap-1">
                      {project.features.map((feature: string) => (
                        <Badge key={feature} variant="outline" className="border-white/20 text-white/70 text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deployment Progress */}
            <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Deployment Progress</h3>
                  <span className="text-xl font-bold text-white">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                
                <Progress value={progressPercentage} className="h-2" />
                
                <p className="text-xs text-white/70">
                  Step {currentStep + 1} of {DEPLOY_STEPS.length}: {DEPLOY_STEPS[currentStep]?.title}
                </p>

                {/* Deployment Steps */}
                <div className="space-y-2 mt-4">
                  {DEPLOY_STEPS.map((step, index) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                          index < currentStep ? 'bg-green-500' : 
                          index === currentStep ? 'bg-blue-500' : 'bg-white/10'
                        }`}>
                          {index < currentStep ? (
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          ) : index === currentStep ? (
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                          ) : (
                            <IconComponent className="h-4 w-4 text-white/40" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm ${index <= currentStep ? 'text-white font-medium' : 'text-white/50'}`}>
                            {step.title}
                          </span>
                          <p className="text-xs text-white/50">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Contract Artifacts */}
            {contractArtifacts && (
              <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-white">Contract Artifacts</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-white/60">Contract Name</p>
                      <p className="text-white font-medium text-sm">{contractArtifacts.contractName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Contract Type</p>
                      <p className="text-white font-medium text-sm">{contractArtifacts.contractType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">ABI Functions</p>
                      <p className="text-white font-medium text-sm">{contractArtifacts.abi?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Bytecode Length</p>
                      <p className="text-white font-medium text-sm">{contractArtifacts.bytecode?.length || 0} chars</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle className="hover:bg-primary transition-colors" />
        
        {/* Right Panel - Step Content */}
        <ResizablePanel
          defaultSize={70}
          minSize={50}
        >
          <div className="h-full flex flex-col">
            {/* Step Header */}
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {DEPLOY_STEPS[currentStep]?.title}
                  </h2>
                  <p className="text-white/60 text-sm">
                    {DEPLOY_STEPS[currentStep]?.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                  )}
                  {currentStep < DEPLOY_STEPS.length - 1 && (
                    <Button
                      onClick={nextStep}
                      disabled={currentStep === 0 && !address}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto thin-scrollbar p-6">
              <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-full">
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
                    projectId={projectId}
                    buildJobId={contractArtifacts?.buildJobId || ''}
                  />
                )}
                {currentStep === 3 && (
                  <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        Contract Deployed Successfully
                      </CardTitle>
                      <p className="text-sm text-white/60">
                        Your contract has been successfully deployed and verified on the blockchain
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
                          className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          onClick={() => router.push(`/projects/${projectId}/contract`)}
                          className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Interact with Contract
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/projects/${projectId}`)}
                          className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
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
        </ResizablePanel>
      </ResizablePanelGroup>
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
