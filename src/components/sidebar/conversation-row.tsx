"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pin, MoreHorizontal, Pencil, PinOff, Archive, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { RowMenu } from "./row-menu";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ConversationRowProps {
  conv: any;
  pathname: string;
  convRoute: (conv: any) => string;
  onRename: (conv: any) => void;
  onTogglePin: (conv: any) => void;
  onToggleArchive: (conv: any) => void;
  onDelete: (conv: any) => void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function ConversationRow({ conv, pathname, convRoute, onRename, onTogglePin, onToggleArchive, onDelete }: ConversationRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = pathname === convRoute(conv);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="group relative"
    >
      <Link
        href={convRoute(conv)}
        className={cn(
          "flex items-center gap-3 h-[48px] px-4 rounded-lg transition-all duration-150 relative",
          isActive
            ? "bg-primary/20 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-card/40"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
        )}
        <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground/60" />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {conv.title || "New Chat"}
          </span>
          {conv.isPinned && <Pin className="w-3 h-3 shrink-0 text-primary/60" />}
        </div>
      </Link>
      <div
        className={cn(
          "absolute right-1.5 top-1/2 -translate-y-1/2",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          menuOpen && "opacity-100"
        )}
      >
        <RowMenu
          onToggle={setMenuOpen}
          trigger={<MoreHorizontal className="w-3.5 h-3.5" />}
        >
          {(close) => (
            <>
              <button
                onClick={() => { onRename(conv); close(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Rename
              </button>
              <button
                onClick={() => { onTogglePin(conv); close(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
              >
                {conv.isPinned ? <><PinOff className="w-3 h-3" /> Unpin</> : <><Pin className="w-3 h-3" /> Pin</>}
              </button>
              <button
                onClick={() => { onToggleArchive(conv); close(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
              >
                <Archive className="w-3 h-3" /> {conv.isArchived ? "Unarchive" : "Archive"}
              </button>
              <div className="h-px bg-border/30 my-1" />
              <button
                onClick={() => { onDelete(conv); close(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-card/40 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </>
          )}
        </RowMenu>
      </div>
    </motion.div>
  );
}