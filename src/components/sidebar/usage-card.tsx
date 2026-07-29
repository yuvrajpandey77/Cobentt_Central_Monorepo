"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UsageCardProps {
  tokensUsed?: number;
  tokensLimit?: number;
  isCollapsed: boolean;
}

export function UsageCard({ tokensUsed = 0, tokensLimit = 1000000, isCollapsed }: UsageCardProps) {
  const percentage = tokensLimit > 0 ? Math.min((tokensUsed / tokensLimit) * 100, 100) : 0;
  const remaining = tokensLimit - tokensUsed;
  const isLow = percentage > 80;

  if (isCollapsed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-3 p-3 rounded-lg bg-card/40 border border-border/20"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground">{tokensLimit.toLocaleString()} Context</span>
        <span className={cn("text-[11px] font-medium", isLow ? "text-amber-400" : "text-muted-foreground")}>
          {percentage.toFixed(0)}% Used
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full transition-colors", isLow ? "bg-amber-500" : "bg-primary/40")}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">{remaining.toLocaleString()} remaining</span>
        <span className="text-[10px] text-muted-foreground">Resets soon</span>
      </div>
    </motion.div>
  );
}
