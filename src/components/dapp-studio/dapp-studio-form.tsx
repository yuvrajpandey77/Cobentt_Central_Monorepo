"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Coins,
  Shield,
  Layers,
  Wallet,
  Code2,
  Gem,
  Zap,
  Rocket,
  Globe,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const formSchema = z.object({
  blockchain: z.enum(["ethereum", "polygon", "solana", "arbitrum", "optimism"], {
    required_error: "Select a blockchain",
  }),
  contractType: z.enum(["erc20", "erc721", "erc1155", "payment-splitter", "custom"], {
    required_error: "Select a contract type",
  }),
  tokenName: z.string().min(2, "Token name required").max(64),
  tokenSymbol: z.string().min(2, "Symbol required").max(10),
  tokenSupply: z.string().min(1, "Supply required"),
  decimals: z.string().min(1, "Decimals required"),
  network: z.enum(["mainnet", "testnet"], { required_error: "Select a network" }),
  features: z.array(z.string()).default([]),
  autoVerify: z.boolean().default(true),
  generateFrontend: z.boolean().default(true),
  includeTests: z.boolean().default(false),
  optimizeBuild: z.boolean().default(true),
  includeArtifacts: z.boolean().default(true),
  runStaticAnalysis: z.boolean().default(true),
  runUnitTests: z.boolean().default(true),
  runIntegrationTests: z.boolean().default(false),
  generateCoverage: z.boolean().default(false),
  // Enhanced configuration fields
  aiConfiguration: z.any().optional(),
  gasOptimizations: z.array(z.string()).default([]),
  securityRecommendations: z.array(z.string()).default([]),
  complexity: z.enum(["simple", "moderate", "complex"]).optional(),
  reasoning: z.string().optional(),
});

export type DappStudioFormValues = z.infer<typeof formSchema>;

interface DappStudioFormProps {
  onSubmit: (values: DappStudioFormValues) => void;
  defaultValues?: Partial<DappStudioFormValues>;
}

const chains = [
  {
    value: "ethereum",
    label: "Ethereum",
    description: "The default smart contract platform",
    icon: Gem,
  },
  {
    value: "polygon",
    label: "Polygon",
    description: "Ethereum compatible, low fees",
    icon: Zap,
  },
  {
    value: "solana",
    label: "Solana",
    description: "High throughput and low latency",
    icon: Rocket,
  },
  {
    value: "arbitrum",
    label: "Arbitrum",
    description: "Layer 2 with optimistic rollups",
    icon: Layers,
  },
  {
    value: "optimism",
    label: "Optimism",
    description: "Layer 2 with optimistic rollups",
    icon: Globe,
  },
];

const contracts = [
  {
    value: "erc20",
    label: "ERC-20 Token",
    description: "Fungible token standard for fungible assets",
    icon: Coins,
    highlights: ["Mintable", "Burnable", "Pausable"],
  },
  {
    value: "erc721",
    label: "ERC-721 NFT",
    description: "Non-fungible token standard",
    icon: Shield,
    highlights: ["Unique tokens", "Metadata", "Royalties"],
  },
  {
    value: "erc1155",
    label: "ERC-1155 Multi-Token",
    description: "Hybrid fungible + non-fungible standard",
    icon: Layers,
    highlights: ["Batch mint", "Batch transfer", "Lower gas"],
  },
  {
    value: "payment-splitter",
    label: "Payment Splitter",
    description: "Split ether or tokens across recipients",
    icon: Wallet,
    highlights: ["Multi-recipient", "Proportional", "Automatic"],
  },
  {
    value: "custom",
    label: "Custom Contract",
    description: "Bring your own ABI / requirements",
    icon: Code2,
    highlights: ["Custom modules", "Scaffold ready", "Generator hooks"],
  },
];

const optionalFeatures = [
  { id: "mintable", label: "Mintable", description: "Allow privileged addresses to mint" },
  { id: "burnable", label: "Burnable", description: "Allow holders to burn their tokens" },
  { id: "pausable", label: "Pausable", description: "Pause transfers in emergencies" },
  { id: "permit", label: "EIP-2612 Permit", description: "Gasless approvals" },
  { id: "access-control", label: "Access Control", description: "Admin/role management" },
  { id: "upgradeable", label: "Upgradeable", description: "Proxy upgrade framework" },
];

const StepWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
    {children}
  </motion.div>
);

const AIBadge = () => (
  <Badge variant="outline" className="ml-2 border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs">
    <Sparkles className="h-3 w-3 mr-1" />
    AI
  </Badge>
);

const STEP_ENTRIES = [
  { title: "Platform", description: "Select chain & template" },
  { title: "Configuration", description: "Token metadata" },
  { title: "Features", description: "Optional modules" },
  { title: "Review", description: "Confirm & generate" },
];

