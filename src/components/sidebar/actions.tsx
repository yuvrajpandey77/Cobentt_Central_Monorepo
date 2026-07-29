"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, MessageCircle } from "lucide-react";

interface SidebarActionsProps {
  isCollapsed: boolean;
  onNewChat?: () => void;
}

export function SidebarActions({ isCollapsed }: SidebarActionsProps) {
  if (isCollapsed) return null;

  return (
    <div className="px-3 flex flex-col gap-1.5 flex-shrink-0">
      <Link href="/">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full h-9 rounded-[12px] bg-white/10 hover:bg-white/20 backdrop-blur transition-all duration-200 text-xs font-medium text-white flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          New Chat
        </motion.button>
      </Link>

      <Link href="/">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full h-9 rounded-[12px] bg-transparent hover:bg-card/40 backdrop-blur transition-all duration-200 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          New Project
        </motion.button>
      </Link>
    </div>
  );
}
