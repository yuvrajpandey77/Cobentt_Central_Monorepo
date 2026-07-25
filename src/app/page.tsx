"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { ProjectCard, ProjectCardSkeleton } from "@/components/project-card";
import { ArrowDown, Sparkles, Zap, Code2, Rocket, ArrowRight, Loader2, Globe, ScrollText, Presentation, FileText, Search, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getDailyGreeting } from "@/lib/greetings";

const STORAGE_KEY = "cogy.home.mode";

type BuilderMode = "app" | "contract";

const PageContent = () => {
    const { isCollapsed } = useSidebar();
    const router = useRouter();
    const trpc = useTRPC();
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<BuilderMode>("app");
    const [projectType, setProjectType] = useState<"webapp" | "contract">("webapp");
    const [greeting] = useState(getDailyGreeting);
    const [projectCategory, setProjectCategory] = useState<string | null>(null);

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY) as BuilderMode | null;
        if (stored === "app" || stored === "contract") {
            setMode(stored);
        }
    }, []);

    const handleModeChange = (value: string) => {
        if (value === "app" || value === "contract") {
            setMode(value);
            window.localStorage.setItem(STORAGE_KEY, value);
        }
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
        getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    });

    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const copyProject = useMutation(trpc.projects.copyProject.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        },
    }));

    const projects = data?.pages.flatMap((page: any) => page.projects) ?? [];

    const starLines = useMemo(() => {
        let seed = 42;
        const next = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };
        const count = 56;
        return Array.from({ length: count }, (_, i) => {
            const left = next() * 100;
            const width = 1.2 + next() * 2.8;
            const length = 28 + next() * 72;
            const duration = 8 + next() * 16;
            const delay = -next() * duration;
            const opacity = 0.10 + next() * 0.20;
            return { id: i, left, width, length, duration, delay, opacity };
        });
    }, []);

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
                isCollapsed ? "lg:ml-16" : "lg:ml-64"
            )}>
                <Header />
                
                {/* Hero Section */}
                <section className="relative overflow-hidden h-screen flex items-start justify-center pt-[12.65rem]">
                    {/* Falling diagonal star-lines behind content */}
                    <div className="hero-star-field z-0">
                        {starLines.map((s) => (
                            <span
                                key={s.id}
                                className="hero-star-line"
                                style={{
                                    left: `${s.left}vw`,
                                    width: `${s.length}px`,
                                    height: `${s.width}px`,
                                    opacity: s.opacity,
                                    animationDuration: `${s.duration}s`,
                                    animationDelay: `${s.delay}s`,
                                }}
                            />
                        ))}
                    </div>
                    <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
                        <div className="text-center max-w-[47.52rem] mx-auto">
        
                            {/* Main Heading */}
                            <h1 className="text-3xl md:text-4xl font-semibold opacity-90 text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white drop-shadow-lg leading-tight ">
                                {greeting.heading}
                            </h1>

                            {/* Project Form */}
                            <div className="max-w-3xl mx-auto space-y-8 mt-8">
                                <ProjectForm 
                                    mode={mode}
                                    onContractPrompt={handleContractPromptAnalysis}
                                    projectCategory={projectCategory}
                                    onCategoryClear={() => setProjectCategory(null)}
                                    onStartChat={(prompt) => router.push(`/chat?q=${encodeURIComponent(prompt)}`)}
                                />

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
                                                    if (cat === "website") handleModeChange("app");
                                                    else if (cat === "smart contract") handleModeChange("contract");
                                                }}
                                                className={cn(
                                                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5",
                                                    projectCategory === cat
                                                        ? "bg-white/80 text-black shadow-lg"
                                                        : "text-white/40 hover:text-white/70 hover:bg-white/10",
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
                                    {projects.map((project: any) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
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
                                        <p className="text-white/40 text-sm">Scroll down to load more projects</p>
                                    ) : (
                                        <p className="text-white/40 text-sm">You've reached the end!</p>
                                    )}
            </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <Code2 className="w-16 h-16 text-white/40 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white/80 mb-2">
                                    No {projectType === "webapp" ? "web apps" : "smart contracts"} yet
              </h3>
                                <p className="text-white/60">
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
