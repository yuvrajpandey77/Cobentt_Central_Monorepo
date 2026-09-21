"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Code2, FolderOpen, Settings as SettingsIcon, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { SidebarHeader } from "@/components/sidebar/header";
import { SidebarSearch } from "@/components/sidebar/search";
import { SidebarActions } from "@/components/sidebar/actions";
import { SidebarNavigation } from "@/components/sidebar/navigation";
import { SidebarSections } from "@/components/sidebar/sections";
import { SidebarRecent } from "@/components/sidebar/recent";
import { SidebarFooter } from "@/components/sidebar/footer";

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

import type { SidebarDataSource } from "@/components/sidebar/types";
import { useChat } from "@/lib/chat-store";

interface SidebarProps {
  className?: string;
  dataSource?: SidebarDataSource;
}

export const Sidebar = ({ className, dataSource = "trpc" }: SidebarProps) => {
  const { user } = useUser();
  const trpc = useTRPC();
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  const isLocal = dataSource === "local";

  // Called unconditionally (hooks rule); null outside a ChatProvider.
  // All uses below are guarded by `isLocal && chatCtx`.
  const chatCtx = useChat();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    ...trpc.projects.getMany.queryOptions(),
    enabled: !!user,
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    ...trpc.conversations.getAll.queryOptions(),
    enabled: !!user,
  });

  const queryClient = useQueryClient();
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
    queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
  }, [queryClient, trpc]);

  // Element types derived from the tRPC query outputs above.
  type QueryProject = NonNullable<typeof projects>[number];
  type QueryConversation = NonNullable<typeof conversations>[number];
  // Prisma Project has no `isArchived` column; sidebar treats it as optional.
  type ProjectListItem = QueryProject & { isArchived?: boolean };
  type ConversationListItem = QueryConversation;

  interface SidebarTarget {
    id: string;
    __type?: "conversation" | "project";
    title?: string | null;
    name?: string;
  }

  const [renameTarget, setRenameTarget] = useState<SidebarTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SidebarTarget | null>(null);

  const renameProject = useMutation(trpc.projects.rename.mutationOptions({
    onSuccess: () => { invalidateAll(); toast.success("Project renamed"); setRenameTarget(null); },
    onError: (err) => toast.error(err.message || "Failed to rename"),
  }));

  const togglePinProject = useMutation(trpc.projects.togglePin.mutationOptions({
    onSuccess: () => invalidateAll(),
    onError: (err) => toast.error(err.message || "Failed to update pin"),
  }));

  const deleteProject = useMutation(trpc.projects.delete.mutationOptions({
    onSuccess: () => { invalidateAll(); toast.success("Project deleted"); setDeleteTarget(null); },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  }));

  const renameConversation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => { invalidateAll(); toast.success("Chat renamed"); setRenameTarget(null); },
    onError: (err) => toast.error(err.message || "Failed to rename"),
  }));

  const togglePinConversation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => invalidateAll(),
    onError: (err) => toast.error(err.message || "Failed to update pin"),
  }));

  const toggleArchiveConversation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => invalidateAll(),
    onError: (err) => toast.error(err.message || "Failed to archive"),
  }));

  const deleteConversation = useMutation(trpc.conversations.delete.mutationOptions({
    onSuccess: () => { invalidateAll(); toast.success("Chat deleted"); setDeleteTarget(null); },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  }));

  const isConversationTarget = renameTarget?.__type === "conversation";

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || !renameTarget) return;
    if (isLocal && chatCtx && isConversationTarget) {
      chatCtx.renameThread(renameTarget.id, renameValue.trim());
      setRenameTarget(null);
    } else if (isConversationTarget) {
      renameConversation.mutate({ id: renameTarget.id, title: renameValue.trim() });
    } else {
      renameProject.mutate({ projectId: renameTarget.id, name: renameValue.trim() });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (isLocal && chatCtx && deleteTarget.__type === "conversation") {
      chatCtx.deleteThread(deleteTarget.id);
      setDeleteTarget(null);
    } else if (deleteTarget.__type === "conversation") {
      deleteConversation.mutate({ id: deleteTarget.id });
    } else {
      deleteProject.mutate({ projectId: deleteTarget.id });
    }
  };

  const handleRenameConv = useCallback((conv: ConversationListItem) => {
    setRenameTarget({ ...conv, __type: "conversation" });
    setRenameValue(conv.title || "");
  }, []);

  const handleTogglePinConv = useCallback((conv: ConversationListItem) => {
    if (isLocal && chatCtx) {
      chatCtx.togglePinThread(conv.id, !conv.isPinned);
    } else {
      togglePinConversation.mutate({ id: conv.id, isPinned: !conv.isPinned });
    }
  }, [isLocal, chatCtx, togglePinConversation]);

  const handleToggleArchiveConv = useCallback((conv: ConversationListItem) => {
    if (isLocal && chatCtx) {
      chatCtx.toggleArchiveThread(conv.id, !conv.isArchived);
    } else {
      toggleArchiveConversation.mutate({ id: conv.id, isArchived: !conv.isArchived });
    }
  }, [isLocal, chatCtx, toggleArchiveConversation]);

  const handleDeleteConv = useCallback((conv: ConversationListItem) => {
    setDeleteTarget({ ...conv, __type: "conversation" });
  }, []);

  const handleNewChat = useCallback(() => {
    if (isLocal && chatCtx) {
      chatCtx.createThread();
    }
  }, [isLocal, chatCtx]);

  const isRenamePending = renameProject.isPending || renameConversation.isPending;
  const isDeletePending = deleteProject.isPending || deleteConversation.isPending;

  const convRoute = useCallback((conv: any) => `/${conv.mode || "chat"}/${conv.id}`, []);

  const iconClasses = "h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200";

  if (!user) {
    return (
      <div className={cn(
        "bg-gradient-to-b from-card/60 via-card/40 to-card/60 backdrop-blur-xl border-r border-border/30 transition-all duration-500 ease-in-out relative overflow-hidden",
        isCollapsed ? "w-[60px]" : "w-[280px]",
        className
      )}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />
        </div>

        <div className="px-3 py-4 h-full flex flex-col relative z-10">
          <SidebarHeader isCollapsed={isCollapsed} onToggle={toggleSidebar} />

          <div className="flex-1 flex flex-col justify-center items-center">
            {!isCollapsed && (
              <div className="text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FolderOpen className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Create Something</h3>
                <p className="text-sm text-white/60 mb-6">Sign up to start building and save your projects</p>
                <Link href="/sign-up" className="w-full">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                    <Sparkles className="w-4 h-4 mr-2" /> Get Started
                  </Button>
                </Link>
              </div>
            )}
            {isCollapsed && (
              <div className="flex flex-col items-center gap-3">
                <Link href="/dapp-studio" className="group">
                  <div className={iconClasses}>
                    <Code2 className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  </div>
                </Link>
                <button className="group" aria-label="Templates">
                  <div className={iconClasses}>
                    <Sparkles className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  </div>
                </button>
                <Link href="/all-projects" className="group">
                  <div className={cn(iconClasses, "relative")}>
                    <FolderOpen className="w-4 h-4 text-white/80 group-hover:text-primary" />
                    <span className="absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/80 text-white border border-white/20">0</span>
                  </div>
                </Link>
                <Link href="/sign-up" className="group" aria-label="Get Started">
                  <div className={iconClasses}>
                    <Plus className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  </div>
                </Link>
                <Link href="/settings/user" className="group" aria-label="Settings">
                  <div className={iconClasses}>
                    <SettingsIcon className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isLoading = projectsLoading || conversationsLoading;

  return (
    <>
      <div className={cn(
        "bg-gradient-to-b from-card/60 via-card/40 to-card/60 backdrop-blur-xl border-r border-border/30 transition-all duration-500 ease-in-out relative overflow-hidden",
        isCollapsed ? "w-[52px]" : "w-[240px]",
        className
      )}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />
        </div>

        <div className="px-2.5 pt-0 pb-3 h-full flex flex-col relative z-10 overflow-x-hidden gap-2">
          {/* Fixed top: Header */}
          <SidebarHeader isCollapsed={isCollapsed} onToggle={toggleSidebar} />

          {/* Search — hidden in chat context (Composer is the input) */}
          {!isCollapsed && !isLocal && (
            <SidebarSearch value={searchQuery} onChange={setSearchQuery} isCollapsed={isCollapsed} />
          )}

          {/* Collapsed icons */}
          {isCollapsed && (
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <Link href="/chats" className="group">
                <div className={iconClasses}>
                  <MessageCircle className="w-3.5 h-3.5 text-white/80 group-hover:text-primary" />
                </div>
              </Link>
              <Link href="/dapp-studio" className="group">
                <div className={iconClasses}>
                  <Code2 className="w-3.5 h-3.5 text-white/80 group-hover:text-primary" />
                </div>
              </Link>
              <Link href="/all-projects" className="group">
                <div className={cn(iconClasses, "relative")}>
                  <FolderOpen className="w-3.5 h-3.5 text-white/80 group-hover:text-primary" />
                  <span className="absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/80 text-white border border-white/20">
                    {(projects?.length || 0) > 99 ? "99+" : (projects?.length || 0)}
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* Actions */}
          {!isCollapsed && (
            <SidebarActions isCollapsed={isCollapsed} onNewChat={isLocal ? handleNewChat : undefined} />
          )}

          {/* Navigation */}
          {!isCollapsed && (
            <SidebarNavigation isCollapsed={isCollapsed} />
          )}

          {/* Divider */}
          {!isCollapsed && <div className="h-px bg-border/30 flex-shrink-0" />}

          {/* Scrollable content */}
          {!isCollapsed && (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden thin-scrollbar">
              {isLoading && (
                <div className="space-y-2 px-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card/40 border border-border/20 rounded-lg p-2">
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && (
                <SidebarSections
                  archiveContent={
                    <SidebarRecent
                      conversations={(conversations as any[] || []).filter((c: any) => c.isArchived)}
                      projects={(projects as any[] || []).filter((p: any) => p.isArchived)}
                      pathname={pathname}
                      convRoute={convRoute}
                      onRename={handleRenameConv}
                      onTogglePin={handleTogglePinConv}
                      onToggleArchive={handleToggleArchiveConv}
                      onDelete={handleDeleteConv}
                      onRenameProject={(project: any) => { setRenameTarget(project); setRenameValue(project.name); }}
                      onTogglePinProject={(project: any) => togglePinProject.mutate({ projectId: project.id })}
                      onDeleteProject={(project: any) => setDeleteTarget(project)}
                      isCollapsed={isCollapsed}
                      searchQuery={searchQuery}
                    />
                  }
                >
                  <SidebarRecent
                    conversations={(conversations as any[] || []).filter((c: any) => !c.isArchived)}
                    projects={(projects as any[] || []).filter((p: any) => !p.isArchived)}
                    pathname={pathname}
                    convRoute={convRoute}
                    onRename={handleRenameConv}
                    onTogglePin={handleTogglePinConv}
                    onToggleArchive={handleToggleArchiveConv}
                    onDelete={handleDeleteConv}
                    onRenameProject={(project: any) => { setRenameTarget(project); setRenameValue(project.name); }}
                    onTogglePinProject={(project: any) => togglePinProject.mutate({ projectId: project.id })}
                    onDeleteProject={(project: any) => setDeleteTarget(project)}
                    isCollapsed={isCollapsed}
                    searchQuery={searchQuery}
                  />
                </SidebarSections>
              )}
            </div>
          )}

          {/* Fixed bottom: Footer */}
          <SidebarFooter isCollapsed={isCollapsed} />
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isConversationTarget ? "Rename Chat" : "Rename Project"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename}>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-black/40 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-white"
              placeholder={isConversationTarget ? "Chat name" : "Project name"}
              maxLength={255}
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setRenameTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={!renameValue.trim() || isRenamePending}>
                {isRenamePending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.__type === "conversation" ? "Chat" : "Project"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-white">
                {deleteTarget?.__type === "conversation" ? (deleteTarget?.title || "this chat") : deleteTarget?.name}
              </span>? This action cannot be undone. All messages and data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={isDeletePending}
            >
              {isDeletePending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
