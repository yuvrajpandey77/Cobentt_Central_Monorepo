"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  Rocket,
  FileJson,
  FileCode,
  Play,
  ExternalLink,
  EyeIcon,
  CodeIcon,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { FileExplorer } from '@/components/file-explorer';

interface BuildStatus {
  id: string;
  status: string;
  progress: number;
  currentStep: string | null;
  logs: string[];
  artifacts: any;
  createdAt: string;
  updatedAt: string;
}

export default function BuildPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<any>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'source' | 'abi' | 'bytecode'>('source');
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const [tabsState, setTabsState] = useState<"preview" | "code">("code");
  const [realFiles, setRealFiles] = useState<{ [path: string]: string }>({});
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const handleFileChange = async (filePath: string, content: string) => {
    // Update local state
    setRealFiles(prev => ({
      ...prev,
      [filePath]: content
    }));

    // If it's a Solidity file, update sourceCode state
    if (filePath.endsWith('.sol')) {
      setSourceCode(content);
    }

    // Save the entire codebase to E2B sandbox
    try {
      console.log('💾 Saving codebase after file change:', filePath);
      
      const response = await fetch(`/api/projects/${projectId}/save-codebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            ...realFiles,
            [filePath]: content
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Codebase saved successfully:', result);
      } else {
        const error = await response.json();
        console.error('❌ Failed to save codebase:', error);
      }
    } catch (error) {
      console.error('❌ Error saving codebase:', error);
    }
  };
  
  // Fetch project info
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  // Poll build status every 2 seconds
  useEffect(() => {
    if (!projectId) return;

    const fetchBuildStatus = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/build-status`);
        if (res.ok) {
          const data = await res.json();
          setBuildStatus(data);
          
          // Update source code when artifacts are ready
          if (data.artifacts?.sourceCode) {
            setSourceCode(data.artifacts.sourceCode);
          }
          
          // Also update realFiles with artifacts if available
          if (data.artifacts && Object.keys(realFiles).length === 0) {
            const artifactFiles: { [path: string]: string } = {};
            
            if (data.artifacts.sourceCode) {
              const contractName = data.artifacts.contractName || project?.tokenName?.replace(/\s+/g, '') || 'Token';
              artifactFiles[`src/${contractName}.sol`] = data.artifacts.sourceCode;
            }
            
            if (data.artifacts.abi) {
              artifactFiles['artifacts/abi.json'] = JSON.stringify(data.artifacts.abi, null, 2);
            }
            
            if (data.artifacts.bytecode) {
              artifactFiles['artifacts/bytecode.txt'] = data.artifacts.bytecode;
            }
            
            setRealFiles(artifactFiles);
          }
          
          // Stop polling if completed or failed
          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching build status:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchBuildStatus();

    // Poll every 2 seconds
    const interval = setInterval(fetchBuildStatus, 2000);

    return () => clearInterval(interval);
  }, [projectId]);

  // Fetch real files from E2B sandbox
  useEffect(() => {
    const fetchRealFiles = async () => {
      if (!projectId) return;
      
      setIsLoadingFiles(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/files`);
        if (response.ok) {
          const data = await response.json();
          setRealFiles(data.files || {});
          console.log('📁 Real files loaded:', Object.keys(data.files || {}));
        } else {
          console.error('Failed to fetch real files');
        }
      } catch (error) {
        console.error('Error fetching real files:', error);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    // Fetch files when build is completed
    if (buildStatus?.status === 'COMPLETED') {
      fetchRealFiles();
    }
  }, [projectId, buildStatus?.status]);

  const handleSourceCodeChange = (value: string | undefined) => {
    if (value) {
      setSourceCode(value);
    }
  };

  // Create file structure - prioritize artifacts from database, then E2B sandbox files
  const createFileStructure = () => {
    const files: { [path: string]: string } = {};
    
    // First, add artifacts from database if available
    if (buildStatus?.artifacts) {
      if (buildStatus.artifacts.sourceCode) {
        const contractName = buildStatus.artifacts.contractName || project?.tokenName?.replace(/\s+/g, '') || 'Token';
        files[`src/${contractName}.sol`] = buildStatus.artifacts.sourceCode;
      }
      
      if (buildStatus.artifacts.abi) {
        files['artifacts/abi.json'] = JSON.stringify(buildStatus.artifacts.abi, null, 2);
      }
      
      if (buildStatus.artifacts.bytecode) {
        files['artifacts/bytecode.txt'] = buildStatus.artifacts.bytecode;
      }
    }
    
    // Then merge with real files from E2B sandbox (but don't override artifacts)
    Object.entries(realFiles).forEach(([path, content]) => {
      if (!files[path]) { // Only add if not already present from artifacts
        files[path] = content;
      }
    });
    
    // If we still don't have source code, use the sourceCode state
    if (!Object.keys(files).some(key => key.endsWith('.sol')) && sourceCode) {
      const contractName = project?.tokenName?.replace(/\s+/g, '') || 'Token';
      files[`src/${contractName}.sol`] = sourceCode;
    }
    
    // Add common Foundry files as fallback if not present
    if (!files['foundry.toml']) {
      files['foundry.toml'] = `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"

[profile.default.optimizer]
enabled = true
runs = 200

[profile.default.fuzz]
runs = 1000

[profile.default.invariant]
runs = 256
depth = 15
fail_on_revert = false
`;
    }

    if (!files['remappings.txt']) {
      files['remappings.txt'] = `@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
forge-std/=lib/forge-std/src/
`;
    }

    if (!files['README.md']) {
      files['README.md'] = `# ${project?.tokenName || 'Smart Contract'}

This is a smart contract generated by Cogerphere.

## Contract Details
- **Name**: ${project?.tokenName || 'Token'}
- **Symbol**: ${project?.tokenSymbol || 'TKN'}
- **Type**: ${project?.contractType || 'ERC20'}
- **Blockchain**: ${project?.blockchain || 'Ethereum'}
- **Network**: ${project?.network || 'Testnet'}

## Files
- \`src/${project?.tokenName?.replace(/\s+/g, '') || 'Token'}.sol\` - Main contract source code
- \`artifacts/abi.json\` - Contract ABI
- \`artifacts/bytecode.txt\` - Contract bytecode

## Usage
This contract was generated using Foundry. You can compile and test it using:

\`\`\`bash
forge build
forge test
\`\`\`
`;
    }

    console.log('📁 File structure created:', Object.keys(files));
    return files;
  };


  const handleDownloadArtifacts = () => {
    if (!buildStatus?.artifacts) return;

    const dataStr = JSON.stringify({
      sourceCode: sourceCode,
      abi: buildStatus.artifacts.abi,
      bytecode: buildStatus.artifacts.bytecode,
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project?.tokenName || 'contract'}-artifacts.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRunTests = async () => {
    if (!buildStatus?.artifacts?.sourceCode) {
      alert('No contract code available for testing');
      return;
    }

    try {
      // Create a test job
      const response = await fetch(`/api/projects/${projectId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractCode: buildStatus.artifacts.sourceCode,
          contractName: buildStatus.artifacts.contractName || 'Token',
          contractType: buildStatus.artifacts.contractType || 'ERC20',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Test job created:', result);
        alert('Test suite started! Check the build logs for results.');
      } else {
        const error = await response.json();
        alert(`Failed to start tests: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error running tests:', error);
      alert('Failed to start test suite. Please try again.');
    }
  };

  const isCompleted = buildStatus?.status === 'COMPLETED';
  const isFailed = buildStatus?.status === 'FAILED';
  const isRunning = buildStatus?.status === 'RUNNING' || buildStatus?.status === 'PENDING';

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel - Configuration & Progress */}
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
                  onClick={() => router.push('/')}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {isRunning && (
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Building...
                  </Badge>
                )}
                {isCompleted && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {isFailed && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="mt-4">
              <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white">
                {project?.tokenName || project?.name}
              </h1>
              <p className="text-white/60 text-sm">
                {project?.contractType} • {project?.blockchain} {project?.network}
              </p>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-4">
            {/* Configuration Summary */}
            <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">Configuration</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/60">Blockchain</p>
                    <p className="text-white font-medium text-sm">{project?.blockchain}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Contract Type</p>
                    <p className="text-white font-medium text-sm">{project?.contractType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Token Symbol</p>
                    <p className="text-white font-medium text-sm">{project?.tokenSymbol}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Network</p>
                    <p className="text-white font-medium text-sm capitalize">{project?.network?.toLowerCase()}</p>
                  </div>
                  {project?.tokenSupply && (
                    <div className="col-span-2">
                      <p className="text-xs text-white/60">Total Supply</p>
                      <p className="text-white font-medium text-sm">{project.tokenSupply}</p>
                    </div>
                  )}
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

            {/* Build Progress */}
            <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Build Progress</h3>
                  <span className="text-xl font-bold text-white">
                    {buildStatus?.progress || 0}%
                  </span>
                </div>
                
                <Progress value={buildStatus?.progress || 0} className="h-2" />
                
                {buildStatus?.currentStep && (
                  <p className="text-xs text-white/70 flex items-center gap-2">
                    {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                    {buildStatus.currentStep}
                  </p>
                )}

                {/* Build Steps */}
                <div className="space-y-2 mt-4">
                  <BuildStep
                    title="Contract Generated"
                    completed={buildStatus ? buildStatus.progress >= 20 : false}
                    active={buildStatus?.progress === 10}
                  />
                  <BuildStep
                    title="Dependencies Installed"
                    completed={buildStatus ? buildStatus.progress >= 50 : false}
                    active={buildStatus?.progress === 30}
                  />
                  <BuildStep
                    title="Contract Compiled"
                    completed={buildStatus ? buildStatus.progress >= 90 : false}
                    active={buildStatus?.progress === 60}
                  />
                  <BuildStep
                    title="Artifacts Ready"
                    completed={buildStatus?.progress === 100}
                    active={buildStatus?.progress === 95}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contract Artifacts */}
            {isCompleted && buildStatus?.artifacts && (
              <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Contract Artifacts</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowArtifacts(!showArtifacts)}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
                    >
                      {showArtifacts ? 'Hide' : 'Show'} Details
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-white/60">Contract Name</p>
                      <p className="text-white font-medium text-sm">{buildStatus.artifacts.contractName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Contract Type</p>
                      <p className="text-white font-medium text-sm">{buildStatus.artifacts.contractType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">ABI Functions</p>
                      <p className="text-white font-medium text-sm">{buildStatus.artifacts.abi?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Bytecode Length</p>
                      <p className="text-white font-medium text-sm">{buildStatus.artifacts.bytecode?.length || 0} chars</p>
                    </div>
                  </div>

                  {showArtifacts && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-white/60 mb-2">ABI Preview</p>
                        <div className="bg-black/30 rounded p-2 max-h-32 overflow-y-auto thin-scrollbar">
                          <pre className="text-xs text-green-400 font-mono">
                            {JSON.stringify(buildStatus.artifacts.abi?.slice(0, 3), null, 2)}
                            {buildStatus.artifacts.abi?.length > 3 && '\n...'}
                          </pre>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-white/60 mb-2">Bytecode Preview</p>
                        <div className="bg-black/30 rounded p-2 max-h-20 overflow-y-auto thin-scrollbar">
                          <pre className="text-xs text-blue-400 font-mono">
                            {buildStatus.artifacts.bytecode?.substring(0, 100)}
                            {buildStatus.artifacts.bytecode?.length > 100 && '...'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </ResizablePanel>

        <ResizableHandle className="hover:bg-primary transition-colors" />
        
        {/* Right Panel - Code Editor */}
        <ResizablePanel
          defaultSize={70}
          minSize={50}
        >
          <Tabs className="h-full gap-y-0"
            defaultValue="code"
            value={tabsState}
            onValueChange={(value) => setTabsState(value as "preview" | "code")}
          >
            <div className="w-full flex items-center p-2 border-b bg-sidebar">
              <TabsList className="h-10 p-1 border rounded-full w-auto">
                <TabsTrigger value="code" className="rounded-full h-8 px-3 flex items-center gap-2">
                  <CodeIcon className="h-4 w-4" />
                  <span>Code</span>
                </TabsTrigger>
              </TabsList>
              <div className="ml-auto flex items-center gap-x-2">
                <Button
                  onClick={() => router.push(`/projects/${projectId}/deploy`)}
                  disabled={!buildStatus?.artifacts?.sourceCode}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy Contract
                </Button>
                
                <Button
                  onClick={handleDownloadArtifacts}
                  disabled={!buildStatus?.artifacts}
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Artifacts
                </Button>
                
                <Button
                  onClick={handleRunTests}
                  disabled={!buildStatus?.artifacts?.sourceCode}
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Tests
                </Button>
                
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/projects/${projectId}/save-codebase`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          files: createFileStructure()
                        }),
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        console.log('✅ Codebase saved manually:', result);
                        alert('Codebase saved successfully!');
                      } else {
                        const error = await response.json();
                        console.error('❌ Failed to save codebase:', error);
                        alert('Failed to save codebase');
                      }
                    } catch (error) {
                      console.error('❌ Error saving codebase:', error);
                      alert('Error saving codebase');
                    }
                  }}
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save Codebase
                </Button>
              </div>
            </div>
            
            <TabsContent value="code" className="min-h-0">
              <ResizablePanelGroup direction="vertical" className="h-full">
                {/* File Explorer */}
                <ResizablePanel defaultSize={70} minSize={40} maxSize={85}>
                  {isLoadingFiles ? (
                    <div className="h-full flex items-center justify-center bg-black/20">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white/60 mx-auto mb-2" />
                        <p className="text-white/60 text-sm">Loading files from E2B sandbox...</p>
                      </div>
                    </div>
                  ) : (
                    <FileExplorer 
                      files={createFileStructure()} 
                      onFileChange={handleFileChange}
                      editable={true}
                    />
                  )}
                </ResizablePanel>
                
                <ResizableHandle className="hover:bg-primary transition-colors" />
                
                {/* Build Logs Terminal */}
                <ResizablePanel defaultSize={30} minSize={15} maxSize={60}>
                  <div className="h-full flex flex-col bg-black/50">
                    <div className="p-3 border-b border-white/10">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Build Logs
                      </h3>
                    </div>
                    <div className="flex-1 p-3 font-mono text-xs overflow-y-auto ultra-thin-scrollbar bg-black/50">
                      {buildStatus?.logs && buildStatus.logs.length > 0 ? (
                        buildStatus.logs.map((log, index) => (
                          <div key={index} className="text-green-400 mb-1">
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="text-white/40">Waiting for logs...</div>
                      )}
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// Helper component for build steps
function BuildStep({ title, completed, active }: { title: string; completed: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
        completed ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-white/10'
      }`}>
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-white" />
        ) : active ? (
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-white/40" />
        )}
      </div>
      <span className={`text-sm ${completed || active ? 'text-white font-medium' : 'text-white/50'}`}>
        {title}
      </span>
    </div>
  );
}

