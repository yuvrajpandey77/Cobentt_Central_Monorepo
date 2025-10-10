"use client";

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MessagesContainer } from "@/modules/projects/ui/components/messages-container";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fragment } from "@/generated/prisma";
import { ProjectHeader } from "../components/project-header";
import { FragmentWeb } from "../components/fragment-web";
import { CodeIcon, CrownIcon, EyeIcon, RotateCcwIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AsyncButton from "@/components/async-button";
import { FileExplorer } from "@/components/file-explorer";
import { UserControl } from "@/components/user-control";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { shouldAutoRestoreSandbox, getSandboxAge, isSandboxInWarningState } from "@/lib/sandbox-utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
    projectId: string;
}

export const ProjectView = ({ projectId }: Props) => {
    const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);

    const [tabsState, setTabsState] = useState<"preview" | "code">("preview");
    const [restoring, setRestoring] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [sandboxDead, setSandboxDead] = useState(false);
    const [autoRestoreAttempted, setAutoRestoreAttempted] = useState(false);
    const handleRestore = useCallback(async () => {
        if (!activeFragment?.id) return;
        const dismiss = toast.loading("Restoring sandbox…");
        try {
            setRestoring(true);
            const res = await fetch("/api/sandbox/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fragmentId: activeFragment.id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Failed to restore");
            setActiveFragment({ ...(activeFragment as any), sandboxUrl: json.sandboxUrl });
            setTabsState("preview");
            toast.success("Sandbox restored", { id: dismiss });
        } catch (e: any) {
            toast.error(e?.message || "Restore failed", { id: dismiss });
        } finally {
            setRestoring(false);
        }
    }, [activeFragment]);


    // Automatic sandbox restoration for fragments older than 18 minutes
    useEffect(() => {
        if (!activeFragment || autoRestoreAttempted || restoring) return;
        
        if (shouldAutoRestoreSandbox(activeFragment)) {
            setAutoRestoreAttempted(true);
            toast.info(`Sandbox created ${getSandboxAge(activeFragment)} - Auto-restoring...`);
            handleRestore();
        } else if (isSandboxInWarningState(activeFragment)) {
            // Show warning for sandboxes close to expiry
            toast.warning(`Sandbox will expire soon (${getSandboxAge(activeFragment)})`, {
                description: "Consider restoring to avoid interruption",
                duration: 5000,
            });
        }
    }, [activeFragment, autoRestoreAttempted, restoring, handleRestore]);

    const handleDownload = useCallback(async () => {
        const dismiss = toast.loading("Preparing download…");
        try {
            setDownloading(true);
            const res = await fetch("/api/projects/download", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error?.error || "Failed to download");
            }

            // Get the filename from the response headers
            const contentDisposition = res.headers.get("Content-Disposition");
            const filename = contentDisposition
                ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
                : "project_code.zip";

            // Create blob and download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast.success("Download completed", { id: dismiss });
        } catch (e: any) {
            toast.error(e?.message || "Download failed", { id: dismiss });
        } finally {
            setDownloading(false);
        }
    }, [projectId]);
    // const trpc = useTRPC();
    // const {data: project} = useSuspenseQuery(trpc.projects.getOne.queryOptions({ id: projectId }));
    const HeaderSkeleton = () => (
        <div className="p-3 border-b">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-5 w-40" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>
        </div>
    );

    const MessagesSkeleton = () => (
        <div className="p-3 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            {i % 3 === 0 && <Skeleton className="h-4 w-1/2" />}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="h-screen">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={35}
                    minSize={20}
                    className="flex flex-col min-h-0"
                >
                    <ErrorBoundary fallback={<div>Error loading project...</div>}>
                        <Suspense fallback={<HeaderSkeleton />}>
                            <ProjectHeader projectId={projectId} />
                        </Suspense>
                    </ErrorBoundary>
                    <ErrorBoundary fallback={<div>Error loading messages...</div>}>
                        <Suspense fallback={<MessagesSkeleton />}>
                            <MessagesContainer
                            projectId={projectId}
                            activeFragment={activeFragment}
                            setActiveFragment={setActiveFragment}

                            />
                        </Suspense>
                    </ErrorBoundary>
                </ResizablePanel>

                <ResizableHandle className="hover:bg-primary trasition-colors" />
                <ResizablePanel
                    defaultSize={65}
                    minSize={50}


                >
                    <Tabs className="h-full gap-y-0 "
                        defaultValue="preview"
                        value={tabsState}
                        onValueChange={(value) => setTabsState(value as "preview" | "code")}
                    >
                        <div className="w-full flex items-center p-2 border-b bg-sidebar">
                            <TabsList className="h-10 p-1 border rounded-full w-auto">
                                <TabsTrigger value="preview" className="rounded-full h-8 px-3 flex items-center gap-2">
                                    <EyeIcon className="h-4 w-4" />
                                    <span>Demo</span>
                                </TabsTrigger>
                                <TabsTrigger value="code" className="rounded-full h-8 px-3 flex items-center gap-2">
                                    <CodeIcon className="h-4 w-4" />
                                    <span>Code</span>
                                </TabsTrigger>
                            </TabsList>
                            <div className="ml-auto flex items-center gap-x-2">
                                <AsyncButton
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    loadingText="Downloading..."
                                    className=""
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <DownloadIcon className="h-4 w-4" />
                                        <span>Download</span>
                                    </span>
                                </AsyncButton>
                                {activeFragment && (
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            isSandboxInWarningState(activeFragment)
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                        }`}>
                                            {getSandboxAge(activeFragment)}
                                        </div>
                                        <AsyncButton
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRestore}
                                            loadingText="Restoring..."
                                            disabled={!activeFragment}
                                            className=""
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <RotateCcwIcon className="h-4 w-4" />
                                                <span>Restore</span>
                                            </span>
                                        </AsyncButton>
                                    </div>
                                )}
                                {/* <Button asChild variant="tertiary" size="sm" className="flex items-center gap-2  text-white px-4 py-2 min-w-[50px]">
                                    <Link href="/pricing" className="flex items-center gap-2 w-full justify-center">
                                        <CrownIcon className="h-4 w-4" />
                                        <span className="font-medium">Upgrade</span>
                                    </Link>
                                </Button> */}

                            </div>
                            <div className="ml-2 gap-x-2 flex items-center">
                                <UserControl showName={false} />
                            </div>



                        </div>
                        <TabsContent value="preview">
                            {!!activeFragment && (
                                <FragmentWeb
                                    data={activeFragment}
                                    isRestoring={restoring}
                                    onSandboxStateChange={setSandboxDead}
                                />
                            )}
                        </TabsContent>
                        <TabsContent value="code" className="min-h-0">
                            {!!activeFragment?.files && (
                                <FileExplorer
                                    files={activeFragment.files as { [path: string]: string }} />
                            )}
                        </TabsContent>

                    </Tabs>

                </ResizablePanel>

            </ResizablePanelGroup>

        </div>
    )
}