"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  Rocket,
  Code2,
  FileJson,
  FileCode,
  Play,
  ExternalLink,
} from 'lucide-react';
import Editor from '@monaco-editor/react';

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
  const [sourceCode, setSourceCode] = useState('');
  
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

  const handleSourceCodeChange = (value: string | undefined) => {
    if (value) {
      setSourceCode(value);
    }
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated star background - matching main app */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 40 }, (_, i) => {
          const left = Math.random() * 100;
          const width = 1 + Math.random() * 2;
          const length = 20 + Math.random() * 50;
          const duration = 8 + Math.random() * 12;
          const delay = -Math.random() * duration;
          const opacity = 0.1 + Math.random() * 0.2;
          
          return (
            <div
              key={i}
              className="absolute top-0 h-px bg-gradient-to-b from-white/0 via-white to-white/0 animate-[fall_linear_infinite]"
              style={{
                left: `${left}vw`,
                width: `${width}px`,
                height: `${length}px`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                opacity: opacity,
              }}
            />
          );
        })}
      </div>
      
      {/* Main content with z-index to appear above stars */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="mb-4 border-white/15 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white">
              {project.tokenName || project.name}
            </h1>
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
          
          <p className="text-white/60">
            {project.contractType} • {project.blockchain} {project.network}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Side - 40% - Configuration & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Configuration Summary */}
            <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/60">Blockchain</p>
                    <p className="text-white font-medium">{project.blockchain}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Contract Type</p>
                    <p className="text-white font-medium">{project.contractType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Token Symbol</p>
                    <p className="text-white font-medium">{project.tokenSymbol}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Network</p>
                    <p className="text-white font-medium capitalize">{project.network?.toLowerCase()}</p>
                  </div>
                  {project.tokenSupply && (
                    <div className="col-span-2">
                      <p className="text-sm text-white/60">Total Supply</p>
                      <p className="text-white font-medium">{project.tokenSupply}</p>
                    </div>
                  )}
                </div>

                {project.features && project.features.length > 0 && (
                  <div>
                    <p className="text-sm text-white/60 mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {project.features.map((feature: string) => (
                        <Badge key={feature} variant="outline" className="border-white/20 text-white/70">
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
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Build Progress</h3>
                  <span className="text-2xl font-bold text-white">
                    {buildStatus?.progress || 0}%
                  </span>
                </div>
                
                <Progress value={buildStatus?.progress || 0} className="h-3" />
                
                {buildStatus?.currentStep && (
                  <p className="text-sm text-white/70 flex items-center gap-2">
                    {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                    {buildStatus.currentStep}
                  </p>
                )}

                {/* Build Steps */}
                <div className="space-y-3 mt-6">
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

            {/* Build Logs */}
            <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Build Logs</h3>
                
                <div className="bg-black/50 rounded-lg p-4 font-mono text-xs max-h-[300px] overflow-y-auto">
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
              </CardContent>
            </Card>
          </div>

          {/* Right Side - 60% - Code Preview */}
          <div className="lg:col-span-3">
            <Card className="border-white/10 bg-white/8 backdrop-blur h-full">
              <CardContent className="p-6 h-full flex flex-col">
                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={activeTab === 'source' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('source')}
                    className={activeTab === 'source' ? 'bg-blue-500 text-white' : 'text-white/70'}
                  >
                    <Code2 className="h-4 w-4 mr-2" />
                    Source Code
                  </Button>
                  <Button
                    variant={activeTab === 'abi' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('abi')}
                    disabled={!buildStatus?.artifacts?.abi}
                    className={activeTab === 'abi' ? 'bg-blue-500 text-white' : 'text-white/70'}
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    ABI
                  </Button>
                  <Button
                    variant={activeTab === 'bytecode' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('bytecode')}
                    disabled={!buildStatus?.artifacts?.bytecode}
                    className={activeTab === 'bytecode' ? 'bg-blue-500 text-white' : 'text-white/70'}
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    Bytecode
                  </Button>
                </div>

                {/* Editor */}
                <div className="flex-1 border border-white/15 rounded-lg overflow-hidden bg-black/20 backdrop-blur-sm">
                  {activeTab === 'source' && (
                    <Editor
                      height="100%"
                      defaultLanguage="sol"
                      value={sourceCode || '// Generating contract...'}
                      onChange={handleSourceCodeChange}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: false, // EDITABLE!
                        padding: { top: 16, bottom: 16 },
                      }}
                    />
                  )}
                  {activeTab === 'abi' && buildStatus?.artifacts?.abi && (
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      value={JSON.stringify(buildStatus.artifacts.abi, null, 2)}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: true,
                        padding: { top: 16, bottom: 16 },
                      }}
                    />
                  )}
                  {activeTab === 'bytecode' && buildStatus?.artifacts?.bytecode && (
                    <Editor
                      height="100%"
                      defaultLanguage="plaintext"
                      value={buildStatus.artifacts.bytecode}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        readOnly: true,
                        wordWrap: 'on',
                        padding: { top: 16, bottom: 16 },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
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
            className="border-white/15 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Artifacts
          </Button>
          
          <Button
            onClick={handleRunTests}
            disabled={!buildStatus?.artifacts?.sourceCode}
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Tests
          </Button>
        </div>
      </div>
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

