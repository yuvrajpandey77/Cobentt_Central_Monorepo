"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { ModeProvider } from "@/contexts/mode-context";
import { TemplatePicker } from "@/components/mode-template-picker";
import { ProjectCard, ProjectCardSkeleton } from "@/components/project-card";
import { Zap, Code2, Globe, ScrollText, Presentation, FileText, Search, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDailyGreeting } from "@/lib/greetings";
import { MODE_DEFAULTS } from "@/lib/models";
import { toast } from "sonner";
import { RoseAnimation } from "@/components/rose-animation";

const MODE_CATEGORY_MAP: Record<string, string> = {
    slides: "slides",
    docs: "document",
    sheet: "sheet",
    "deep research": "deep-research",
};

type CardProject = ComponentProps<typeof ProjectCard>["project"];

const PageContent = () => {
    const { isCollapsed } = useSidebar();
    const router = useRouter();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const [projectType, setProjectType] = useState<"webapp" | "contract">("webapp");
    const [greeting] = useState(getDailyGreeting);
    const [projectCategory, setProjectCategory] = useState<string | null>(null);
    const { userId } = useAuth();

    const createModeConversation = useMutation(trpc.conversations.create.mutationOptions({
        onSuccess: (data) => {
            queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
            router.push(`/${data.mode || "chat"}/${data.id}`);
        },
        onError: (err) => toast.error(err.message || "Failed to create"),
    }));

    const handleModePrompt = (mode: string, prompt: string, templateId?: string, model?: string) => {
        if (!userId) {
            router.push("/sign-in");
            return;
        }
        createModeConversation.mutate({
            initialMessage: prompt,
            mode,
            ...(templateId ? { template: templateId } : {}),
            // Honor the model picked in the input box; otherwise use the mode default.
            ...(model
                ? { model }
                : MODE_DEFAULTS[mode as keyof typeof MODE_DEFAULTS]
                    ? { model: MODE_DEFAULTS[mode as keyof typeof MODE_DEFAULTS] }
                    : {}),
        });
    };

    const handleContractPromptAnalysis = async (userPrompt: string) => {
        // Redirect to DApp Studio with the prompt
        // The DApp Studio page will handle the analysis and show the form
        return new Promise<void>((resolve) => {
            const url = `/dapp-studio?prompt=${encodeURIComponent(userPrompt)}`;
            router.push(url);
            // Resolve after a short delay to allow the loading state to be visible
            setTimeout(() => resolve(), 100);
        });
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        ...trpc.projects.getAll.infiniteQueryOptions({ 
            limit: 20,
            projectType: projectType
        }),
        getNextPageParam: (lastPage: { nextCursor?: string | null }) => lastPage.nextCursor,
    });

    const copyProject = useMutation(trpc.projects.copyProject.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        },
    }));

    const projects = data?.pages.flatMap((page) => page.projects) ?? [];

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
    
  return (
        <div className="min-h-screen flex">
            {/* Sidebar - Fixed Full Height */}
            <Sidebar className="hidden lg:block fixed left-0 top-0 h-screen z-50" />
            
            {/* Main Content - Scrollable */}
            <div className={cn(
                "flex-1 transition-all duration-500 ease-in-out",
                isCollapsed ? "lg:ml-[52px]" : "lg:ml-[240px]"
            )}>
                <Header />
                
                {/* Hero Section */}
                <section className="relative overflow-hidden h-screen flex items-start justify-center pt-[10.75rem]">
                    <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
                        <div className="text-center max-w-[47.52rem] mx-auto">
        
                            <RoseAnimation />

                            {/* Main Heading */}
                            <h1 className="text-3xl md:text-4xl font-semibold opacity-90 leading-tight">
                                {greeting.heading}
                            </h1>

                            {/* Project Form */}
                            <div className="max-w-3xl mx-auto space-y-8 mt-8">
                                <ModeProvider>
                                    <ProjectForm 
                                        onContractPrompt={handleContractPromptAnalysis}
                                        projectCategory={projectCategory}
                                        onCategoryClear={() => setProjectCategory(null)}
                                        onStartChat={(prompt) => router.push(`/chat?q=${encodeURIComponent(prompt)}`)}
                                        onModePrompt={handleModePrompt}
                                    />
                                    {projectCategory && projectCategory !== "slides" && MODE_CATEGORY_MAP[projectCategory] && (
                                        <div className="flex justify-center">
                                            <TemplatePicker mode={MODE_CATEGORY_MAP[projectCategory]} />
                                        </div>
                                    )}
                                </ModeProvider>

                                <div className="flex items-center justify-center">
                                    <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 p-1 backdrop-blur">
                                        {([
                                            ["website", Globe],
                                            ["smart contract", ScrollText],
                                            ["slides", Presentation],
                                            ["docs", FileText],
                                            ["deep research", Search],
                                            ["sheet", Table],
                                        ] as const).map(([cat, Icon]) => (
                                            <button
                                                key={cat}
                                                    onClick={() => {
                                                        setProjectCategory(projectCategory === cat ? null : cat);
                                                    }}
                                                className={cn(
                                                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5",
                                                    projectCategory === cat
                                                        ? "bg-white/80 text-black shadow-lg"
                                                        : "text-text-tertiary hover:text-text-secondary hover:bg-white/10",
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
            </div>
          </div>
        </div>
      </section>


                {/* Projects Grid Section */}
                <section className="py-16 bg-black/10 backdrop-blur-sm">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 rounded-2xl">
                            {/* Header with centered title and right-aligned toggle */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1"></div> {/* Spacer */}
                                <h2 className="text-3xl font-bold text-white text-center flex-1">
                                    Community Projects
                </h2>
                                <div className="flex-1 flex justify-end"> {/* Right-aligned toggle */}
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-1">
                                        <button
                                            onClick={() => setProjectType("webapp")}
                                            className={cn(
                                                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-all duration-200",
                                                projectType === "webapp"
                                                    ? "bg-primary/90 text-primary-foreground shadow-lg"
                                                    : "hover:bg-white/10",
                                            )}
                                        >
                                            <Code2 className="h-4 w-4" />
                                            Web Apps
                                        </button>
                                        <button
                                            onClick={() => setProjectType("contract")}
                                            className={cn(
                                                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-all duration-200",
                                                projectType === "contract"
                                                    ? "bg-primary/90 text-primary-foreground shadow-lg"
                                                    : "hover:bg-white/10",
                                            )}
                                        >
                                            <Zap className="h-4 w-4" />
                                            Smart Contracts
                                        </button>
                  </div>
                </div>
              </div>
                            <p className="text-lg text-white/80 max-w-2xl mx-auto text-center">
                                Explore amazing projects built by our community using Cobentt
            </p>
          </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <ProjectCardSkeleton key={i} />
                                ))}
              </div>
                        ) : projects && projects.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {projects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project as unknown as CardProject}
                                            showCopyButton={!!userId}
                                            onCopy={(id) => copyProject.mutate({ projectId: id })}
                                            isCopying={copyProject.isPending}
                                        />
                                    ))}
            </div>

                                {/* Load more trigger */}
                                <div ref={loadMoreRef} className="mt-8 text-center">
                                    {isFetchingNextPage ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <ProjectCardSkeleton key={i} />
                                            ))}
              </div>
                                    ) : hasNextPage ? (
                                        <p className="text-text-tertiary text-sm">Scroll down to load more projects</p>
                                    ) : (
                                        <p className="text-text-tertiary text-sm">You&apos;ve reached the end!</p>
                                    )}
            </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <Code2 className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white/80 mb-2">
                                    No {projectType === "webapp" ? "web apps" : "smart contracts"} yet
              </h3>
                                <p className="text-text-secondary">
                                    Be the first to create a {projectType === "webapp" ? "web app" : "smart contract"} and share it with the community!
                                </p>
            </div>
                        )}
                    </div>
                </section>

                {/* Footer */}
                <Footer />
            </div>
        </div>
    );
};

const Page = () => {
    return (
        <SidebarProvider>
            <PageContent />
        </SidebarProvider>
    );
};

export default Page;
