"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
  Circle,
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
});

export interface DappStudioFormValues extends z.infer<typeof formSchema> {}

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
    color: "text-blue-400",
  },
  {
    value: "polygon",
    label: "Polygon",
    description: "Ethereum compatible, low fees",
    icon: Zap,
    color: "text-purple-400",
  },
  {
    value: "solana",
    label: "Solana",
    description: "High throughput and low latency",
    icon: Rocket,
    color: "text-pink-400",
  },
  {
    value: "arbitrum",
    label: "Arbitrum",
    description: "Layer 2 with optimistic rollups",
    icon: Layers,
    color: "text-cyan-400",
  },
  {
    value: "optimism",
    label: "Optimism",
    description: "Layer 2 with optimistic rollups",
    icon: Globe,
    color: "text-orange-400",
  },
];

const contracts = [
  {
    value: "erc20",
    label: "ERC-20 Token",
    description: "Fungible token standard for fungible assets",
    icon: Coins,
    highlights: ["Mintable", "Burnable", "Pausable"],
    color: "text-green-400",
  },
  {
    value: "erc721",
    label: "ERC-721 NFT",
    description: "Non-fungible token standard",
    icon: Shield,
    highlights: ["Unique tokens", "Metadata", "Royalties"],
    color: "text-purple-400",
  },
  {
    value: "erc1155",
    label: "ERC-1155 Multi-Token",
    description: "Hybrid fungible + non-fungible standard",
    icon: Layers,
    highlights: ["Batch mint", "Batch transfer", "Lower gas"],
    color: "text-blue-400",
  },
  {
    value: "payment-splitter",
    label: "Payment Splitter",
    description: "Split ether or tokens across recipients",
    icon: Wallet,
    highlights: ["Multi-recipient", "Proportional", "Automatic"],
    color: "text-yellow-400",
  },
  {
    value: "custom",
    label: "Custom Contract",
    description: "Bring your own ABI / requirements",
    icon: Code2,
    highlights: ["Custom modules", "Scaffold ready", "Generator hooks"],
    color: "text-gray-400",
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

const STEP_ENTRIES = [
  { title: "Platform", description: "Select chain & template" },
  { title: "Configuration", description: "Token metadata" },
  { title: "Features", description: "Optional modules" },
  { title: "Review", description: "Confirm & generate" },
];

const AIBadge = () => (
  <Badge variant="outline" className="ml-2 border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs">
    <Sparkles className="h-3 w-3 mr-1" />
    AI
  </Badge>
);

const StepProgress = ({ current }: { current: number }) => {
  return (
    <div className="flex items-center justify-center mb-4">
      <div className="flex items-center space-x-2">
        {STEP_ENTRIES.map((step, index) => (
          <div key={step.title} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  index <= current 
                    ? "bg-white text-black shadow-lg border border-white/20" 
                    : "bg-white/10 text-white/50 border border-white/20",
                )}
              >
                {index < current ? (
                  <CheckCircle2 className="h-4 w-4 text-black" />
                ) : (
                  <span className={cn(index <= current ? "text-black" : "text-white")}>{index + 1}</span>
                )}
              </div>
              <div className="mt-1 text-center">
                <p className={cn("text-xs font-medium", index <= current ? "text-white" : "text-white/60")}>
                  {step.title}
                </p>
                <p className="text-xs text-white/50">{step.description}</p>
              </div>
            </div>
            {index < STEP_ENTRIES.length - 1 && (
              <ChevronRight className="h-3 w-3 text-white/30 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface DappStudioFormImprovedProps extends DappStudioFormProps {
  userPrompt?: string;
  onReset?: () => void;
}

export const DappStudioFormImproved = ({ onSubmit, defaultValues, userPrompt, onReset }: DappStudioFormImprovedProps) => {
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
    mode: "onSubmit",
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
          <div className="flex flex-col justify-center h-full min-h-[400px] space-y-6">
            <FormField
              control={form.control}
              name="blockchain"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-lg font-semibold text-white flex items-center justify-center">
                    Select Blockchain
                    {hasAISuggestions && <AIBadge />}
                  </FormLabel>
                  <FormControl>
                    <div className="grid gap-2 grid-cols-5">
                      {chains.map((chain) => {
                        const isActive = field.value === chain.value;
                        return (
                          <Card
                            key={chain.value}
                            onClick={() => field.onChange(chain.value)}
                            className={cn(
                              "cursor-pointer border-white/10 bg-white/5 backdrop-blur transition-all duration-200",
                              isActive 
                                ? "border-white/20 bg-white text-black shadow-lg hover:bg-white hover:text-black" 
                                : "hover:border-white/30 hover:bg-white/10",
                            )}
                          >
                            <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
                              <chain.icon className={cn("h-5 w-5", isActive ? "text-gray-700" : chain.color)} />
                              <div className="space-y-1">
                                <p className={cn("font-medium text-xs", isActive ? "text-black" : "text-white")}>{chain.label}</p>
                                <p className={cn("text-xs leading-tight", isActive ? "text-gray-600" : "text-white/60")}>{chain.description}</p>
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
                  <FormLabel className="text-lg font-semibold text-white flex items-center justify-center">
                    Choose Contract Type
                    {hasAISuggestions && <AIBadge />}
                  </FormLabel>
                  <FormControl>
                    <div className="grid gap-2 grid-cols-5">
                      {contracts.map((contract) => {
                        const isActive = field.value === contract.value;
                        return (
                          <Card
                            key={contract.value}
                            onClick={() => field.onChange(contract.value)}
                            className={cn(
                              "cursor-pointer border-white/10 bg-white/5 backdrop-blur transition-all duration-200",
                              isActive 
                                ? "border-white/20 bg-white text-black shadow-lg hover:bg-white hover:text-black" 
                                : "hover:border-white/30 hover:bg-white/10",
                            )}
                          >
                            <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
                              <contract.icon className={cn("h-5 w-5", isActive ? "text-gray-700" : contract.color)} />
                              <div className="space-y-1">
                                <p className={cn("font-medium text-xs", isActive ? "text-black" : "text-white")}>{contract.label}</p>
                                <p className={cn("text-xs leading-tight", isActive ? "text-gray-600" : "text-white/60")}>{contract.description}</p>
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {contract.highlights.slice(0, 1).map((item) => (
                                    <Badge key={item} variant="secondary" className={cn("text-xs px-1 py-0", isActive ? "bg-gray-100 text-gray-600" : "bg-white/10 text-white/70")}>
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
        );

      case 1:
        return (
          <div className="flex flex-col justify-center h-full min-h-[400px] space-y-6">
            <div className="flex items-center justify-center gap-2 text-sm text-white/60">
              <Sparkles className="h-4 w-4 text-sky-300" />
              {hasAISuggestions 
                ? "AI has pre-filled these values. Review and customize as needed."
                : "Configure core metadata for your deployment."}
            </div>
            
            <div className="grid gap-4 grid-cols-2">
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
                      <Input 
                        {...field} 
                        placeholder="e.g., My Awesome Token" 
                        className="border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-blue-500/50" 
                      />
                    </FormControl>
                    <FormDescription className="text-white/50 text-xs">
                      The full name of your token (e.g., "Ethereum")
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
                      <Input 
                        {...field} 
                        placeholder="e.g., TKN" 
                        className="border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-blue-500/50" 
                      />
                    </FormControl>
                    <FormDescription className="text-white/50 text-xs">
                      Short ticker symbol (e.g., "ETH", usually 3-5 characters)
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
                      <Input 
                        {...field} 
                        placeholder="e.g., 1000000" 
                        className="border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-blue-500/50" 
                      />
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
                      <Input 
                        {...field} 
                        placeholder="18 (standard)" 
                        className="border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-blue-500/50" 
                      />
                    </FormControl>
                    <FormDescription className="text-white/50 text-xs">
                      Divisibility (18 is standard, 0 for NFTs)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="network"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Target Network</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-white/20 bg-white/10 text-white focus:ring-2 focus:ring-blue-500/50">
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-white/20 bg-slate-900 text-white">
                        <SelectItem value="testnet" className="focus:bg-white/10">Testnet (recommended)</SelectItem>
                        <SelectItem value="mainnet" className="focus:bg-white/10">Mainnet</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-white/50 text-xs">
                      Choose the network for deployment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="autoVerify"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-4">
                    <div className="space-y-1">
                      <FormLabel className="text-white text-sm">Auto-verify on Etherscan</FormLabel>
                      <FormDescription className="text-white/60 text-xs">
                        Automatically verify contract after deployment
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col justify-center h-full min-h-[400px] space-y-6">
            <div className="flex items-center justify-center gap-2 text-sm text-white/60">
              <Sparkles className="h-4 w-4 text-sky-300" />
              Attach optional modules. Your template will include audited patterns for each module you enable.
            </div>
            
            <FormField
              control={form.control}
              name="features"
              render={() => (
                <FormItem className="space-y-4">
                  <div className="grid gap-3 grid-cols-2">
                    {optionalFeatures.map((feature) => (
                      <FormField
                        key={feature.id}
                        control={form.control}
                        name="features"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(feature.id)}
                                onCheckedChange={(checked) => {
                                  const safe = field.value ?? [];
                                  return checked
                                    ? field.onChange([...safe, feature.id])
                                    : field.onChange(safe.filter((value) => value !== feature.id));
                                }}
                                className="data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black"
                              />
                            </FormControl>
                            <div className="space-y-1 text-white">
                              <FormLabel className="font-medium cursor-pointer text-sm">{feature.label}</FormLabel>
                              <FormDescription className="text-white/60 text-xs">{feature.description}</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="includeTests"
              render={({ field }) => (
                <FormItem className="flex items-center justify-center">
                  <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-4 w-full max-w-md">
                    <div className="space-y-1">
                      <FormLabel className="text-white text-sm">Generate test suite</FormLabel>
                      <FormDescription className="text-white/60 text-xs">
                        Create Foundry tests for your contract
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col justify-center h-full min-h-[400px] space-y-4">
            <div className="flex items-center justify-center gap-2 mb-6">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Review Configuration</h3>
            </div>
            
            <div className="space-y-4">
              {/* Configuration Summary */}
              <Card className="border-white/20 bg-white/5">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/60 mb-1">Blockchain</p>
                      <p className="text-white font-medium capitalize">{form.watch("blockchain")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 mb-1">Contract Type</p>
                      <p className="text-white font-medium uppercase">{form.watch("contractType")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 mb-1">Token Name</p>
                      <p className="text-white font-medium">{form.watch("tokenName")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 mb-1">Symbol</p>
                      <p className="text-white font-medium">{form.watch("tokenSymbol")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 mb-1">Total Supply</p>
                      <p className="text-white font-medium">{form.watch("tokenSupply")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 mb-1">Network</p>
                      <p className="text-white font-medium capitalize">{form.watch("network")}</p>
                    </div>
                  </div>

                  {form.watch("features")?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-white/60 mb-2">Enabled Features</p>
                      <div className="flex flex-wrap gap-2">
                        {form.watch("features").map((feature) => (
                          <Badge key={feature} className="bg-white/10 text-white border-white/20 text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Next Steps */}
              <div className="text-center space-y-2">
                <p className="text-sm text-white/70">
                  Ready to generate your smart contract?
                </p>
                <p className="text-xs text-white/50">
                  Click the generate button to create your contract template and proceed to deployment.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* User's Original Prompt - Compact Version */}
            {userPrompt && (
              <Card className="border-white/15 bg-white/8 backdrop-blur-md">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-white/80 mb-2">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span className="text-xs font-medium">Your Description</span>
                  </div>
                  <p className="text-white text-sm leading-relaxed px-1">
                    &quot;{userPrompt}&quot;
                  </p>
                </CardContent>
              </Card>
            )}

            {/* AI Suggestion Banner - Compact Version */}
            {hasAISuggestions && (
              <Card className="border-white/15 bg-white/8 backdrop-blur-md">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-white">AI Configuration Applied</p>
                      <p className="text-xs text-white/60 mt-1">
                        Pre-filled with smart defaults. Review and customize below.
                      </p>
                    </div>
                    {onReset && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="text-white/70 hover:text-black hover:bg-white/20 text-xs px-2 py-1 h-6"
                      >
                        Start Over
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step Progress */}
            <StepProgress current={step} />

            {/* Form and Navigation Layout */}
            <div className="relative flex justify-center">
              {/* Form Card - Centered */}
              <Card className="border-white/10 bg-white/8 backdrop-blur-md shadow-2xl min-h-[500px] w-full max-w-4xl">
                <CardContent className="p-6 text-white h-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="h-full"
                    >
                      {renderContent()}
                    </motion.div>
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Navigation Buttons - Positioned on the right side with proper spacing */}
              <div className="absolute -right-20 top-1/2 transform -translate-y-1/2 flex flex-col justify-center items-center gap-6 lg:flex hidden">
                <div className="flex flex-col items-center gap-4">
                  <span className="text-sm text-white/60">Step {step + 1} of {totalSteps}</span>
                  
                  {step === totalSteps - 1 ? (
                    <Button
                      type="submit"
                      className="bg-white text-black shadow-lg hover:bg-gray-100 border border-white/20 w-16 h-16 rounded-full flex items-center justify-center"
                    >
                      <Rocket className="h-6 w-6 text-black" />
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      onClick={goNext} 
                      className="bg-white text-black shadow-lg hover:bg-gray-100 border border-white/20 w-16 h-16 rounded-full flex items-center justify-center"
                    >
                      <ArrowRight className="h-6 w-6 text-black" />
                    </Button>
                  )}
                </div>

                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    className="border-white/20 text-white hover:bg-white hover:text-black w-16 h-16 rounded-full flex items-center justify-center"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                )}
              </div>

              {/* Mobile Navigation - Below form on small screens */}
              <div className="flex flex-row justify-center items-center gap-6 w-full mt-8 lg:hidden">
                <div className="flex flex-col items-center gap-4">
                  <span className="text-sm text-white/60">Step {step + 1} of {totalSteps}</span>
                  
                  {step === totalSteps - 1 ? (
                    <Button
                      type="submit"
                      className="bg-white text-black shadow-lg hover:bg-gray-100 border border-white/20 w-16 h-16 rounded-full flex items-center justify-center"
                    >
                      <Rocket className="h-6 w-6 text-black" />
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      onClick={goNext} 
                      className="bg-white text-black shadow-lg hover:bg-gray-100 border border-white/20 w-16 h-16 rounded-full flex items-center justify-center"
                    >
                      <ArrowRight className="h-6 w-6 text-black" />
                    </Button>
                  )}
                </div>

                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    className="border-white/20 text-white hover:bg-white hover:text-black w-16 h-16 rounded-full flex items-center justify-center"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};
