"use client";
import { z } from "zod";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, Loader2Icon, ChevronDown, Check, Globe, ScrollText, Presentation, FileText, Search, Table } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PROJECT_TEMPLATES } from "./constants";
import { ProjectLoading } from "@/components/ui/project-loading";
import { useClerk } from "@clerk/nextjs";
import { useMode } from "@/contexts/mode-context";
import { AttachInput, AttachmentPills, type AttachInputHandle, type AttachmentMeta, type AttachmentPill } from "@/components/chat/attach-input";
import { stashPendingFiles } from "@/lib/attachments/shuttle";
import { UNIQUE_MODELS, getModelById } from "@/lib/models";



interface Props {
    projectId?: string;
    mode?: "app" | "contract";
    contractPreview?: any;
    onContractPrompt?: (prompt: string) => void;
    projectCategory?: string | null;
    onCategoryClear?: () => void;
    onStartChat?: (prompt: string) => void;
    onModePrompt?: (mode: string, prompt: string, templateId?: string, model?: string) => void;
}

const MODE_CATEGORY_MAP: Record<string, string> = {
    slides: "slides",
    docs: "document",
    sheet: "sheet",
    "deep research": "deep-research",
};

const formSchema = z.object({
    value: z.string().min(1, { message: "Value is required" }).max(10000, { message: "Value must be less than 10000 characters" }),
});




