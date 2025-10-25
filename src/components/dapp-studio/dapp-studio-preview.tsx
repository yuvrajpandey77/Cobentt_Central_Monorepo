"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Rocket, CheckCircle2, Code2, Shield, Sparkles, ArrowLeft, Download, Clipboard, ExternalLink, Loader2 } from "lucide-react";
import type { DappStudioFormValues } from "@/components/dapp-studio/dapp-studio-form";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

interface DappStudioPreviewProps {
  data: DappStudioFormValues;
  onBack: () => void;
}

const previewSections = [
  { label: "Blockchain", field: "blockchain" },
  { label: "Contract type", field: "contractType" },
  { label: "Token name", field: "tokenName" },
  { label: "Token symbol", field: "tokenSymbol" },
  { label: "Total supply", field: "tokenSupply" },
  { label: "Decimals", field: "decimals" },
  { label: "Network", field: "network" },
];

const featureLabels: Record<string, string> = {
  mintable: "Mintable",
  burnable: "Burnable",
  pausable: "Pausable",
  permit: "Permit",
  "access-control": "Access control",
  upgradeable: "Upgradeable",
};

export const DappStudioPreview = ({ data, onBack }: DappStudioPreviewProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const configJson = useMemo(() => JSON.stringify(data, null, 2), [data]);

  // Mutation to create dapp project
  const createDapp = useMutation(trpc.projects.createDapp.mutationOptions({
    onSuccess: (project) => {
      toast.success("Project created! Building contract...");
      // Redirect to build page
      router.push(`/projects/${project.id}/build`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  }));

  const handleDeploy = async () => {
    console.log('🚀 handleDeploy called - creating project...');
    await createDapp.mutateAsync({
      value: `Smart contract: ${data.tokenName}`, // Description
      blockchain: data.blockchain.toUpperCase() as any,
      contractType: data.contractType.toUpperCase() as any,
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      tokenSupply: data.tokenSupply,
      decimals: data.decimals,
      network: data.network.toUpperCase() as any,
      features: data.features || [],
    });
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(configJson);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2400);
    } catch (error) {
      setCopyState("idle");
    }
  }, [configJson]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            <h1 className="text-3xl font-semibold text-white">Configuration Review</h1>
          </div>
          <p className="text-white/70 max-w-2xl mx-auto">
            Review your smart contract configuration before generation. All settings look good to proceed.
          </p>
        </div>

        {/* Main Configuration Card */}
        <Card className="border-white/20 bg-white/5 backdrop-blur-md">
          <CardContent className="p-8">
            <div className="grid gap-6 md:grid-cols-2">
              {previewSections.map((section) => (
                <div key={section.field} className="space-y-2">
                  <p className="text-sm text-white/60 font-medium">{section.label}</p>
                  <p className="text-white font-semibold capitalize">
                    {String(data[section.field as keyof DappStudioFormValues])}
                  </p>
                </div>
              ))}
            </div>

            {data.features?.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <p className="text-sm font-medium text-white">Enabled Features</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.features.map((feature) => (
                    <Badge key={feature} className="bg-white/10 text-white border-white/20 text-sm px-3 py-1">
                      {featureLabels[feature] ?? feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={onBack} 
            disabled={createDapp.isPending} 
            className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-black transition-all duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> 
            Back to Configuration
          </Button>
          
          <Button 
            onClick={handleDeploy}
            disabled={createDapp.isPending}
            className="bg-white text-black hover:bg-gray-100 transition-all duration-200 shadow-lg"
          >
            {createDapp.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Contract...
              </>
            ) : (
              <>
                Generate Smart Contract
                <Rocket className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Additional Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="ghost" 
            onClick={handleCopy} 
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Clipboard className="mr-2 h-4 w-4" />
            {copyState === "copied" ? "Copied!" : "Copy Configuration"}
          </Button>
          
          <Button asChild variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
            <Link href="/docs/deployments/overview">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Documentation
            </Link>
          </Button>
        </div>

        {/* Info Note */}
        <div className="text-center">
          <p className="text-sm text-white/50">
            Contract generation will create your smart contract template and prepare it for deployment.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default DappStudioPreview;

