"use client";
import { z } from "zod";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, Loader2Icon, LightbulbIcon, ChevronDown } from "lucide-react";
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
    const [showModelMenu, setShowModelMenu] = useState(false);
    const modelMenuRef = useRef<HTMLDivElement | null>(null);
    const ideasMenuRef = useRef<HTMLDivElement | null>(null);
    const ideasButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node | null;
            // Close model menu when clicking outside
            if (showModelMenu && modelMenuRef.current && target && !modelMenuRef.current.contains(target)) {
                setShowModelMenu(false);
            }
            // Close ideas panel when clicking outside both its panel and button
            const clickedInsideIdeasPanel = ideasMenuRef.current && target ? ideasMenuRef.current.contains(target) : false;
            const clickedIdeasButton = ideasButtonRef.current && target ? ideasButtonRef.current.contains(target) : false;
            if (showIdeas && !clickedInsideIdeasPanel && !clickedIdeasButton) {
                setShowIdeas(false);
            }
        }
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setShowModelMenu(false);
                setShowIdeas(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [showModelMenu, showIdeas]);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: "",
        },
    });

    const createProject = useMutation(trpc.projects.create.mutationOptions({
        onSuccess: (data) => {
            console.log("Project created successfully:", data);
            // Invalidate project list
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            // Invalidate usage so token bar refreshes
            queryClient.invalidateQueries({ queryKey: trpc.usage.quotaStatus.queryKey() as any });
            queryClient.invalidateQueries({ queryKey: trpc.usage.projectTotals.queryKey({ projectId: data.id }) as any });
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
            // Invalidate project list
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            // Invalidate usage so token bar refreshes
            queryClient.invalidateQueries({ queryKey: trpc.usage.quotaStatus.queryKey() as any });
            queryClient.invalidateQueries({ queryKey: trpc.usage.projectTotals.queryKey({ projectId: data.id }) as any });
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
    const modelName = mode === "contract" ? "GPT-4.1" : "GPT-5";

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
                        "relative border border-white/20 rounded-2xl bg-white/10 backdrop-blur-lg transition-all duration-200 ease-out cursor-text shadow-xl",
                        isFocused && "border-white/40 shadow-2xl ring-1 ring-white/20",
                    )}
                >
                    {/* Bottom-center attached tag below the input */}
                    <div className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 pointer-events-none">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-md  border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 text-[10px] leading-none text-white/70 shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
                            Beta v0.1
                        </div>
                    </div>
                    <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                            <div className="relative z-10">
                                <TextareaAutosize
                                    {...field}
                                    disabled={isPending}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    minRows={1}
                                    maxRows={6}
                                    className="w-full resize-none border-none outline-none bg-transparent px-5 py-4 text-base text-white/60 placeholder:text-white/30 cursor-text"
                                    placeholder=""
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            form.handleSubmit(onSubmit)(e);
                                        }
                                    }}
                                />
                                {/* Model toggle button moved to bottom-left */}
                                {!field.value && !isFocused && (
                                    <div className="absolute inset-0 px-5 py-4 pointer-events-none cursor-text flex items-center">
                                        <TypingAnimation 
                                            texts={typingTexts} 
                                            speed={15}
                                            pauseTime={1500}
                                            className="text-base text-white/40 text-left w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    />
                    
                    {/* Ideas Section */}
                    {showIdeas && (
                    <div className="px-5 pb-3" ref={ideasMenuRef}>
                        <div className="p-6 rounded-xl border border-white/15 bg-black/30 backdrop-blur-sm shadow-xl">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                <h3 className="text-sm font-semibold text-white">Quick Ideas</h3>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PROJECT_TEMPLATES.slice(0, 6).map((template) => (
                                    <Button
                                        key={template.title}
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-4 text-sm border-white/20 hover:border-white/40 bg-transparent hover:bg-white/10 text-white transition-colors duration-200"
                                        onClick={() => {
                                            onSelect(template.prompt);
                                        }}
                                    >
                                        <span className="truncate">{template.title}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Build Button Section */}
                    <div className="px-5 py-3">
                        <div className="flex items-center justify-between">
                            <div className="relative" ref={modelMenuRef}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowModelMenu((v) => !v)}
                                    className="h-10 px-4 rounded-full bg-transparent text-white/90 hover:text-white transition-all duration-200 ease-out focus:ring-2 focus:ring-white/20 focus:outline-none -ml-2"
                                >
                                    Auto
                                    <ChevronDown className="ml-1 size-3 opacity-80" />
                                </Button>
                                {showModelMenu && (
                                    <div className="absolute bottom-12 left-0 w-50 rounded-md border border-white/15 bg-black text-white shadow-2xl p-3 z-20">
                                        <div className="text-[11px] text-white/80 mb-2 text-left">{modelName}</div>
                                        <div className="flex items-center justify-start gap-1">
                                            <div className="text-left">
                                                <div className="text-sm font-medium leading-tight">Auto</div>
                                                <div className="text-[11px] text-white/60 leading-snug">Balanced quality and speed, recommended for most tasks</div>
                                            </div>
                                            <button
                                                type="button"
                                                aria-disabled
                                                title="Fixed option"
                                                className="relative inline-flex h-5 w-14 items-center rounded-full bg-white/20 border border-white/40 cursor-not-allowed"
                                            >
                                                <div className="h-4 w-4 rounded-full bg-white translate-x-3 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    ref={ideasButtonRef}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowIdeas(!showIdeas)}
                                    className="h-10 w-10 rounded-full bg-transparent text-white/90 hover:text-white transition-all duration-200 ease-out focus:ring-2 focus:ring-white/20 focus:outline-none"
                                >
                                    <LightbulbIcon className="size-4" />
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
                                        <Loader2Icon className="size-4 animate-spin" />
                                    ) : (
                                        <ArrowUp className="size-4" />
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