export const ProjectForm = ({ contractPreview, onContractPrompt, projectCategory, onCategoryClear, onStartChat, onModePrompt }: Props) => {
    const clerk = useClerk();
    const router = useRouter();
    const queryClient = useQueryClient();
    const trpc = useTRPC();
    const { templateId } = useMode();
    const [showLoading, setShowLoading] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [showIdeas, setShowIdeas] = useState(false);
    const [isAnalyzingContract, setIsAnalyzingContract] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const modelMenuRef = useRef<HTMLDivElement | null>(null);
    // Model picked here is shared with the chat input via the same
    // localStorage key the chat store persists (cb_settings.modelId),
    // so the /chat composer picks it up after the redirect.
    const [selectedModel, setSelectedModel] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        try {
            const raw = localStorage.getItem("cb_settings");
            const parsed = raw ? JSON.parse(raw) : null;
            return typeof parsed?.modelId === "string" ? parsed.modelId : "";
        } catch {
            return "";
        }
    });
    const pickModel = (id: string) => {
        setSelectedModel(id);
        setShowModelMenu(false);
        try {
            const raw = localStorage.getItem("cb_settings");
            const parsed = raw ? JSON.parse(raw) : {};
            localStorage.setItem("cb_settings", JSON.stringify({ ...(typeof parsed === "object" && parsed ? parsed : {}), modelId: id }));
        } catch {
            // selection still applies for this session
        }
    };
    const selectedLabel = selectedModel ? (getModelById(selectedModel)?.label ?? selectedModel) : "Auto";
    const ideasMenuRef = useRef<HTMLDivElement | null>(null);
    const ideasButtonRef = useRef<HTMLButtonElement | null>(null);
    const attachRef = useRef<AttachInputHandle>(null);
    const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
    const [pendingPills, setPendingPills] = useState<AttachmentPill[]>([]);

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
        // Carry queued files into the chat so attachments survive the redirect.
        if (attachRef.current?.hasPending()) {
            stashPendingFiles(attachRef.current.getPendingFiles());
        }

        // Default: no category selected → start a chat
        if (!projectCategory && onStartChat) {
            onStartChat(values.value);
            return;
        }

        // Smart contract category → dapp-studio
        if (projectCategory === "smart contract" && onContractPrompt) {
            setIsAnalyzingContract(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                await onContractPrompt(values.value);
            } catch (error) {
                console.error("Error analyzing contract:", error);
                toast.error("Failed to analyze contract. Please try again.");
                setIsAnalyzingContract(false);
            }
            return;
        }

        // Mode categories (slides/docs/sheet/deep research) → mode conversation
        if (projectCategory && onModePrompt && MODE_CATEGORY_MAP[projectCategory]) {
            const targetMode = MODE_CATEGORY_MAP[projectCategory];
            onModePrompt(targetMode, values.value, templateId || undefined, selectedModel || undefined);
            return;
        }

        // Any other category → create project
        if (!clerk.user) {
            router.push("/sign-in");
            return;
        }

        try {
            await createProject.mutateAsync({ value: values.value });
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
                        "relative border border-white/20 rounded-3xl bg-white/10 backdrop-blur-lg transition-all duration-200 ease-out cursor-text shadow-xl",
                        isFocused && "border-white/40 shadow-2xl ring-1 ring-white/20",
                    )}
                >

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
                                    placeholder="Hello there. Let's move forward. What's the vision?"
                                    className="w-full resize-none border-none outline-none bg-transparent px-5 py-4 text-base text-white/60 placeholder:text-[#666] cursor-text"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            form.handleSubmit(onSubmit)(e);
                                        }
                                    }}
                                />
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
                        <AttachmentPills
                            pills={[
                                ...pendingPills,
                                ...attachments.map((a) => ({ id: a.id, name: a.fileName, size: a.size })),
                            ]}
                            onRemove={(id) => {
                                const pendingId = pendingPills.find((p) => p.id === id)?.id;
                                if (pendingId) {
                                    attachRef.current?.removePending(id);
                                } else {
                                    setAttachments((prev) => prev.filter((a) => a.id !== id));
                                }
                            }}
                            className="mb-2"
                        />
                        <div className="flex items-center justify-between">
                            <div className="relative" ref={modelMenuRef}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowModelMenu((v) => !v)}
                                    className="h-10 px-4 rounded-full bg-transparent text-white/90 hover:text-white transition-all duration-200 ease-out focus:ring-2 focus:ring-white/20 focus:outline-none -ml-2"
                                >
                                    <span className="max-w-[160px] truncate">{selectedLabel}</span>
                                    <ChevronDown className="ml-1 size-3 opacity-80" />
                                </Button>
                                {showModelMenu && (
                                    <div className="absolute bottom-12 left-0 w-72 max-h-72 overflow-y-auto thin-scrollbar rounded-xl border border-white/15 bg-black/95 backdrop-blur-xl text-white shadow-2xl p-2 z-20">
                                        <button
                                            type="button"
                                            onClick={() => pickModel("")}
                                            className={cn(
                                                "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                                                selectedModel === "" ? "bg-white/10" : "hover:bg-white/10"
                                            )}
                                        >
                                            <div className="flex-1">
                                                <div className="text-sm font-medium leading-tight">Auto</div>
                                                <div className="text-[11px] text-white/60 leading-snug">Recommended default for this workspace</div>
                                            </div>
                                            {selectedModel === "" && <Check className="h-4 w-4 shrink-0 text-white/80" />}
                                        </button>
                                        {UNIQUE_MODELS.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => pickModel(m.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                                                    selectedModel === m.id ? "bg-white/10" : "hover:bg-white/10"
                                                )}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium leading-tight truncate">{m.label}</div>
                                                    <div className="text-[11px] text-white/60 leading-snug truncate">{m.provider} · {Math.round(m.context / 1000)}K context</div>
                                                </div>
                                                {selectedModel === m.id && <Check className="h-4 w-4 shrink-0 text-white/80" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <AttachInput
                                    ref={attachRef}
                                    onAttach={(a) => setAttachments((prev) => [...prev, a])}
                                    onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
                                    attachments={attachments}
                                    disabled={isPending}
                                    onPendingChange={setPendingPills}
                                />
                                {projectCategory && onCategoryClear && (() => {
                                    const iconMap: Record<string, any> = {
                                        website: Globe,
                                        "smart contract": ScrollText,
                                        slides: Presentation,
                                        docs: FileText,
                                        "deep research": Search,
                                        sheet: Table,
                                    };
                                    const TagIcon = iconMap[projectCategory];
                                    return (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/25 group">
                                            {TagIcon && <TagIcon className="h-3.5 w-3.5 text-green-400" />}
                                            <span className="text-xs font-medium text-green-400 capitalize">{projectCategory}</span>
                                            <button
                                                type="button"
                                                onClick={onCategoryClear}
                                                className="h-4 w-4 flex items-center justify-center text-green-400/60 hover:text-green-300 hover:bg-green-500/20 transition-colors"
                                            >
                                                <span className="text-xs leading-none -mt-px">&times;</span>
                                            </button>
                                        </div>
                                    );
                                })()}
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
