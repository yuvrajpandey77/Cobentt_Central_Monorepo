"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, MessageCircle } from "lucide-react";

interface SidebarActionsProps {
  isCollapsed: boolean;
}

export function SidebarActions({ isCollapsed }: SidebarActionsProps) {
  if (isCollapsed) return null;

  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      <Link href="/chat">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur transition-all duration-200 h-10 px-4 text-sm font-medium text-white hover:text-white flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          New Chat
        </motion.button>
      </Link>

      <Link href="/">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-full border border-white/10 bg-transparent hover:bg-white/5 backdrop-blur transition-all duration-200 h-10 px-4 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </motion.button>
      </Link>
    </div>
  );
}
