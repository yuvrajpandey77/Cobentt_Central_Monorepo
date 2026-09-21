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
import { CodeIcon, CrownIcon, EyeIcon, RotateCcwIcon, DownloadIcon, Copy, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AsyncButton from "@/components/async-button";
import { FileExplorer } from "@/components/file-explorer";
import { UserControl } from "@/components/user-control";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { shouldAutoRestoreSandbox, getSandboxAge, isSandboxInWarningState } from "@/lib/sandbox-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/nextjs";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
    projectId: string;
}

export const ProjectView = ({ projectId }: Props) => {
    const { user } = useUser();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { data: project } = useQuery(trpc.projects.getOne.queryOptions({ id: projectId }));
    const isOwner = !!project && !!user && project.userId === user.id;
    const isReadOnly = !!project && !isOwner;

    const copyProject = useMutation(trpc.projects.copyProject.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            toast.success("Project copied to your account!");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to copy project");
        },
    }));

    const setVisibility = useMutation(trpc.projects.setVisibility.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            queryClient.invalidateQueries(trpc.projects.getAll.infiniteQueryOptions({ limit: 20 }));
            toast.success(project?.isPublic ? "Project made private" : "Project made public!");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update visibility");
        },
    }));

    const [renameOpen, setRenameOpen] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [deleteOpen, setDeleteOpen] = useState(false);

    const renameMutation = useMutation(trpc.projects.rename.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            toast.success("Project renamed");
            setRenameOpen(false);
        },
        onError: (err) => toast.error(err.message || "Failed to rename"),
    }));

    const deleteMutation = useMutation(trpc.projects.delete.mutationOptions({
        onSuccess: () => {
            toast.success("Project deleted");
            window.location.href = "/";
        },
        onError: (err) => toast.error(err.message || "Failed to delete"),
    }));

    const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
    const [filesState, setFilesState] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        setFilesState(null);
    }, [activeFragment?.id]);

    const handleFileChange = useCallback(async (filePath: string, content: string) => {
        const baseFiles = activeFragment?.files as Record<string, string> | undefined;
        if (!baseFiles) return;
        const updatedFiles = { ...baseFiles, ...(filesState || {}), [filePath]: content };

        setFilesState(updatedFiles);

        try {
            const res = await fetch(`/api/projects/${projectId}/save-codebase`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: updatedFiles }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
            toast.success("File saved");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to save to sandbox");
        }
    }, [activeFragment, filesState, projectId]);

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
            const json = (await res.json()) as { sandboxUrl: string; error?: string };
            if (!res.ok) throw new Error(json?.error || "Failed to restore");
            setActiveFragment({ ...activeFragment, sandboxUrl: json.sandboxUrl });
            setTabsState("preview");
            toast.success("Sandbox restored", { id: dismiss });
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Restore failed", { id: dismiss });
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
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Download failed", { id: dismiss });
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
                    {isReadOnly && (
                        <div className="flex items-center justify-between px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
                            <p className="text-sm text-blue-300">
                                Viewing in read-only mode
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyProject.mutate({ projectId })}
                                disabled={copyProject.isPending}
                                className="bg-blue-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200"
                            >
                                {copyProject.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Copy className="w-4 h-4 mr-2" />
                                )}
                                Use as Template
                            </Button>
                        </div>
                    )}
                    <ErrorBoundary fallback={<div>Error loading messages...</div>}>
                        <Suspense fallback={<MessagesSkeleton />}>
                            <MessagesContainer
                            projectId={projectId}
                            activeFragment={activeFragment}
                            setActiveFragment={setActiveFragment}
                            isReadOnly={isReadOnly}
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
                            {isOwner && project && (
                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => setVisibility.mutate({ projectId, isPublic: !project.isPublic })}
                                        disabled={setVisibility.isPending}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
                                            project.isPublic ? 'bg-green-500' : 'bg-white/20'
                                        }`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-all duration-200 ease-out absolute ${
                                            project.isPublic ? 'right-0.5' : 'left-0.5'
                                        }`} />
                                    </button>
                                    <span className={`text-xs font-medium ${project.isPublic ? 'text-green-400' : 'text-white/50'}`}>
                                        {project.isPublic ? 'Public' : 'Private'}
                                    </span>
                                </div>
                            )}
                            <div className="ml-auto flex items-center gap-x-2">
                                {isOwner && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-8 w-8 shrink-0 rounded-lg border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all duration-200 focus:outline-none">
                                                <MoreHorizontal className="h-4 w-4 text-white/60" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" side="bottom" className="w-40">
                                            <DropdownMenuItem onClick={() => { setRenameValue(project?.name || ""); setRenameOpen(true); }}>
                                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-400 focus:text-red-400"
                                                onClick={() => setDeleteOpen(true)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                                <AsyncButton
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    loadingText=""
                                    className=""
                                    title="Download project code"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <DownloadIcon className="h-4 w-4" />
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
                                    files={filesState ?? activeFragment.files as Record<string, string>}
                                    onFileChange={handleFileChange} />
                            )}
                        </TabsContent>

                    </Tabs>

                </ResizablePanel>

            </ResizablePanelGroup>

            {/* Rename Dialog */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Rename Project</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); if (renameValue.trim()) renameMutation.mutate({ projectId, name: renameValue.trim() }); }}>
                        <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-black/40 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-white"
                            placeholder="Project name"
                            maxLength={255}
                        />
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!renameValue.trim() || renameMutation.isPending}>
                                {renameMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-white">{project?.name}</span>? This action cannot be undone. All messages, files, and data will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => deleteMutation.mutate({ projectId })}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}