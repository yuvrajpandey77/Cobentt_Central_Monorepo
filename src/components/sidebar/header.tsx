"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PanelLeft, PanelLeftClose, ChevronDown } from "lucide-react";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center h-12 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between h-12 px-3 flex-shrink-0">
      <Link href="/" className="flex items-center gap-1.5 group">
        <span className="text-base font-bold text-foreground tracking-tight">Cobentt</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </Link>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150 flex-shrink-0"
        aria-label="Collapse sidebar"
      >
        <PanelLeftClose className="w-3.5 h-3.5" />
      </motion.button>
    </div>
  );
}
