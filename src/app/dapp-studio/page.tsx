"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { DappStudioForm, type DappStudioFormValues } from "@/components/dapp-studio/dapp-studio-form";
import { DappStudioPreview } from "@/components/dapp-studio/dapp-studio-preview";
import { Input } from "@/components/ui/input";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import {
  Sparkles,
  Rocket,
  Code2,
  Shield,
  Zap,
  Layers,
  ArrowRight,
  ArrowUp,
  Loader2,
  Lightbulb,
} from "lucide-react";

const featureCards = [
  {
    icon: Code2,
    title: "Production Ready",
    description: "Audited templates with best practices baked in for every deployment.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "Automatic verification, access control presets, and upgrade-safe flows.",
  },
  {
    icon: Zap,
    title: "Fast Iteration",
    description: "Iterate in minutes. Deploy to testnets, preview the scaffold, and ship.",
  },
];

const workflowSteps = [
  {
    title: "Describe",
    description: "Tell us what you want to build in plain English.",
    icon: Sparkles,
  },
  {
    title: "Review",
    description: "AI pre-fills the config. Customize as needed.",
    icon: Layers,
  },
  {
    title: "Deploy",
    description: "Fund the wallet, deploy, verify, and bind your scaffold automatically.",
    icon: Rocket,
  },
];

const examplePrompts = [
  { emoji: "🎨", text: "NFT collection for digital artwork with royalties" },
  { emoji: "🏆", text: "Loyalty token for my coffee shop rewards program" },
  { emoji: "🎮", text: "Gaming token with staking and rewards" },
  { emoji: "🏛️", text: "Governance token for my DAO with voting" },
  { emoji: "💎", text: "Multi-token standard for game items (ERC-1155)" },
  { emoji: "💰", text: "Payment splitter for revenue sharing" },
];

