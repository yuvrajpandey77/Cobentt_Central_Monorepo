"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationRow } from "./conversation-row";

interface SidebarProjectsProps {
  projects: any[];
  conversations: any[];
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

function ProjectItem({
  project,
  isExpanded,
  onToggle,
  projectChats,
  ...rest
}: {
  project: any;
  isExpanded: boolean;
  onToggle: () => void;
  projectChats: any[];
  pathname: string;
  convRoute: (conv: any) => string;
  onRename: (conv: any) => void;
  onTogglePin: (conv: any) => void;
  onToggleArchive: (conv: any) => void;
  onDelete: (conv: any) => void;
  onRenameProject: (project: any) => void;
  onTogglePinProject: (project: any) => void;
  onDeleteProject: (project: any) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isSmartContract = project.projectType === "SMART_CONTRACT" || project.contractType;
  const isActive = rest.pathname?.startsWith(`/projects/${project.id}`);

  const projectColors = ["bg-emerald-500/20 text-emerald-400", "bg-blue-500/20 text-blue-400", "bg-violet-500/20 text-violet-400", "bg-amber-500/20 text-amber-400", "bg-rose-500/20 text-rose-400"];
  const colorIndex = project.name ? project.name.length % projectColors.length : 0;
  const colorClass = projectColors[colorIndex];

  return (
    <div>
      <div className="group flex items-center gap-1">
        <button
          onClick={onToggle}
          className="h-8 w-8 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </button>
        <Link
          href={isSmartContract ? `/projects/${project.id}/build` : `/projects/${project.id}`}
          className={cn(
            "flex-1 min-w-0 flex items-center gap-2.5 h-[48px] px-3 rounded-lg transition-all duration-150",
            isActive
              ? "bg-primary/20 text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          )}
        >
          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold", colorClass)}>
            {project.name?.charAt(0)?.toUpperCase() || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm truncate">{project.name}</span>
          </div>
          {project.isPinned && <Pin className="w-3 h-3 shrink-0 text-primary/60" />}
        </Link>
        <div className="relative">
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-36 bg-card/95 backdrop-blur-xl border border-border/30 rounded-lg py-1 shadow-xl z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { rest.onRenameProject(project); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Rename
              </button>
              <button
                onClick={() => { rest.onTogglePinProject(project); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
              >
                {project.isPinned ? <><PinOff className="w-3 h-3" /> Unpin</> : <><Pin className="w-3 h-3" /> Pin</>}
              </button>
              <div className="h-px bg-border/30 my-1" />
              <button
                onClick={() => { rest.onDeleteProject(project); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-card/40 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </motion.div>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden ml-3 border-l border-border/20 pl-2 space-y-[1px]"
          >
            {projectChats.length > 0 ? (
              projectChats.map((conv: any) => (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  {...rest}
                />
              ))
            ) : (
              <div className="h-[48px] flex items-center px-3">
                <span className="text-[11px] text-muted-foreground">No chats in this project</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarProjects(props: SidebarProjectsProps) {
  const { projects, isCollapsed, searchQuery, ...rest } = props;
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProjectExpanded = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((p: any) => {
      const nameMatch = p.name?.toLowerCase().includes(query);
      return nameMatch;
    });
  }, [projects, searchQuery]);

  if (isCollapsed) return null;
  if (filtered.length === 0) return null;

  return (
    <div className="space-y-[1px]">
      {filtered.map((project: any) => (
        <ProjectItem
          key={project.id}
          project={project}
          isExpanded={expandedProjects.has(project.id)}
          onToggle={() => toggleProjectExpanded(project.id)}
          projectChats={(rest.conversations || []).filter((c: any) => c.projectId === project.id)}
          {...rest}
        />
      ))}
    </div>
  );
}
