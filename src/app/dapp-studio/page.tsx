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
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowUp,
  Loader2,
  Code2,
  Shield,
  Zap,
  Rocket,
  Layers,
  Gem,
  Coins,
  Wallet,
  Lightbulb,
} from "lucide-react";

const smartContractFeatures = [
  {
    icon: Code2,
    title: "Production Ready Templates",
    description: "Audited smart contract templates with industry best practices built-in for secure deployments.",
    color: "text-blue-400",
  },
  {
    icon: Shield,
    title: "Security First",
    description: "Automatic verification, access control presets, and upgrade-safe patterns for maximum security.",
    color: "text-green-400",
  },
  {
    icon: Zap,
    title: "Multi-Chain Support",
    description: "Deploy to Ethereum, Polygon, Arbitrum, Optimism, and Solana with one configuration.",
    color: "text-purple-400",
  },
  {
    icon: Rocket,
    title: "Instant Deployment",
    description: "From idea to deployed contract in minutes with automated compilation and verification.",
    color: "text-orange-400",
  },
];

const contractTypes = [
  {
    icon: Coins,
    title: "ERC-20 Tokens",
    description: "Fungible tokens for currencies, rewards, and utility tokens",
    examples: ["Loyalty programs", "Gaming currencies", "Governance tokens"],
  },
  {
    icon: Gem,
    title: "ERC-721 NFTs",
    description: "Non-fungible tokens for unique digital assets",
    examples: ["Digital art", "Collectibles", "Digital identity"],
  },
  {
    icon: Layers,
    title: "ERC-1155 Multi-Tokens",
    description: "Hybrid tokens supporting both fungible and non-fungible assets",
    examples: ["Game items", "Trading cards", "Multi-asset collections"],
  },
  {
    icon: Wallet,
    title: "Payment Splitters",
    description: "Automated revenue sharing and payment distribution",
    examples: ["Royalty splits", "Team payments", "Revenue sharing"],
  },
];

const workflowSteps = [
  {
    title: "Describe",
    description: "Tell us what you want to build in plain English",
    icon: Sparkles,
  },
  {
    title: "Configure",
    description: "AI pre-fills the configuration, customize as needed",
    icon: Layers,
  },
  {
    title: "Deploy",
    description: "Deploy, verify, and get your contract address instantly",
    icon: Rocket,
  },
];

const examplePrompts = [
  "NFT collection for digital artwork with royalties",
  "Loyalty token for my coffee shop rewards program", 
  "Gaming token with staking and rewards mechanism",
  "Governance token for my DAO with voting capabilities",
  "Multi-token standard for in-game items (ERC-1155)",
  "Payment splitter contract for revenue sharing"
];

