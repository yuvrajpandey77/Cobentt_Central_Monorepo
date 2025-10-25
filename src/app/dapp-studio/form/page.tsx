"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { DappStudioFormImproved as DappStudioForm, type DappStudioFormValues } from "@/components/dapp-studio/dapp-studio-form-improved";
import { DappStudioPreview } from "@/components/dapp-studio/dapp-studio-preview";
import { toast } from "sonner";
import {
  Loader2,
} from "lucide-react";

const PageShell = () => {
  const { isCollapsed } = useSidebar();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [prompt, setPrompt] = useState("");
  const [formData, setFormData] = useState<DappStudioFormValues | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedConfig, setSuggestedConfig] = useState<Partial<DappStudioFormValues> | null>(null);

  // Get prompt from URL and analyze it
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlPrompt = searchParams.get('prompt');
    if (urlPrompt) {
      setPrompt(urlPrompt);
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
    }
  };

  const handleSubmit = (data: DappStudioFormValues) => {
    setFormData(data);
    setStep("preview");
  };

  const handleReset = () => {
    window.location.href = '/dapp-studio';
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
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Configure Your Smart Contract
                </h1>
                <p className="mt-4 text-lg text-white/70">
                  AI has analyzed your description and pre-filled the configuration. Review and customize as needed.
                </p>
              </motion.div>
            </div>
          </section>

          <section className="relative z-10 pb-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <AnimatePresence mode="wait" initial={false}>
                {isAnalyzing ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-white/60 mb-4" />
                    <p className="text-white/60">Analyzing your smart contract requirements...</p>
                  </motion.div>
                ) : step === "form" && suggestedConfig ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <DappStudioForm 
                      onSubmit={handleSubmit} 
                      defaultValues={suggestedConfig as DappStudioFormValues}
                      userPrompt={prompt}
                      onReset={handleReset}
                    />
                  </motion.div>
                ) : step === "preview" && formData ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <DappStudioPreview data={formData} onBack={handleBackToForm} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const DappStudioFormPage = () => (
  <SidebarProvider>
    <PageShell />
  </SidebarProvider>
);

export default DappStudioFormPage;
