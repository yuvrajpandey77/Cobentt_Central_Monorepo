"use client";

import { useMemo } from "react";
import { RecentRow } from "./recent-row";

interface RecentItem {
  id: string;
  title: string;
  updatedAt: Date | string;
  type: string;
  href: string;
  isPinned?: boolean;
  isArchived?: boolean;
  raw: any;
}

interface SidebarRecentProps {
  conversations: any[];
  projects: any[];
  pathname: string;
  convRoute: (conv: any) => string;
  onRename: (conv: any) => void;
  onTogglePin: (conv: any) => void;
  onToggleArchive: (conv: any) => void;
  onDelete: (conv: any) => void;
  onRenameProject: (project: any) => void;
  onTogglePinProject: (project: any) => void;
  onDeleteProject: (project: any) => void;
  isCollapsed: boolean;
  searchQuery: string;
}

export function SidebarRecent(props: SidebarRecentProps) {
  const {
    conversations, projects, pathname, convRoute,
    onRename, onTogglePin, onToggleArchive, onDelete,
    onRenameProject, onTogglePinProject, onDeleteProject,
    isCollapsed, searchQuery,
  } = props;

  const items: RecentItem[] = useMemo(() => {
    const result: RecentItem[] = [];

    for (const conv of conversations || []) {
      const mode = conv.mode || "chat";
      result.push({
        id: conv.id,
        title: conv.title || "New Chat",
        updatedAt: conv.updatedAt,
        type: mode,
        href: convRoute(conv),
        isPinned: conv.isPinned,
        isArchived: conv.isArchived,
        raw: { ...conv, __type: "conversation" },
      });
    }

    for (const project of projects || []) {
      const projectType = project.projectType || "project";
      result.push({
        id: project.id,
        title: project.name || "Untitled",
        updatedAt: project.updatedAt,
        type: projectType,
        href: `/projects/${project.id}`,
        isPinned: project.isPinned,
        isArchived: project.isArchived,
        raw: { ...project, __type: "project" },
      });
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return result.filter((item) => item.title.toLowerCase().includes(query));
    }

    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return result;
  }, [conversations, projects, searchQuery, convRoute]);

  if (isCollapsed) return null;

  if (items.length === 0) {
    const msg = searchQuery ? `No results for "${searchQuery}"` : "No recent items";
    return <div className="px-4 py-4 text-center"><p className="text-[11px] text-muted-foreground">{msg}</p></div>;
  }

  return (
    <div className="space-y-[1px]">
      {items.map((item) => {
        const isConv = item.raw.__type === "conversation";
        return (
          <RecentRow
            key={item.id}
            item={item.raw}
            type={item.type}
            href={item.href}
            isActive={pathname === item.href}
            title={item.title}
            isPinned={item.isPinned}
            onRename={isConv ? onRename : onRenameProject}
            onTogglePin={isConv ? onTogglePin : onTogglePinProject}
            onToggleArchive={isConv ? onToggleArchive : undefined}
            onDelete={isConv ? onDelete : onDeleteProject}
          />
        );
      })}
    </div>
  );
}
