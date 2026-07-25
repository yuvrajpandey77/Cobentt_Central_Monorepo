"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Zap, ChevronDown, ChevronUp, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenCounterProps {
  projectId?: string;
  variant?: "sidebar" | "inline" | "bar";
  collapsed?: boolean;
}

export function TokenCounter({ projectId, variant = "inline", collapsed }: TokenCounterProps) {
  const [expanded, setExpanded] = useState(false);
  const trpc = useTRPC();

  const { data: quotaStatus } = useQuery(trpc.usage.quotaStatus.queryOptions());
  const { data: projectTotals } = useQuery(
    trpc.usage.projectTotals.queryOptions(
      { projectId: projectId! },
      { enabled: !!projectId }
    )
  );

  if (!quotaStatus) return null;

  const percentUsed = quotaStatus.usage?.percentUsed ?? 0;
  const tokensUsed = quotaStatus.usage?.dailyTokens ?? 0;
  const tokensLimit = quotaStatus.usage?.limit ?? 200000;
  const tokensRemaining = tokensLimit - tokensUsed;

  const getBarColor = () => {
    if (percentUsed >= 100) return "bg-red-500";
    if (percentUsed >= 90) return "bg-amber-500";
    if (percentUsed >= 75) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getTextColor = () => {
    if (percentUsed >= 100) return "text-red-400";
    if (percentUsed >= 90) return "text-amber-400";
    if (percentUsed >= 75) return "text-yellow-400";
    return "text-emerald-400";
  };

  if (variant === "sidebar") {
    if (collapsed) {
      return (
        <div className="py-2 flex justify-center border-t border-white/10">
          <button
            onClick={() => setExpanded(!expanded)}
            className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200"
            title={`${tokensUsed.toLocaleString()} / ${tokensLimit.toLocaleString()} tokens (${percentUsed}%)`}
          >
            <Zap className={cn("h-3.5 w-3.5", getTextColor())} />
            <span className={cn(
              "absolute -top-1.5 -right-1.5 text-[9px] px-1 py-0.5 rounded-full font-bold border",
              percentUsed >= 100 ? "bg-red-500 text-white border-red-400" :
              percentUsed >= 90 ? "bg-amber-500 text-black border-amber-400" :
              percentUsed >= 75 ? "bg-yellow-500 text-black border-yellow-400" :
              "bg-emerald-500 text-black border-emerald-400"
            )}>
              {percentUsed}%
            </span>
          </button>
        </div>
      );
    }
    return (
      <div className="px-3 py-2 border-t border-white/10">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors"
        >
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">{tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", getBarColor())}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <span className={cn("font-semibold", getTextColor())}>{percentUsed}%</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {expanded && (
          <div className="mt-2 space-y-1.5 text-xs text-white/50 pl-5">
            <div className="flex justify-between">
              <span>Daily used</span>
              <span className="font-medium text-white/70">{tokensUsed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining</span>
              <span className="font-medium text-white/70">{tokensRemaining.toLocaleString()}</span>
            </div>
            {projectId && projectTotals && (
              <div className="flex justify-between">
                <span>Project today</span>
                <span className="font-medium text-white/70">{projectTotals.totalTokensProjectToday.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Plan</span>
              <span className="font-medium text-white/70">{quotaStatus.plan}</span>
            </div>
            {percentUsed >= 90 && quotaStatus.plan === "FREE" && (
              <div className="flex items-center gap-1 text-amber-400 pt-1">
                <TrendingUp className="h-3 w-3" />
                <span>Upgrade for more</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === "bar") {
    return (
      <div className="border rounded-lg px-4 py-2.5 bg-black/40 border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-white/60" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/80 font-medium">{tokensUsed.toLocaleString()}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/60">{tokensLimit.toLocaleString()}</span>
              <span className="text-white/30 text-xs">tokens</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-[200px]">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", getBarColor())}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
            <span className={cn("text-xs font-semibold w-8 text-right", getTextColor())}>
              {percentUsed}%
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white/40 hover:text-white/60 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-white/60">
            <div>
              <div className="text-white/40">Daily Used</div>
              <div className="font-medium text-white/80">{tokensUsed.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-white/40">Remaining</div>
              <div className="font-medium text-white/80">{tokensRemaining.toLocaleString()}</div>
            </div>
            {projectId && projectTotals && (
              <div>
                <div className="text-white/40">Project Today</div>
                <div className="font-medium text-white/80">{projectTotals.totalTokensProjectToday.toLocaleString()}</div>
              </div>
            )}
            <div>
              <div className="text-white/40">Plan</div>
              <div className="font-medium text-white/80">{quotaStatus.plan}</div>
            </div>
            {quotaStatus.warnings && quotaStatus.warnings.length > 0 && (
              <div className="col-span-full flex items-center gap-1.5 text-amber-400">
                <AlertCircle className="h-3 w-3" />
                <span>{quotaStatus.warnings[0]}</span>
              </div>
            )}
            {percentUsed >= 90 && quotaStatus.plan === "FREE" && (
              <div className="col-span-full flex items-center gap-1.5 text-amber-400">
                <TrendingUp className="h-3 w-3" />
                <span>Upgrade to PRO for 10x more tokens</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={cn(
        "w-full flex items-center gap-2 text-xs border rounded-lg px-3 py-2 transition-colors",
        percentUsed >= 100 ? "bg-red-500/10 border-red-500/20 text-red-400" :
        percentUsed >= 90 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
        percentUsed >= 75 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
        "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      )}
    >
      <Zap className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium">
        {projectTotals ? `Project: ${projectTotals.totalTokensProjectToday.toLocaleString()} · ` : ""}
        Daily: {tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}
      </span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[80px]">
        <div
          className={cn("h-full transition-all", getBarColor())}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      <span className="font-semibold">{percentUsed}%</span>
      {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  );
}
