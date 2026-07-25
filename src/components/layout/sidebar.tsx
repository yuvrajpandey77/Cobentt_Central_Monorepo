"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatDistanceToNow, isToday, isYesterday, differenceInDays } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Search, PanelLeft, PanelLeftClose, Code2, Sparkles, Settings as SettingsIcon, MoreHorizontal, Pin, PinOff, Trash2, Pencil, MessageCircle, ChevronDown, ChevronRight, FileSpreadsheet, Globe, Presentation, FileText, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenCounter } from "@/components/token-counter";
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
import { toast } from "sonner";

interface SidebarProps {
  className?: string;
}

function CollapsibleSection({
  label,
  icon,
  defaultOpen = true,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 mb-2.5 px-2 w-full text-left py-1"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </button>
      {open && children}
    </div>
  );
}

export const Sidebar = ({ className }: SidebarProps) => {
  const { user } = useUser();
  const trpc = useTRPC();
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleSidebar, setIsCollapsed } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects, isLoading: projectsLoading } = useQuery({
    ...trpc.projects.getMany.queryOptions(),
    enabled: !!user,
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    ...trpc.conversations.getAll.queryOptions(),
    enabled: !!user,
  });

  useEffect(() => {
    if (user && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [user]);

  const queryClient = useQueryClient();
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
    queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
  }, [queryClient, trpc]);

  const [renameTarget, setRenameTarget] = useState<any>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

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

  const createChat = useMutation(trpc.conversations.create.mutationOptions({
    onSuccess: (data) => {
      invalidateAll();
      router.push(`/chat?id=${data.id}`);
    },
    onError: (err) => toast.error(err.message || "Failed to create chat"),
  }));

  const renameConversation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => { invalidateAll(); toast.success("Chat renamed"); setRenameTarget(null); },
    onError: (err) => toast.error(err.message || "Failed to rename"),
  }));

  const togglePinConversation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => invalidateAll(),
    onError: (err) => toast.error(err.message || "Failed to update pin"),
  }));

  const deleteConversation = useMutation(trpc.conversations.delete.mutationOptions({
    onSuccess: () => { invalidateAll(); toast.success("Chat deleted"); setDeleteTarget(null); },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  }));

  const isConversationTarget = renameTarget?.__type === "conversation";

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations as any[];
    return (conversations as any[]).filter((c: any) => {
      const titleMatch = c.title?.toLowerCase().includes(query);
      const messageMatch = c.messages?.some((m: any) =>
        m?.content?.toLowerCase().includes(query)
      );
      return titleMatch || messageMatch;
    });
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const list = filteredConversations;
    const groups: { label: string; conversations: any[] }[] = [];
    const today: any[] = [];
    const yesterday: any[] = [];
    const thisWeek: any[] = [];
    const thisMonth: any[] = [];
    const older: any[] = [];

    for (const conv of list) {
      const date = new Date(conv.updatedAt);
      if (isToday(date)) {
        today.push(conv);
      } else if (isYesterday(date)) {
        yesterday.push(conv);
      } else if (differenceInDays(new Date(), date) <= 7) {
        thisWeek.push(conv);
      } else if (differenceInDays(new Date(), date) <= 30) {
        thisMonth.push(conv);
      } else {
        older.push(conv);
      }
    }

    if (today.length > 0) groups.push({ label: "Today", conversations: today });
    if (yesterday.length > 0) groups.push({ label: "Yesterday", conversations: yesterday });
    if (thisWeek.length > 0) groups.push({ label: "Previous 7 Days", conversations: thisWeek });
    if (thisMonth.length > 0) groups.push({ label: "Previous 30 Days", conversations: thisMonth });
    if (older.length > 0) groups.push({ label: "Older", conversations: older });

    return groups;
  }, [filteredConversations]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [] as any[];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects as any[];
    return (projects as any[]).filter((project: any) => {
      const nameMatch = project.name?.toLowerCase().includes(query);
      const messageMatch = project.messages?.some((m: any) =>
        m?.content?.toLowerCase().includes(query)
      );
      return nameMatch || messageMatch;
    });
  }, [projects, searchQuery]);

  const pathSegments = pathname.split("/").filter(Boolean);
  const currentConversationId = pathSegments.length >= 2 ? pathSegments[pathSegments.length - 1] : null;

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    if (isConversationTarget) {
      renameConversation.mutate({ id: renameTarget.id, title: renameValue.trim() });
    } else {
      renameProject.mutate({ projectId: renameTarget.id, name: renameValue.trim() });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.__type === "conversation") {
      deleteConversation.mutate({ id: deleteTarget.id });
    } else {
      deleteProject.mutate({ projectId: deleteTarget.id });
    }
  };

  const isRenamePending = renameProject.isPending || renameConversation.isPending;
  const isDeletePending = deleteProject.isPending || deleteConversation.isPending;

  const convRoute = (conv: any) => `/${conv.mode || "chat"}/${conv.id}`;

  const ConversationRow = ({ conv }: { conv: any }) => (
    <div key={conv.id} className="group flex items-center gap-1.5">
      <Link
        href={convRoute(conv)}
        className={cn(
          "flex-1 min-w-0 rounded-lg transition-all duration-200 ease-out p-3",
          pathname === convRoute(conv)
            ? "bg-primary/20 border border-primary/30"
            : "hover:bg-card/40 border border-transparent hover:border-border/20"
        )}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <h4 className="font-medium text-base truncate flex items-center gap-1.5">
            {conv.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary/60" />}
            {conv.title || "New Chat"}
          </h4>
          <p className="text-sm text-muted-foreground truncate">
            {conv.messages?.[0]?.role === "USER"
              ? conv.messages[0].content?.slice(0, 60)
              : formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
          </p>
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-8 w-8 shrink-0 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none">
            <MoreHorizontal className="h-4 w-4 text-white/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="w-40">
          <DropdownMenuItem onClick={() => { setRenameTarget({ ...conv, __type: "conversation" }); setRenameValue(conv.title || ""); }}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => togglePinConversation.mutate({ id: conv.id, isPinned: !conv.isPinned })}>
            {conv.isPinned ? <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</> : <><Pin className="h-3.5 w-3.5 mr-2" /> Pin</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => setDeleteTarget({ ...conv, __type: "conversation" })}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (!user) {
    return (
      <div className={cn(
        "bg-gradient-to-b from-card/60 via-card/40 to-card/60 backdrop-blur-xl border-r border-border/30 shadow-2xl transition-all duration-500 ease-in-out relative overflow-hidden",
        isCollapsed ? "w-16" : "w-64",
        className
      )}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
        </div>

        <div className="px-3 py-4 h-full flex flex-col relative z-10">
          <div className={cn("flex items-center mb-6 flex-shrink-0", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  Create Something
                </h2>
              </div>
            )}
            <Button
              variant="ghost" size="sm" onClick={toggleSidebar}
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:scale-105 transition-all duration-200 ease-out rounded-lg flex-shrink-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4 text-primary" /> : <PanelLeftClose className="h-4 w-4 text-primary" />}
            </Button>
          </div>

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
              <div className="mb-6 flex-shrink-0 flex flex-col items-center gap-3">
                <Link href="/dapp-studio" className="group">
                  <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                    <Code2 className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  </div>
                </Link>
                <button className="group" aria-label="Templates">
                  <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                    <Sparkles className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  </div>
                </button>
                <Link href="/all-projects" className="group">
                  <div className="relative h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                    <FolderOpen className="w-4 h-4 text-white/80 group-hover:text-primary" />
                    <span className="absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/80 text-white border border-white/20">0</span>
                  </div>
                </Link>
                <Link href="/sign-up" className="group" aria-label="Get Started">
                  <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                    <Plus className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  </div>
                </Link>
                <Link href="/settings/user" className="group" aria-label="Settings">
                  <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
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
        "bg-gradient-to-b from-card/60 via-card/40 to-card/60 backdrop-blur-xl border-r border-border/30 shadow-2xl transition-all duration-500 ease-in-out relative overflow-hidden",
        isCollapsed ? "w-16" : "w-64",
        className
      )}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
          <div className="absolute top-10 right-4 w-20 h-20 bg-primary/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-4 w-16 h-16 bg-secondary/10 rounded-full blur-xl"></div>
        </div>

        <div className="px-3 py-4 h-full flex flex-col relative z-10 overflow-x-hidden">
          {/* Header with logo */}
          <div className={cn("flex items-center mb-4 flex-shrink-0", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <Link href="/chat" className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground">Cobentt</span>
              </Link>
            )}
            <Button
              variant="ghost" size="sm" onClick={toggleSidebar}
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:scale-105 transition-all duration-200 ease-out rounded-lg flex-shrink-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4 text-primary" /> : <PanelLeftClose className="h-4 w-4 text-primary" />}
            </Button>
          </div>

          {/* Search */}
          {!isCollapsed && (
            <div className="space-y-3 mb-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search chats & projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-base bg-card/40 border border-border/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200 ease-out backdrop-blur-sm hover:border-border/30"
                />
              </div>
            </div>
          )}

          {/* Collapsed icons */}
          {isCollapsed && (
            <div className="mb-4 flex-shrink-0 flex flex-col items-center gap-3">
              <Link href="/chat" className="group">
                <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                  <MessageCircle className="w-4 h-4 text-white/80 group-hover:text-primary" />
                </div>
              </Link>
              <Link href="/dapp-studio" className="group">
                <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                  <Code2 className="w-4 h-4 text-white/80 group-hover:text-primary" />
                </div>
              </Link>
              <button className="group">
                <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                  <Sparkles className="w-4 h-4 text-white/80 group-hover:text-primary" />
                </div>
              </button>
              <Link href="/all-projects" className="group">
                <div className="relative h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                  <FolderOpen className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  <span className="absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/80 text-white border border-white/20">
                    {(projects?.length || 0) > 99 ? '99+' : (projects?.length || 0)}
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* Scrollable list section */}
          {!isCollapsed && (
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar min-w-0 space-y-3">
                {isLoading && (
                  <div className="space-y-3 px-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-card/40 border border-border/20 rounded-lg p-3">
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && (
                  <>
                    {/* Chats Section */}
                    <CollapsibleSection
                      label="Chats"
                      icon={<MessageCircle className="w-3.5 h-3.5" />}
                      defaultOpen={true}
                    >
                      {filteredConversations.length === 0 ? (
                        <div className="text-center py-4 px-1">
                          <p className="text-xs text-muted-foreground">No chats yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {groupedConversations.map((group) => (
                            <div key={group.label}>
                              <div className="text-xs font-medium text-white/40 uppercase tracking-wider px-2 mb-1.5">
                                {group.label}
                              </div>
                              <div className="space-y-0.5">
                                {group.conversations.map((conv: any) => (
                                  <ConversationRow key={conv.id} conv={conv} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleSection>

                    {/* Projects Section */}
                    <CollapsibleSection
                      label="Projects"
                      icon={<FolderOpen className="w-3.5 h-3.5" />}
                      defaultOpen={false}
                    >
                      {filteredProjects.length === 0 ? (
                        <div className="text-center py-4 px-1">
                          <p className="text-xs text-muted-foreground">No projects yet</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredProjects.map((project: any) => {
                            const isSmartContract = project.projectType === 'SMART_CONTRACT' || project.contractType;
                            const isExpanded = expandedProjects.has(project.id);
                            // Filter conversations that belong to this project
                            const projectChats = (conversations as any[] || []).filter(
                              (c: any) => c.projectId === project.id
                            );
                            return (
                              <div key={project.id}>
                                <div className="group flex items-center gap-1.5">
                                  <button
                                    onClick={() => toggleProjectExpanded(project.id)}
                                    className="h-7 w-7 shrink-0 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  <Link
                                    href={isSmartContract ? `/projects/${project.id}/build` : `/projects/${project.id}`}
                                    className={cn(
                                      "flex-1 min-w-0 rounded-lg transition-all duration-200 ease-out p-3",
                                      pathname?.startsWith(`/projects/${project.id}`)
                                        ? "bg-primary/20 border border-primary/30"
                                        : "hover:bg-card/40 border border-transparent hover:border-border/20"
                                    )}
                                  >
                                    <div className="flex flex-col gap-1 min-w-0">
                                      <h4 className="font-medium text-base truncate flex items-center gap-1.5">
                                        {project.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary/60" />}
                                        {project.name}
                                      </h4>
                                      <p className="text-sm text-muted-foreground truncate">
                                        <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: false })}</span>
                                      </p>
                                    </div>
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="h-8 w-8 shrink-0 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none">
                                        <MoreHorizontal className="h-3.5 w-3.5 text-white/60" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" side="bottom" className="w-40">
                                      <DropdownMenuItem onClick={() => { setRenameTarget(project); setRenameValue(project.name); }}>
                                        <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => togglePinProject.mutate({ projectId: project.id })}>
                                        {project.isPinned ? <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</> : <><Pin className="h-3.5 w-3.5 mr-2" /> Pin</>}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => setDeleteTarget(project)}>
                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                {/* Expanded project chats */}
                                {isExpanded && projectChats.length > 0 && (
                                  <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                                    {projectChats.map((conv: any) => (
                                      <ConversationRow key={conv.id} conv={conv} />
                                    ))}
                                  </div>
                                )}
                                {isExpanded && projectChats.length === 0 && (
                                  <div className="ml-4 mt-1 pl-2 border-l border-white/10">
                                    <p className="text-[10px] text-white/20 py-1">No chats in this project</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CollapsibleSection>

                    {/* Sheets Section */}
                    <CollapsibleSection
                      label="Sheets"
                      icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                      defaultOpen={false}
                    >
                      <div className="text-center py-4 px-2">
                        <p className="text-sm text-muted-foreground">Coming soon</p>
                      </div>
                    </CollapsibleSection>

                    {/* Website Section */}
                    <CollapsibleSection
                      label="Website"
                      icon={<Globe className="w-3.5 h-3.5" />}
                      defaultOpen={false}
                    >
                      <div className="text-center py-4 px-1">
                        <p className="text-xs text-muted-foreground">Coming soon</p>
                      </div>
                    </CollapsibleSection>

                    {/* More Section */}
                    <CollapsibleSection
                      label="More"
                      icon={<MoreHorizontal className="w-3.5 h-3.5" />}
                      defaultOpen={false}
                    >
                      <div className="space-y-1 px-1">
                        <div className="text-sm text-white/40 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                          Shared
                        </div>
                        <div className="text-sm text-white/40 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                          Archived
                        </div>
                        <div className="text-sm text-white/40 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                          Templates
                        </div>
                      </div>
                    </CollapsibleSection>
                  </>
                )}

                {!isLoading && filteredConversations.length === 0 && filteredProjects.length === 0 && searchQuery && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No results for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom fixed area */}
          <div className="flex-shrink-0">
            {/* Token Counter */}
            <TokenCounter variant="sidebar" collapsed={isCollapsed} />

            {/* Action Buttons */}
            {!isCollapsed && (
              <div className="pt-4 border-t border-border/20 space-y-2.5">
                <Link href="/chat">
                  <button className="w-full rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur transition-all duration-200 ease-out hover:scale-[1.01] focus:ring-2 focus:ring-white/20 focus:outline-none flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium [color:white] hover:[color:white]">
                    <MessageCircle className="w-4 h-4" />
                    New Chat
                  </button>
                </Link>

                <Link href="/">
                  <button className="w-full rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur transition-all duration-200 ease-out hover:scale-[1.01] focus:ring-2 focus:ring-white/20 focus:outline-none flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium [color:white] hover:[color:white]">
                    <Plus className="w-4 h-4" />
                    New Project
                  </button>
                </Link>

                <Link href="/settings/user">
                  <Button variant="ghost" className="w-full !justify-start h-10 !px-4 !py-2.5 hover:bg-primary/10 hover:text-primary transition-all duration-200 ease-out focus:ring-2 focus:ring-primary/20 focus:outline-none !flex !items-center">
                    <div className="flex items-center">
                      <SettingsIcon className="w-4.5 h-4.5 !mr-2.5 !shrink-0" />
                      <span className="text-sm">Settings</span>
                    </div>
                  </Button>
                </Link>
              </div>
            )}
            {isCollapsed && (
              <div className="pb-2 flex flex-col items-center gap-3">
                <Link href="/chat">
                  <button className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur transition-all duration-200 ease-out hover:scale-[1.02] focus:ring-2 focus:ring-white/20 focus:outline-none flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/">
                  <button className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur transition-all duration-200 ease-out hover:scale-[1.02] focus:ring-2 focus:ring-white/20 focus:outline-none flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/settings/user" className="group">
                  <div className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200">
                    <SettingsIcon className="w-4 h-4 text-white/80 group-hover:text-primary" />
                  </div>
                </Link>
              </div>
            )}
          </div>
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