const StepProgress = ({ current }: { current: number }) => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {STEP_ENTRIES.map((step, index) => (
        <div key={step.title} className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all",
              index <= current ? "bg-blue-500 text-white" : "bg-white/10 text-white/50",
            )}
          >
            {index <= current ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
          </div>
          <div className="hidden md:block">
            <p className={cn("font-medium", index <= current ? "text-white" : "text-white/60")}>{step.title}</p>
            <p className="text-xs text-white/50">{step.description}</p>
          </div>
          {index < STEP_ENTRIES.length - 1 && <ArrowRight className="hidden h-4 w-4 text-white/30 md:block" />}
        </div>
      ))}
    </div>
  );
};

export const DappStudioForm = ({ onSubmit, defaultValues }: DappStudioFormProps) => {
  const form = useForm<DappStudioFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      features: [],
      autoVerify: true,
      generateFrontend: true,
      includeTests: false,
      optimizeBuild: true,
      includeArtifacts: true,
      runStaticAnalysis: true,
      runUnitTests: true,
      runIntegrationTests: false,
      generateCoverage: false,
      ...defaultValues,
    },
    mode: "onSubmit", // Only validate when submitting
  });

  const [step, setStep] = useState(0);
  const totalSteps = STEP_ENTRIES.length;
  const hasAISuggestions = !!defaultValues && Object.keys(defaultValues).length > 0;

  const stepFieldMap: Record<number, (keyof DappStudioFormValues)[]> = {
    0: ["blockchain", "contractType"],
    1: ["tokenName", "tokenSymbol", "tokenSupply", "decimals", "network"],
    2: [], // features - no validation needed
    3: [], // review - no validation needed
  };

  const goNext = async () => {
    const fields = stepFieldMap[step];
    if (fields.length > 0) {
      const valid = await form.trigger(fields, { shouldFocus: true });
      if (!valid) {
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };
  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = (values: DappStudioFormValues) => {
    onSubmit(values);
  };

  const renderContent = () => {
    switch (step) {
      case 0:
        return (
          <StepWrapper>
            <div className="space-y-10">
              <FormField
                control={form.control}
                name="blockchain"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-xl font-semibold text-white flex items-center">
                      Select Blockchain
                      {hasAISuggestions && <AIBadge />}
                    </FormLabel>
                    <FormControl>
                      <div className="grid gap-4 md:grid-cols-2">
                        {chains.map((chain) => {
                          const isActive = field.value === chain.value;
                          return (
                            <Card
                              key={chain.value}
                              onClick={() => field.onChange(chain.value)}
                              className={cn(
                                "cursor-pointer border-white/10 bg-white/5 backdrop-blur transition hover:border-white/30",
                                isActive && "border-blue-500/70 bg-blue-500/15",
                              )}
                            >
                              <CardContent className="flex items-start gap-4 p-5">
                                <chain.icon className="h-7 w-7 text-sky-300" />
                                <div className="space-y-2">
                                  <p className="font-medium text-white">{chain.label}</p>
                                  <p className="text-sm text-white/60">{chain.description}</p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-xl font-semibold text-white flex items-center">
                      Choose Contract Type
                      {hasAISuggestions && <AIBadge />}
                    </FormLabel>
                    <FormControl>
                      <div className="grid gap-4">
                        {contracts.map((contract) => {
                          const isActive = field.value === contract.value;
                          return (
                            <Card
                              key={contract.value}
                              onClick={() => field.onChange(contract.value)}
                              className={cn(
                                "cursor-pointer border-white/10 bg-white/5 backdrop-blur transition hover:border-white/30",
                                isActive && "border-blue-500/70 bg-blue-500/15",
                              )}
                            >
                              <CardContent className="flex flex-col gap-4 p-5 md:flex-row">
                                <contract.icon className="h-6 w-6 text-emerald-300" />
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-white">{contract.label}</p>
                                    <Badge variant="outline" className="border-white/20 text-white/70">
                                      Scaffold ready
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-white/60">{contract.description}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {contract.highlights.map((item) => (
                                      <Badge key={item} variant="secondary" className="bg-white/10 text-white/70">
                                        {item}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </StepWrapper>
        );

      case 1:
        return (
          <StepWrapper>
            <div className="space-y-8">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Sparkles className="h-4 w-4 text-sky-300" />
                {hasAISuggestions 
                  ? "AI has pre-filled these values. Review and customize as needed."
                  : "Configure core metadata for your deployment."}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tokenName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center">
                        Token Name
                        {hasAISuggestions && defaultValues?.tokenName && <AIBadge />}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., My Awesome Token" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" />
                      </FormControl>
                      <FormDescription className="text-white/50 text-xs">
                        The full name of your token (e.g., &quot;Ethereum&quot;)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tokenSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center">
                        Symbol
                        {hasAISuggestions && defaultValues?.tokenSymbol && <AIBadge />}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., TKN" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" />
                      </FormControl>
                      <FormDescription className="text-white/50 text-xs">
                        Short ticker symbol (e.g., &quot;ETH&quot;, usually 3-5 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tokenSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center">
                        Total Supply
                        {hasAISuggestions && defaultValues?.tokenSupply && <AIBadge />}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 1000000" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" />
                      </FormControl>
                      <FormDescription className="text-white/50 text-xs">
                        Maximum number of tokens that will exist
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="decimals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center">
                        Decimals
                        {hasAISuggestions && defaultValues?.decimals && <AIBadge />}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="18 (standard)" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" />
                      </FormControl>
                      <FormDescription className="text-white/50 text-xs">
                        Divisibility (18 is standard, 0 for NFTs)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="network"
                render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel className="text-white">Target Network</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-white/20 bg-white/10 text-white">
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-white/20 bg-slate-900 text-white">
                        <SelectItem value="testnet" className="focus:bg-white/10">Testnet (recommended)</SelectItem>
                        <SelectItem value="mainnet" className="focus:bg-white/10">Mainnet</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </StepWrapper>
        );

      case 2:
        return (
          <StepWrapper>
            <div className="space-y-6">
              <p className="text-sm text-white/60">
                Attach optional modules. Your template will include audited patterns for each module you enable.
              </p>
              <FormField
                control={form.control}
                name="features"
                render={() => (
                  <FormItem className="space-y-4">
                    {optionalFeatures.map((feature) => (
                      <FormField
                        key={feature.id}
                        control={form.control}
                        name="features"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(feature.id)}
                                onCheckedChange={(checked) => {
                                  const safe = field.value ?? [];
                                  return checked
                                    ? field.onChange([...safe, feature.id])
                                    : field.onChange(safe.filter((value) => value !== feature.id));
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 text-white">
                              <FormLabel className="font-medium">{feature.label}</FormLabel>
                              <FormDescription className="text-white/60">{feature.description}</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </FormItem>
                )}
              />
            </div>
          </StepWrapper>
        );

      case 3:
        return (
          <StepWrapper>
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Review Your Configuration</h3>
              </div>
              
              <div className="space-y-4">
                {/* Configuration Summary */}
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-white/60">Blockchain</p>
                        <p className="text-white font-medium capitalize">{form.watch("blockchain")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60">Contract Type</p>
                        <p className="text-white font-medium uppercase">{form.watch("contractType")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60">Token Name</p>
                        <p className="text-white font-medium">{form.watch("tokenName")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60">Symbol</p>
                        <p className="text-white font-medium">{form.watch("tokenSymbol")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60">Total Supply</p>
                        <p className="text-white font-medium">{form.watch("tokenSupply")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60">Network</p>
                        <p className="text-white font-medium capitalize">{form.watch("network")}</p>
                      </div>
                    </div>

                    {form.watch("features")?.length > 0 && (
                      <div>
                        <p className="text-sm text-white/60 mb-2">Features</p>
                        <div className="flex flex-wrap gap-2">
                          {form.watch("features").map((feature) => (
                            <Badge key={feature} className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* What Happens Next */}
                <div className="p-6 rounded-lg border border-white/10 bg-white/5 space-y-3">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    What happens next?
                  </h4>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Generate Solidity contract from template</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Install OpenZeppelin dependencies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Compile with Solidity compiler</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Generate test suite with Foundry</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Prepare for deployment</span>
                    </li>
                  </ul>
                </div>

                {/* Build Options */}
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="autoVerify"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-4">
                        <div className="space-y-1">
                          <FormLabel className="text-white">Auto-verify on Etherscan</FormLabel>
                          <FormDescription className="text-white/60">
                            Automatically verify contract after deployment
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="includeTests"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-4">
                        <div className="space-y-1">
                          <FormLabel className="text-white">Generate test suite</FormLabel>
                          <FormDescription className="text-white/60">
                            Create Foundry tests for your contract
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </StepWrapper>
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <StepProgress current={step} />

        <Card className="border-white/10 bg-white/8 backdrop-blur">
          <CardContent className="p-8 text-white">{renderContent()}</CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={step === 0}
            className="border-white/20 text-white hover:bg-white/20 hover:text-black"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">Step {step + 1} of {totalSteps}</span>
            {step === totalSteps - 1 ? (
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:from-blue-700 hover:to-blue-800"
              >
                <Rocket className="mr-2 h-4 w-4" />
                Generate Contract
              </Button>
            ) : (
              <Button type="button" onClick={goNext} className="border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.01] focus:ring-2 focus:ring-white/20 focus:outline-none">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
};

