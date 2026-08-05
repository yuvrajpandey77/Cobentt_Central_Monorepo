"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare, FolderOpen, FileText, Globe,
  BookOpen, Bot, ScrollText, Presentation, Search, Table,
  Pin, MoreHorizontal, Pencil, PinOff, Archive, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RowMenu } from "./row-menu";

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

/* eslint-disable @typescript-eslint/no-explicit-any */
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
/* eslint-enable @typescript-eslint/no-explicit-any */

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
            "absolute right-1.5 top-1/2 -translate-y-1/2",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
            menuOpen && "opacity-100"
          )}
        >
          <RowMenu
            onToggle={setMenuOpen}
            trigger={<MoreHorizontal className="w-3 h-3" />}
          >
            {(close) => (
              <>
                {onRename && (
                  <button
                    onClick={() => { onRename(item); close(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
                  >
                    <Pencil className="w-2.5 h-2.5" /> Rename
                  </button>
                )}
                {onTogglePin && (
                  <button
                    onClick={() => { onTogglePin(item); close(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
                  >
                    {isPinned ? <><PinOff className="w-2.5 h-2.5" /> Unpin</> : <><Pin className="w-2.5 h-2.5" /> Pin</>}
                  </button>
                )}
                {onToggleArchive && (
                  <button
                    onClick={() => { onToggleArchive(item); close(); }}
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
                    onClick={() => { onDelete(item); close(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:text-red-300 hover:bg-card/40 transition-colors"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Delete
                  </button>
                )}
              </>
            )}
          </RowMenu>
        </div>
      )}
    </motion.div>
  );
}
