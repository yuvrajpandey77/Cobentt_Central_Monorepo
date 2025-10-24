"use client";
import { z } from "zod";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, Loader2Icon, LightbulbIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PROJECT_TEMPLATES } from "./constants";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { ProjectLoading } from "@/components/ui/project-loading";
import { useClerk } from "@clerk/nextjs";



interface Props {
    projectId?: string;
    mode?: "app" | "contract";
    contractPreview?: any;
    onContractPrompt?: (prompt: string) => void;
}

const formSchema = z.object({
    value: z.string().min(1, { message: "Value is required" }).max(10000, { message: "Value must be less than 10000 characters" }),
});




export const ProjectForm = ({ mode = "app", contractPreview, onContractPrompt }: Props) => {
    const clerk = useClerk();
    const router = useRouter();
    const queryClient = useQueryClient();
    const trpc = useTRPC();
    const [showLoading, setShowLoading] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [showIdeas, setShowIdeas] = useState(false);
    const [isAnalyzingContract, setIsAnalyzingContract] = useState(false);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: "",
        },
    });

    const createProject = useMutation(trpc.projects.create.mutationOptions({
        onSuccess: (data) => {
            console.log("Project created successfully:", data);
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            setCreatedProjectId(data.id);
            setShowLoading(true);
            console.log("Loading screen should now be visible");
        },
        onError: (error) => {
            toast.error(error.message);
            if(error.data?.code === "UNAUTHORIZED") {
                router.push("/sign-in");
            }
        },
    }));

    const createDappProject = useMutation(trpc.projects.createDapp.mutationOptions({
        onSuccess: (data) => {
            console.log("Dapp project created successfully:", data);
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            
            // Redirect to build page to show real-time progress
            router.push(`/projects/${data.id}/build`);
        },
        onError: (error) => {
            toast.error(error.message);
            if(error.data?.code === "UNAUTHORIZED") {
                router.push("/sign-in");
            }
        },
    }));

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        console.log("Form submitted with values:", values);
        
        // If in contract mode without preview, trigger contract prompt analysis (redirect to dapp-studio)
        if (mode === "contract" && onContractPrompt) {
            setIsAnalyzingContract(true);
            try {
                // Add a small delay to show the loading state before navigation
                await new Promise(resolve => setTimeout(resolve, 500));
                await onContractPrompt(values.value);
            } catch (error) {
                console.error("Error analyzing contract:", error);
                toast.error("Failed to analyze contract. Please try again.");
                setIsAnalyzingContract(false);
            }
            // Note: Don't reset isAnalyzingContract here as we're navigating away
            return;
        }
        
        // If user is not authenticated, redirect to sign-in before attempting mutation
        if (!clerk.user) {
            router.push("/sign-in");
            return;
        }
        
        try {
            // Create regular website project (app mode)
            await createProject.mutateAsync({
                value: values.value,
            });
        } catch (error) {
            console.error("Error creating project:", error);
            const code = (error as any)?.data?.code ?? (error as any)?.shape?.code;
            const httpStatus = (error as any)?.data?.httpStatus;
            if (code === "UNAUTHORIZED" || httpStatus === 401) {
                router.push("/sign-in");
            }
        }
    };

    const handleLoadingComplete = () => {
        console.log("Loading completed, navigating to project:", createdProjectId);
        if (createdProjectId) {
            router.push(`/projects/${createdProjectId}`);
        }
    };

    const onSelect = (value: string) => { 
        form.setValue("value", value, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        });
    };

    const [isFocused, setIsFocused] = useState(false);
    const isPending = createProject.isPending;
    const isButtonDisabled = isPending || isAnalyzingContract || !form.formState.isValid;

    // Typing animation texts
    const appTexts = [
        "Ask Cogerphere to create a dashboard to track your team's productivity",
        "Build a modern e-commerce website with React and Stripe integration",
        "Create a social media app with real-time chat and notifications",
        "Develop a project management tool with drag-and-drop functionality",
        "Build a fitness tracking app with workout plans and progress charts",
        "Create a restaurant ordering system with online payments",
        "Develop a learning management system with video streaming",
        "Build a real estate platform with property listings and virtual tours"
    ];

    const contractTexts = [
        "NFT collection for digital artwork with royalties",
        "Loyalty token for my coffee shop rewards program",
        "Gaming token with staking and rewards mechanism",
        "Governance token for my DAO with voting capabilities",
        "Multi-token standard for in-game items (ERC-1155)",
        "Payment splitter contract for revenue sharing"
    ];

    const typingTexts = mode === "contract" ? contractTexts : appTexts;

    return (
        <>
            {showLoading && (
                <>
                    {console.log("Rendering ProjectLoading component")}
                    <ProjectLoading onComplete={handleLoadingComplete} />
                </>
            )}
            <Form {...form}>
                <section className="space-y-6">
                <form 
                    id="main-project-form"
                    onSubmit={form.handleSubmit(onSubmit)} 
                    className={cn(
                        "relative border border-white/40 rounded-xl bg-white/10 backdrop-blur-lg transition-all duration-200 ease-out cursor-text shadow-xl",
                        isFocused && "border-white/60 shadow-2xl ring-2 ring-white/30",
                    )}
                >
                    <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                            <div className="relative">
                                <TextareaAutosize
                                    {...field}
                                    disabled={isPending}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    minRows={1}
                                    maxRows={6}
                                    className="w-full resize-none border-none outline-none bg-transparent px-5 py-4 text-base text-white placeholder:text-white/60 cursor-text"
                                    placeholder=""
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                            e.preventDefault();
                                            form.handleSubmit(onSubmit)(e);
                                        }
                                    }}
                                />
                                {!field.value && !isFocused && (
                                    <div className="absolute inset-0 px-5 py-4 pointer-events-none cursor-text flex items-center">
                                        <TypingAnimation 
                                            texts={typingTexts} 
                                            speed={15}
                                            pauseTime={1500}
                                            className="text-base text-white/60 text-left w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    />
                    
                    {/* Ideas Section */}
                    {showIdeas && (
                        <div className="px-5 pb-3">
                            <div className="p-4 bg-white/15 backdrop-blur-sm rounded-lg border border-white/30 shadow-lg">
                                <div className="flex flex-wrap gap-2">
                                    {PROJECT_TEMPLATES.slice(0, 6).map((template) => (
                                        <Button
                                            key={template.title}
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-3 text-xs bg-white/30 hover:bg-white/50 border-white/50 hover:border-white/70 transition-all duration-200 ease-out hover:scale-105 backdrop-blur-sm text-gray-800 font-medium shadow-sm focus:ring-2 focus:ring-white/20 focus:outline-none"
                                            onClick={() => {
                                                onSelect(template.prompt);
                                            }}
                                        >
                                            <span className="mr-1 text-sm">{template.emoji}</span>
                                            {template.title}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Build Button Section */}
                    <div className="px-5 py-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-white/80 font-mono">
                                <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-white/40 bg-white/20 px-2 text-sm font-mono font-medium text-white/90">
                                    Ctrl + Enter
                                </kbd>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowIdeas(!showIdeas)}
                                    className="text-white/80 hover:text-black hover:bg-white/20 transition-all duration-200 ease-out focus:ring-2 focus:ring-white/20 focus:outline-none"
                                >
                                    <LightbulbIcon className="size-4 mr-1" />
                                    Ideas
                                    {showIdeas ? (
                                        <ChevronUpIcon className="size-4 ml-1" />
                                    ) : (
                                        <ChevronDownIcon className="size-4 ml-1" />
                                    )}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isButtonDisabled}
                                    size="default"
                                    className={cn(
                                        "h-10 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 ease-out focus:ring-2 focus:ring-primary/20 focus:outline-none",
                                        isButtonDisabled && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isPending || isAnalyzingContract ? (
                                        <>
                                            <Loader2Icon className="size-3 animate-spin mr-1" />
                                            {mode === "contract" ? "Analyzing..." : "Building..."}
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUp className="size-3 mr-1" />
                                            {mode === "contract" ? "Analyze" : "Build"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </section>
        </Form>
        </>
    )
}