const PageShell = () => {
  const { isCollapsed } = useSidebar();
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingUrlPrompt, setIsProcessingUrlPrompt] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Check for prompt in URL parameters and auto-process it
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlPrompt = searchParams.get('prompt');
    
    if (urlPrompt) {
      setPrompt(urlPrompt);
      setIsProcessingUrlPrompt(true);
      // Show loading state and automatically analyze the prompt from landing page
      setIsAnalyzing(true);
      // Add a small delay to show the loading state
      setTimeout(() => {
        analyzePrompt(urlPrompt);
      }, 500);
    }
  }, []);

  const analyzePrompt = async (userPrompt: string) => {
    setIsAnalyzing(true);
    
    try {
      // Navigate to the form page with the prompt
      const encodedPrompt = encodeURIComponent(userPrompt);
      const formUrl = `/dapp-studio/form?prompt=${encodedPrompt}`;
      window.location.href = formUrl;
    } catch (error) {
      console.error('Error navigating to form:', error);
      toast.error('Failed to navigate to form. Please try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar className="hidden lg:block fixed left-0 top-0 h-screen z-50" />
      <div
        className={cn(
          "flex-1 min-h-screen transition-all duration-500",
          isCollapsed ? "lg:ml-[52px]" : "lg:ml-[240px]",
        )}
      >
        <Header />
        <main className="relative z-0">
          {/* Loading overlay when processing prompt from URL */}
          {isAnalyzing && prompt && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 max-w-md mx-4">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">Processing Your Request</h3>
                    <p className="text-white/70 text-sm mb-4">
                      Analyzing your smart contract requirements...
                    </p>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm italic">
                        "{prompt}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <section className="relative overflow-hidden pt-24 pb-16">
            <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center max-w-4xl mx-auto"
              >
                <Badge className="mb-6 inline-flex items-center gap-2 border border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 px-4 py-1.5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Professional Smart Contract Development
                </Badge>
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Build & Deploy Smart Contracts
                </h1>
                <p className="mt-4 text-lg text-white/70 max-w-3xl mx-auto">
                  Create production-ready smart contracts in minutes. Our AI-powered platform handles everything from code generation to deployment and verification.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-white/60">
                    <span>AI-powered configuration</span>
                    <span>•</span>
                  <span>Multi-chain deployment</span>
                  <span>•</span>
                  <span>Automatic verification</span>
                </div>
              </motion.div>

              {/* Main Input Section - Only show if not processing URL prompt */}
              {!isProcessingUrlPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-16 max-w-3xl mx-auto"
                >
                <div className={cn(
                    "relative border border-white/20 rounded-xl bg-white/10 backdrop-blur-lg transition-all duration-200 ease-out cursor-text shadow-xl",
                    isFocused && "border-white/40 shadow-2xl ring-1 ring-white/20",
                )}>
                  <div className="relative">
                    <TextareaAutosize
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      minRows={1}
                      maxRows={6}
                      className="w-full resize-none border-none outline-none bg-transparent px-5 py-4 text-base text-white placeholder:text-white/60 cursor-text"
                      placeholder=""
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          analyzePrompt(prompt);
                        }
                      }}
                    />
                    {!prompt && !isFocused && (
                      <div className="absolute inset-0 px-5 py-4 pointer-events-none cursor-text flex items-center">
                        <div className="text-base text-white/60 text-left w-full">
                          Describe your smart contract idea...
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-white/60">
                        Press <kbd className="px-1.5 py-0.5 text-xs bg-white/20 rounded border border-white/30">Ctrl + Enter</kbd> to generate
                      </div>
                      <Button
                        onClick={() => analyzePrompt(prompt)}
                        disabled={!prompt.trim() || isAnalyzing}
                        className={cn(
                          "h-10 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 ease-out focus:ring-2 focus:ring-primary/20 focus:outline-none",
                          (!prompt.trim() || isAnalyzing) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isAnalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Example Prompts */}
                <div className="mt-8 space-y-3">
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
                        onClick={() => setPrompt(example)}
                        className="group text-left p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        <p className="text-sm text-white/80 group-hover:text-white transition-colors">
                          {example}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
              )}
            </div>
          </section>

          {/* Features Section - Only show if not processing URL prompt */}
          {!isProcessingUrlPrompt && (
          <section className="relative z-10 pb-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-2xl font-semibold text-white md:text-3xl">Why Choose Our Platform</h2>
                <p className="mt-4 text-white/60 max-w-2xl mx-auto">
                  Professional-grade smart contract development with enterprise security and deployment automation.
                </p>
              </motion.div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {smartContractFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full border-white/15 bg-white/8 backdrop-blur-md">
                      <CardContent className="space-y-4 p-6 text-left text-white">
                        <feature.icon className={`h-8 w-8 ${feature.color}`} />
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{feature.title}</h3>
                          <p className="text-sm text-white/70">{feature.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
          )}

          {/* Contract Types Section - Only show if not processing URL prompt */}
          {!isProcessingUrlPrompt && (
          <section className="relative z-10 pb-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-2xl font-semibold text-white md:text-3xl">Supported Contract Types</h2>
                <p className="mt-4 text-white/60 max-w-2xl mx-auto">
                  Deploy any type of smart contract with our comprehensive template library.
                </p>
              </motion.div>

              <div className="grid gap-6 md:grid-cols-2">
                {contractTypes.map((contract, index) => (
                  <motion.div
                    key={contract.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full border-white/15 bg-white/8 backdrop-blur-md">
                      <CardContent className="space-y-4 p-6 text-left text-white">
                        <contract.icon className="h-8 w-8 text-blue-400" />
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold">{contract.title}</h3>
                          <p className="text-sm text-white/70">{contract.description}</p>
                          <div className="space-y-2">
                            <p className="text-xs text-white/50 font-medium">Common use cases:</p>
                            <div className="space-y-1">
                              {contract.examples.map((example) => (
                                <p key={example} className="text-xs text-white/60">• {example}</p>
                              ))}
                          </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                        ))}
                      </div>
                    </div>
          </section>
          )}

          {/* Workflow Section - Only show if not processing URL prompt */}
          {!isProcessingUrlPrompt && (
          <section className="border-t border-white/10 bg-black/10 backdrop-blur-sm py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-2xl font-semibold text-white md:text-3xl">Simple 3-Step Process</h2>
                <p className="mt-4 text-white/60 max-w-2xl mx-auto">
                  From idea to deployed contract in minutes, not hours.
                </p>
              </motion.div>

              <div className="grid gap-6 md:grid-cols-3">
                {workflowSteps.map((step, index) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full border-white/15 bg-white/8 backdrop-blur-md">
                      <CardContent className="space-y-4 p-6 text-white text-center">
                        <div className="flex justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/20">
                            <step.icon className="h-6 w-6 text-blue-400" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">{step.title}</h3>
                          <p className="text-sm text-white/70">{step.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
          )}


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

