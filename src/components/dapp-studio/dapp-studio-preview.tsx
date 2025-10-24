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
      <Card className="border-white/15 bg-white/8 backdrop-blur-md text-white">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold">Deployment Preview</CardTitle>
            <p className="text-sm text-white/60">
              Review your configuration before triggering the deployment pipeline.
            </p>
          </div>
          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-200">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Preflight Ready
          </Badge>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {previewSections.map((section) => (
              <div key={section.field} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">{section.label}</p>
                <p className="mt-2 text-sm font-medium capitalize text-white">
                  {String(data[section.field as keyof DappStudioFormValues])}
                </p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
              <Sparkles className="h-4 w-4 text-amber-300" /> Modules enabled
            </div>
            <div className="flex flex-wrap gap-2">
              {(data.features?.length ? data.features : Object.keys(featureLabels)).map((feature) => (
                <Badge key={feature} variant="outline" className="border-white/20 bg-white/5 text-white/80">
                  {featureLabels[feature] ?? feature}
                </Badge>
              ))}
              {!(data.features?.length) && (
                <span className="text-xs text-white/40">Features can be toggled in the previous step.</span>
              )}
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <Code2 className="h-5 w-5 text-sky-300" />
                <p className="text-sm font-medium">Code Generation</p>
              </div>
              <p className="mt-3 text-xs text-white/60">
                Solidity / Anchor templates will be rendered with your metadata and modules.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-300" />
                <p className="text-sm font-medium">Verification</p>
              </div>
              <p className="mt-3 text-xs text-white/60">
                Contract verification is {data.autoVerify ? "enabled" : "disabled"}. Metadata pushed post-deploy.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 text-blue-300" />
                <p className="text-sm font-medium">Scaffold</p>
              </div>
              <p className="mt-3 text-xs text-white/60">
                {data.generateFrontend
                  ? "Next.js dapp package will include ABI hooks, deployment receipt, and environment wiring."
                  : "Frontend scaffold generation has been skipped for this run."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-lg border border-white/10 bg-white/5 p-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2 text-sm text-white/70">
              <p>
                By continuing you acknowledge that deployment will consume network fees. Ensure your connected wallet
                is funded and unlocked.
              </p>
              {data.includeTests && (
                <p className="text-white/60">
                  Foundry test suite will be bundled with scenarios for each enabled module.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 md:w-72">
              <Button variant="outline" onClick={onBack} disabled={createDapp.isPending} className="border-white/30 text-white hover:bg-white/20 hover:text-black">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to editor
              </Button>
              <Button 
                onClick={handleDeploy}
                disabled={createDapp.isPending}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800"
              >
                {createDapp.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    Generate Contract
                    <Rocket className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={handleCopy} className="justify-between bg-white/10 text-white hover:bg-white/20 hover:text-black">
                <span>{copyState === "copied" ? "Config copied to clipboard" : "Copy config JSON"}</span>
                <Clipboard className="h-4 w-4" />
              </Button>
              <Button asChild variant="ghost" className="justify-between text-white/70 hover:text-white">
                <Link href="/docs/deployments/overview">
                  View deployment guide
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DappStudioPreview;

