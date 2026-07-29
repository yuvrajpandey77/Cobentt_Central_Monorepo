"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div className={cn("flex items-center flex-shrink-0", isCollapsed ? "justify-center" : "justify-between")}>
      {!isCollapsed && (
        <Link href="/chat" className="flex items-center gap-2">
          <Image
            src="/cobentttransparent.webp"
            alt="Cobentt"
            width={28}
            height={28}
            className="rounded-lg object-cover"
          />
          <span className="text-base font-semibold text-foreground">Cobentt</span>
        </Link>
      )}

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150 flex-shrink-0"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </motion.button>
    </div>
  );
}
