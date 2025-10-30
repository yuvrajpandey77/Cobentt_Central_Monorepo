"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, TrendingUp, Zap } from "lucide-react";

interface UsageDisplayProps {
  projectId?: string;
  variant?: "compact" | "full";
}

export function UsageDisplay({ projectId, variant = "compact" }: UsageDisplayProps) {
  const trpc = useTRPC();

  const { data: quotaStatus, isLoading: quotaLoading } = useQuery(
    trpc.usage.quotaStatus.queryOptions()
  );

  const { data: projectTotals, isLoading: projectTotalsLoading } = useQuery(
    trpc.usage.projectTotals.queryOptions(
      { projectId: projectId! },
      { enabled: !!projectId }
    )
  );

  // Show loading state while data is fetching
  if (quotaLoading || (projectId && projectTotalsLoading)) {
    return (
      <div className="flex items-center justify-between text-xs border rounded-lg px-3 py-2 bg-muted animate-pulse">
        <div className="h-4 w-32 bg-muted-foreground/20 rounded"></div>
        <div className="h-4 w-20 bg-muted-foreground/20 rounded"></div>
      </div>
    );
  }

  if (!quotaStatus) return null;

  const percentUsed = quotaStatus.usage?.percentUsed ?? 0;
  const tokensUsed = quotaStatus.usage?.dailyTokens ?? 0;
  const tokensLimit = quotaStatus.usage?.limit ?? 200000;
  const tokensRemaining = tokensLimit - tokensUsed;

  // Color scheme based on usage
  const getStatusColor = () => {
    if (percentUsed >= 100) return "text-red-600 bg-red-50 border-red-200";
    if (percentUsed >= 90) return "text-amber-600 bg-amber-50 border-amber-200";
    if (percentUsed >= 75) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-black bg-black border-emerald-200";
  };

  const getProgressColor = () => {
    if (percentUsed >= 100) return "bg-red-500";
    if (percentUsed >= 90) return "bg-amber-500";
    if (percentUsed >= 75) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  if (variant === "compact") {
    return (
      <div className={`flex items-center justify-between text-xs border rounded-lg px-3 py-2 ${getStatusColor()}`}>
        <div className="flex items-center gap-3">
          <Zap className="h-3.5 w-3.5" />
          {projectId && projectTotals && (
            <span className="font-medium">
              Project: {projectTotals.totalTokensProjectToday.toLocaleString()} tokens today
            </span>
          )}
          <span className="font-medium">
            Daily: {tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <span className="font-semibold">{percentUsed}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Token Usage
          </h3>
          <p className="text-xs opacity-75 mt-0.5">
            {quotaStatus.plan} Plan • Resets at midnight UTC
          </p>
        </div>
        {quotaStatus.inGracePeriod && (
          <div className="flex items-center gap-1 text-xs font-medium bg-amber-500 text-white px-2 py-1 rounded">
            <AlertCircle className="h-3 w-3" />
            Grace Period
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs font-medium mb-1">
          <span>{tokensUsed.toLocaleString()} used</span>
          <span>{tokensRemaining.toLocaleString()} remaining</span>
        </div>
        <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${getProgressColor()}`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {projectId && projectTotals && (
          <>
            <div className="bg-white/50 rounded px-2 py-1.5">
              <div className="opacity-75">Project Today</div>
              <div className="font-semibold">
                {projectTotals.totalTokensProjectToday.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/50 rounded px-2 py-1.5">
              <div className="opacity-75">Project Total</div>
              <div className="font-semibold">
                {projectTotals.totalTokensProject.toLocaleString()}
              </div>
            </div>
          </>
        )}
        <div className="bg-white/50 rounded px-2 py-1.5">
          <div className="opacity-75">Daily Requests</div>
          <div className="font-semibold">
            {quotaStatus.usage?.dailyRequests ?? 0} / {quotaStatus.maxDailyRequests}
          </div>
        </div>
        {quotaStatus.graceTokens > 0 && (
          <div className="bg-white/50 rounded px-2 py-1.5">
            <div className="opacity-75">Grace Available</div>
            <div className="font-semibold">
              {quotaStatus.graceUsed
                ? "Used"
                : `${quotaStatus.graceTokens.toLocaleString()}`}
            </div>
          </div>
        )}
      </div>

      {/* Warnings */}
      {quotaStatus.warnings && quotaStatus.warnings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current/20">
          {quotaStatus.warnings.map((warning, i) => (
            <div key={i} className="text-xs flex items-start gap-1.5">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade prompt if near limit */}
      {percentUsed >= 90 && quotaStatus.plan === "FREE" && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="h-3 w-3" />
            <span className="font-medium">
              Upgrade to PRO for 10x more tokens
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

