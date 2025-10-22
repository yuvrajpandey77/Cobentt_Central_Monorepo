"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useInfiniteQuery } from "@tanstack/react-query";

import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/sections/landing-sections";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { ProjectCard, ProjectCardSkeleton } from "@/components/project-card";
import { ArrowDown, Sparkles, Zap, Code2, Rocket, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "cogy.home.mode";

type BuilderMode = "app" | "contract";

const PageContent = () => {
    const { isCollapsed } = useSidebar();
    const router = useRouter();
    const trpc = useTRPC();
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<BuilderMode>("app");

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
        router.push(`/dapp-studio?prompt=${encodeURIComponent(userPrompt)}`);
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        ...trpc.projects.getAll.infiniteQueryOptions({ limit: 20 }),
        getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    });

    const projects = data?.pages.flatMap((page: any) => page.projects) ?? [];

    const starLines = useMemo(() => {
        const count = 56;
        return Array.from({ length: count }, (_, i) => {
            const left = Math.random() * 100; // vw
            const width = 1.2 + Math.random() * 2.8; // px thickness
            const length = 28 + Math.random() * 72; // px length
            const duration = 8 + Math.random() * 16; // seconds
            const delay = -Math.random() * duration; // negative to desync starts
            const opacity = 0.10 + Math.random() * 0.20; // still subtle but more visible
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
                <section className="relative overflow-hidden h-screen flex items-start justify-center pt-40">
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
                        <div className="text-center max-w-2xl mx-auto">
                            {/* Beta Badge */}
                            <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-white/10 transition-colors mb-6">
                                {/* subtle shine */}
                                <span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
                                    <span className="absolute -inset-y-2 -left-8 w-2/3 bg-gradient-to-r from-white/0 via-white/25 to-white/0 blur-sm translate-x-0 will-change-transform animate-[shine_2.2s_linear_infinite]" />
                                </span>
                                {/* Custom unique glyph (spark-hex) */}
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4 text-white/90"
                                    aria-hidden
                                >
                                    <path
                                        d="M12 2.8l2.35 3.9 4.45 1.23-2.9 3.2.42 4.64L12 14.7l-4.32 1.07.42-4.64-2.9-3.2 4.45-1.23L12 2.8z"
                                        fill="currentColor"
                                        opacity="0.9"
                                    />
                                    <circle cx="12" cy="12" r="2.2" fill="white" opacity="0.85" />
                                </svg>
                                <span className="text-xs font-semibold tracking-wide text-white/90 leading-none align-middle">Beta 0.1</span>
                            </div>

                            {/* Main Heading */}
                            <h1 className="text-4xl md:text-5xl font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white drop-shadow-lg leading-tight ">
                                Build your app with Cogy
                            </h1>
                            
                            {/* Subtitle */}
                            <p className="mt-2 text-lg text-white/20 mb-4 max-w-xl mx-auto ">
                                {mode === "app" 
                                    ? "Describe your app idea and watch Cogy build it for you in minutes."
                                    : "Describe your smart contract and let AI generate the perfect configuration."}
                            </p>

                            {/* Project Form */}
                            <div className="max-w-3xl mx-auto  space-y-8">
                                <ProjectForm 
                                    mode={mode}
                                    onContractPrompt={handleContractPromptAnalysis}
                                />

                                <div className="flex flex-col items-center justify-center gap-4">
                                    <ToggleGroup
                                        type="single"
                                        value={mode}
                                        onValueChange={handleModeChange}
                                        className="flex overflow-hidden rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur"
                                    >
                                        <ToggleGroupItem
                                            value="app"
                                            className={cn(
                                                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition",
                                                mode === "app"
                                                    ? "bg-primary/90 text-primary-foreground shadow-lg"
                                                    : "hover:bg-white/10",
                                            )}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Build Dapp
                                        </ToggleGroupItem>
                                        <ToggleGroupItem
                                            value="contract"
                                            className={cn(
                                                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition",
                                                mode === "contract"
                                                    ? "bg-primary/90 text-primary-foreground shadow-lg"
                                                    : "hover:bg-white/10",
                                            )}
                                        >
                                            <Code2 className="h-4 w-4" />
                                            Smart Contract
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                    <div className="flex flex-col items-center gap-2 text-center">
                                        <Badge variant="secondary" className="rounded-full border border-white/10 bg-white/10 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                                            {mode === "app" ? "Full App" : "Smart Contract"}
                                        </Badge>
                                        <p className="text-sm text-white/60">
                                            {mode === "app"
                                                ? "Describe your full-stack idea and let Cogy assemble UI, APIs, and infrastructure."
                                                : "Describe your smart contract and AI will pre-fill the configuration for you to review."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Projects Grid Section */}
                <section className="py-16 bg-black/10 backdrop-blur-sm">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12 rounded-2xl">
                            <h2 className="text-3xl font-bold mb-4 text-white">
                                Community Projects
                            </h2>
                            <p className="text-lg text-white/80 max-w-2xl mx-auto">
                                Explore amazing projects built by our community using Cogerphere
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
                                        <ProjectCard key={project.id} project={project} />
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
                                    No projects yet
                                </h3>
                                <p className="text-white/60">
                                    Be the first to create a project and share it with the community!
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