"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare, FolderOpen, FileText, FileSpreadsheet, Globe,
  BookOpen, Bot, ScrollText, Presentation, Search, Table,
  Pin, MoreHorizontal, Pencil, PinOff, Archive, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  chat: <MessageSquare className="w-3.5 h-3.5" />,
  project: <FolderOpen className="w-3.5 h-3.5" />,
  website: <Globe className="w-3.5 h-3.5" />,
  "smart contract": <ScrollText className="w-3.5 h-3.5" />,
  contract: <ScrollText className="w-3.5 h-3.5" />,
  SMART_CONTRACT: <ScrollText className="w-3.5 h-3.5" />,
  slides: <Presentation className="w-3.5 h-3.5" />,
  docs: <FileText className="w-3.5 h-3.5" />,
  sheet: <Table className="w-3.5 h-3.5" />,
  "deep research": <Search className="w-3.5 h-3.5" />,
  knowledge: <BookOpen className="w-3.5 h-3.5" />,
  agents: <Bot className="w-3.5 h-3.5" />,
  default: <MessageSquare className="w-3.5 h-3.5" />,
};

function getTypeIcon(type?: string) {
  const key = type?.toLowerCase() || "default";
  return typeIcons[key] || typeIcons.default;
}

interface RecentRowProps {
  item: any;
  type: string;
  href: string;
  isActive: boolean;
  title: string;
  isPinned?: boolean;
  isArchived?: boolean;
  onRename?: (item: any) => void;
  onTogglePin?: (item: any) => void;
  onToggleArchive?: (item: any) => void;
  onDelete?: (item: any) => void;
}

export function RecentRow({
  item, type, href, isActive, title,
  isPinned, onRename, onTogglePin, onToggleArchive, onDelete,
}: RecentRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="group relative"
    >
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 h-[40px] px-3 rounded-lg transition-all duration-150 relative",
          isActive
            ? "bg-primary/20 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-card/40"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
        )}
        <span className="shrink-0 text-muted-foreground/60 transition-colors">
          {getTypeIcon(type)}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-xs font-medium truncate">{title}</span>
          {isPinned && <Pin className="w-2.5 h-2.5 shrink-0 text-primary/60" />}
        </div>
      </Link>

      {(onRename || onTogglePin || onToggleArchive || onDelete) && (
        <div
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
            menuOpen && "opacity-100"
          )}
        >
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
            className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-150"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 bottom-full mb-1 w-36 bg-card/95 backdrop-blur-xl border border-border/30 rounded-lg py-1 shadow-xl z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {onRename && (
                <button
                  onClick={() => { onRename(item); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
                >
                  <Pencil className="w-2.5 h-2.5" /> Rename
                </button>
              )}
              {onTogglePin && (
                <button
                  onClick={() => { onTogglePin(item); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
                >
                  {isPinned ? <><PinOff className="w-2.5 h-2.5" /> Unpin</> : <><Pin className="w-2.5 h-2.5" /> Pin</>}
                </button>
              )}
              {onToggleArchive && (
                <button
                  onClick={() => { onToggleArchive(item); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
                >
                  <Archive className="w-2.5 h-2.5" /> {item.isArchived ? "Unarchive" : "Archive"}
                </button>
              )}
              {(onRename || onTogglePin || onToggleArchive) && onDelete && (
                <div className="h-px bg-border/30 my-1" />
              )}
              {onDelete && (
                <button
                  onClick={() => { onDelete(item); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:text-red-300 hover:bg-card/40 transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" /> Delete
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
