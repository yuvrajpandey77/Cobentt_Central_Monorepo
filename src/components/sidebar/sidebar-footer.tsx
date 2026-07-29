"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { UsageCard } from "./usage-card";

interface SidebarFooterProps {
  isCollapsed: boolean;
}

export function SidebarFooter({ isCollapsed }: SidebarFooterProps) {
  if (isCollapsed) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center gap-2 pb-3">
        <Link href="/settings/user" aria-label="Settings">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150"
          >
            <Settings className="w-4 h-4" />
          </motion.div>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 space-y-2">
      <UsageCard isCollapsed={isCollapsed} />

      <div className="mx-3">
        <Link
          href="/settings/user"
          className="flex items-center gap-2.5 h-[42px] px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150 group"
        >
          <div className="w-6 h-6 rounded-lg bg-card/40 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm flex-1">Profile & Settings</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      </div>

      <div className="px-3">
        <span className="text-[10px] text-muted-foreground">v0.1.0</span>
      </div>
    </div>
  );
}