const PageShell = () => {
  const { isCollapsed } = useSidebar();
  const [step, setStep] = useState<"prompt" | "form" | "preview">("prompt");
  const [prompt, setPrompt] = useState("");
  const [formData, setFormData] = useState<DappStudioFormValues | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedConfig, setSuggestedConfig] = useState<Partial<DappStudioFormValues> | null>(null);

  // Check URL for prompt parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlPrompt = searchParams.get('prompt');
    if (urlPrompt) {
      setPrompt(urlPrompt);
      // Automatically analyze the prompt from URL
      analyzePrompt(urlPrompt);
    }
  }, []);

  const analyzePrompt = async (userPrompt: string) => {
    setIsAnalyzing(true);
    
    try {
      // Call AI API with full Dapp Builder context
      const response = await fetch('/api/dapp-studio/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to analyze prompt');
        } else {
          const text = await response.text();
          console.error('API returned non-JSON response:', text.substring(0, 200));
          throw new Error('AI analysis service unavailable. Using fallback pattern matching.');
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Success response is not JSON:', text.substring(0, 200));
        throw new Error('Invalid response format');
      }

      const { config, success } = await response.json();

      if (!success || !config) {
        throw new Error('Invalid AI response');
      }

      // Merge AI config with defaults
      const finalConfig: Partial<DappStudioFormValues> = {
        blockchain: config.blockchain || 'ethereum',
        contractType: config.contractType || 'erc20',
        tokenName: config.tokenName || 'My Token',
        tokenSymbol: config.tokenSymbol || 'MTK',
        tokenSupply: config.tokenSupply || '1000000',
        decimals: config.decimals || '18',
        network: config.network || 'testnet',
        features: config.features || [],
        autoVerify: true,
      };

      console.log('✅ AI Analysis Result:', config.reasoning);
      toast.success('AI analyzed your prompt!', {
        description: config.reasoning || 'Configuration generated successfully',
      });
      
      setSuggestedConfig(finalConfig as DappStudioFormValues);
      setStep("form");
      setIsAnalyzing(false);
      return;
    } catch (error) {
      console.error('⚠️ AI analysis failed, falling back to pattern matching:', error);
      toast.warning('AI unavailable - Using smart pattern matching', {
        description: 'Your configuration will still be generated using our pattern matching system.',
      });
      
      // FALLBACK: Pattern matching if AI fails
      const lowerPrompt = userPrompt.toLowerCase();
      let config: Partial<DappStudioFormValues> = {
        network: "testnet",
        autoVerify: true,
        generateFrontend: true,
        optimizeBuild: true,
        includeArtifacts: true,
        runStaticAnalysis: true,
        runUnitTests: true,
        features: [],
      };

      // Detect blockchain
      if (lowerPrompt.includes("solana")) {
        config.blockchain = "solana";
      } else if (lowerPrompt.includes("polygon")) {
        config.blockchain = "polygon";
      } else if (lowerPrompt.includes("arbitrum")) {
        config.blockchain = "arbitrum";
      } else if (lowerPrompt.includes("optimism")) {
        config.blockchain = "optimism";
      } else {
        config.blockchain = "ethereum";
      }

      // Detect contract type
      if (lowerPrompt.includes("nft") || lowerPrompt.includes("artwork") || lowerPrompt.includes("collectible")) {
        config.contractType = "erc721";
        config.tokenName = "My NFT Collection";
        config.tokenSymbol = "NFT";
        config.tokenSupply = "10000";
        config.decimals = "0";
        config.features = ["mintable", "burnable"];
      } else if (lowerPrompt.includes("multi") || lowerPrompt.includes("1155") || lowerPrompt.includes("game item")) {
        config.contractType = "erc1155";
        config.tokenName = "Multi Token";
        config.tokenSymbol = "MULTI";
        config.tokenSupply = "1000000";
        config.decimals = "0";
        config.features = ["mintable"];
      } else if (lowerPrompt.includes("payment") || lowerPrompt.includes("split") || lowerPrompt.includes("revenue")) {
        config.contractType = "payment-splitter";
        config.tokenName = "Payment Splitter";
        config.tokenSymbol = "SPLIT";
        config.tokenSupply = "0";
        config.decimals = "18";
      } else {
        // Default to ERC-20 token
        config.contractType = "erc20";
        
        // Extract potential token name
        if (lowerPrompt.includes("loyalty")) {
          config.tokenName = "Loyalty Token";
          config.tokenSymbol = "LOYAL";
        } else if (lowerPrompt.includes("governance") || lowerPrompt.includes("dao")) {
          config.tokenName = "Governance Token";
          config.tokenSymbol = "GOV";
          config.features = ["mintable", "pausable", "access-control"];
        } else if (lowerPrompt.includes("gaming") || lowerPrompt.includes("game")) {
          config.tokenName = "Gaming Token";
          config.tokenSymbol = "GAME";
        } else {
          config.tokenName = "My Token";
          config.tokenSymbol = "TKN";
        }
        
        config.tokenSupply = "1000000";
        config.decimals = "18";
        config.features = ["mintable", "burnable"];
      }

      // Detect features
      if (lowerPrompt.includes("staking") || lowerPrompt.includes("rewards")) {
        config.features = [...(config.features || []), "mintable"];
      }
      if (lowerPrompt.includes("pause") || lowerPrompt.includes("emergency")) {
        config.features = [...(config.features || []), "pausable"];
      }
      if (lowerPrompt.includes("governance") || lowerPrompt.includes("voting")) {
        config.features = [...(config.features || []), "access-control"];
      }
      if (lowerPrompt.includes("upgrade")) {
        config.features = [...(config.features || []), "upgradeable"];
      }
      if (lowerPrompt.includes("gasless") || lowerPrompt.includes("permit")) {
        config.features = [...(config.features || []), "permit"];
      }

      // Remove duplicates
      config.features = [...new Set(config.features)];

      setSuggestedConfig(config);
      setIsAnalyzing(false);
      setStep("form");
    }
  };

  const handleSubmit = (data: DappStudioFormValues) => {
    setFormData(data);
    setStep("preview");
  };

  const handleReset = () => {
    setStep("prompt");
    setPrompt("");
    setFormData(null);
    setSuggestedConfig(null);
  };

  const handleBackToForm = () => {
    setStep("form");
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar className="hidden lg:block fixed left-0 top-0 h-screen z-50" />
      <div
        className={cn(
          "flex-1 min-h-screen transition-all duration-500",
          isCollapsed ? "lg:ml-16" : "lg:ml-64",
        )}
      >
        <Header />
        <main className="relative z-0">
          <section className="relative overflow-hidden pt-24 pb-16">
            <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center max-w-3xl mx-auto"
              >
                <Badge className="mb-6 inline-flex items-center gap-2 border border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 px-4 py-1.5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Dapp Studio Beta 0.1
                </Badge>
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  {step === "prompt" ? "Describe Your Smart Contract" : "Review & Customize"}
                </h1>
                <p className="mt-4 text-lg text-white/70">
                  {step === "prompt" 
                    ? "Tell us what you want to build, and our AI will intelligently configure your smart contract."
                    : step === "form"
                    ? "AI has pre-filled the configuration based on your description. Review and customize as needed."
                    : "Review your configuration before deploying to the blockchain."
                  }
                </p>
                {step === "prompt" && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-white/60">
                    <span>AI-powered configuration</span>
                    <span>•</span>
                  <span>Multi-chain support</span>
                  <span>•</span>
                    <span>Production-ready templates</span>
                </div>
                )}
              </motion.div>

              {step === "prompt" && (
              <div className="mt-16 grid gap-6 md:grid-cols-3">
                {featureCards.map((feature) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="h-full border-white/15 bg-white/8 backdrop-blur-md">
                      <CardContent className="space-y-4 p-6 text-left text-white">
                        <feature.icon className="h-8 w-8 text-emerald-300" />
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{feature.title}</h3>
                          <p className="text-sm text-white/70">{feature.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              )}
            </div>
          </section>

          <section className="relative z-10 pb-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <AnimatePresence mode="wait" initial={false}>
                {step === "prompt" && (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    {/* Prompt Input Card */}
                    <Card className="border-white/15 bg-white/8 backdrop-blur-md">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-white/80 mb-2">
                            <Sparkles className="h-5 w-5 text-amber-300" />
                            <span className="text-sm font-medium">Describe your smart contract</span>
                          </div>
                          <TextareaAutosize
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., I want to create a loyalty token for my coffee shop with rewards..."
                            minRows={3}
                            maxRows={8}
                            className="w-full resize-none border border-white/20 rounded-lg bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/50">
                              <kbd className="px-2 py-1 bg-white/10 rounded text-white/70">Ctrl</kbd> + <kbd className="px-2 py-1 bg-white/10 rounded text-white/70">Enter</kbd> to continue
                            </span>
                            <Button
                              onClick={() => analyzePrompt(prompt)}
                              disabled={!prompt.trim() || isAnalyzing}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  Generate Config
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Example Prompts */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-white/60">
                        <Lightbulb className="h-4 w-4" />
                        <span className="text-sm font-medium">Try these examples:</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {examplePrompts.map((example, idx) => (
                          <motion.button
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setPrompt(example.text)}
                            className="group text-left p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{example.emoji}</span>
                              <p className="text-sm text-white/80 group-hover:text-white transition-colors">
                                {example.text}
                              </p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "form" && suggestedConfig && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    {/* User's Original Prompt */}
                    <Card className="border-white/15 bg-white/8 backdrop-blur-md">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-white/80">
                            <Sparkles className="h-5 w-5 text-amber-300" />
                            <span className="text-sm font-medium">Your Description</span>
                          </div>
                          <p className="text-white text-lg leading-relaxed px-2">
                            &quot;{prompt}&quot;
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Suggestion Banner */}
                    <Card className="border-white/15 bg-white/8 backdrop-blur-md">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-amber-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white mb-1">AI Configuration Applied</p>
                            <p className="text-xs text-white/60 mt-2">
                              We&apos;ve analyzed your description and pre-filled the form with smart defaults. Review and customize any fields below.
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="text-white/70 hover:text-black hover:bg-white/20"
                          >
                            Start Over
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <DappStudioForm onSubmit={handleSubmit} defaultValues={suggestedConfig as DappStudioFormValues} />
                  </motion.div>
                )}

                {step === "preview" && formData && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <DappStudioPreview data={formData} onBack={handleBackToForm} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="border-t border-white/10 bg-black/10 backdrop-blur-sm py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <h2 className="text-3xl font-semibold text-white md:text-4xl">Shipping Smart Contracts Should Be Easy</h2>
                <p className="mt-4 text-white/60">
                  Follow a guided flow that handles code generation, compilation, deployment, and verification. Your
                  frontend scaffold keeps up automatically.
                </p>
              </motion.div>

              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {workflowSteps.map((step) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full border-white/15 bg-white/8 backdrop-blur-md">
                      <CardContent className="space-y-4 p-6 text-white">
                        <step.icon className="h-8 w-8 text-sky-300" />
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">{step.title}</h3>
                          <p className="text-sm text-white/70">{step.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
                <Link href="/docs" className="text-sm text-white/60 transition hover:text-white">
                  Review Documentation
                </Link>
                <span className="text-white/40">/</span>
                <Button className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.01] focus:ring-2 focus:ring-white/20 focus:outline-none">
                  Contact Support
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const DappStudioPage = () => (
  <SidebarProvider>
    <PageShell />
  </SidebarProvider>
);

export default DappStudioPage;

