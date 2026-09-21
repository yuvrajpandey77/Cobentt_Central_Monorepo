"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart2, Clock, Info, Zap, TrendingUp, ExternalLink } from "lucide-react";
import { TokenCounter } from "@/components/token-counter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { UsageAlert } from "@/generated/prisma";

export default function UserInfoPage() {
  const trpc = useTRPC();

  const { data: quotaStatus, isLoading: loadingQuota } = useQuery(
    trpc.usage.quotaStatus.queryOptions()
  );

  const { data: userTotals, isLoading: loadingTotals } = useQuery(
    trpc.usage.userTotals.queryOptions()
  );

  const { data: alerts } = useQuery(
    trpc.usage.alerts.queryOptions({ limit: 5 })
  );

  const { data: breakdown, isLoading: loadingBreakdown } = useQuery(
    trpc.usage.breakdown.queryOptions({ days: 7 })
  );

  const { data: recentCalls, isLoading: loadingRecent } = useQuery(
    trpc.usage.recentCalls.queryOptions({ limit: 10 })
  );

  const { data: projectBreakdown, isLoading: loadingProjectBreakdown } = useQuery(
    trpc.usage.projectBreakdown.queryOptions({ days: 30 })
  );

  const { data: analytics } = useQuery(
    trpc.usage.analytics.queryOptions({ days: 30 })
  );

  // Element types derived from the tRPC query outputs above.
  type DailyUsageItem = NonNullable<typeof analytics>["dailyUsage"][number];
  type ProjectBreakdownItem = NonNullable<typeof projectBreakdown>[number];
  type BreakdownItem = NonNullable<typeof breakdown>[number];
  type RecentCallItem = NonNullable<typeof recentCalls>[number] & {
    projectName?: string | null;
  };

  if (loadingQuota || loadingTotals) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!quotaStatus || !userTotals) {
    return (
      <div className="space-y-6">
        <div className="border rounded-lg p-4 bg-card/40 border-border/20 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Unable to load user info.</span>
        </div>
      </div>
    );
  }

  const used = quotaStatus.usage?.dailyTokens ?? 0;
  const limit = quotaStatus.usage?.limit ?? quotaStatus.maxDailyTokens ?? 200000;
  const percent = Math.min(
    quotaStatus.usage?.percentUsed ?? Math.round((used / Math.max(limit, 1)) * 100),
    100
  );

  const getBarColor = (pct: number) => {
    if (pct >= 100) return "bg-red-500";
    if (pct >= 90) return "bg-amber-500";
    if (pct >= 75) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const maxDailyTokens = Math.max(...(analytics?.dailyUsage?.map((d: { totalTokens: number }) => d.totalTokens) ?? [0]), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usage</h1>
          <p className="text-sm text-muted-foreground">Plan, usage, and activity</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs border rounded-lg px-3 py-2">
          <Zap className="h-3.5 w-3.5" />
          <span className="font-medium">{quotaStatus.plan} Plan</span>
        </div>
      </div>

      {/* Central Token Counter */}
      <TokenCounter variant="bar" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border rounded-lg p-4 bg-card/40 border-border/20">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4" />
            Daily Tokens
          </div>
          <div className="mt-2 text-2xl font-bold">
            {used.toLocaleString()} <span className="text-sm text-muted-foreground">/ {limit.toLocaleString()}</span>
          </div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", getBarColor(percent))}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-card/40 border-border/20">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" />
            Daily Requests
          </div>
          <div className="mt-2 text-2xl font-bold">
            {(quotaStatus.usage?.dailyRequests ?? 0).toLocaleString()} {" "}
            <span className="text-sm text-muted-foreground">/ {quotaStatus.maxDailyRequests}</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Resets at midnight UTC</div>
        </div>

        <div className="border rounded-lg p-4 bg-card/40 border-border/20">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BarChart2 className="h-4 w-4" />
            Lifetime Totals
          </div>
          <div className="mt-2 text-2xl font-bold">
            {userTotals.totalTokens.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {userTotals.totalRequests.toLocaleString()} total requests
          </div>
        </div>
      </div>

      {/* Plan Info & Upgrade CTA */}
      {(percent >= 90 || quotaStatus.plan === "FREE") && (
        <div className="border rounded-lg p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  {percent >= 90 ? "You're approaching your daily limit" : "You're on the Free plan"}
                </p>
                <p className="text-xs text-amber-400/70">
                  {quotaStatus.plan === "FREE"
                    ? "Upgrade to PRO for 10x more tokens, higher request limits, and priority support"
                    : `You've used ${percent}% of your daily token allowance`}
                </p>
              </div>
            </div>
            <Link href="/overview/pricing">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
                Upgrade Plan
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 30-Day Usage Chart */}
      {analytics?.dailyUsage && analytics.dailyUsage.length > 0 && (
        <div className="border rounded-lg p-4 bg-card/40 border-border/20">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <BarChart2 className="h-4 w-4" />
            30-Day Usage
          </div>
          <div className="space-y-1">
            {analytics.dailyUsage.slice(-14).map((day: DailyUsageItem, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-muted-foreground shrink-0">
                  {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", getBarColor((day.totalTokens / maxDailyTokens) * 100))}
                    style={{ width: `${(day.totalTokens / maxDailyTokens) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-muted-foreground shrink-0">
                  {day.totalTokens.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Project Breakdown */}
      <div className="border rounded-lg p-4 bg-card/40 border-border/20">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <BarChart2 className="h-4 w-4" />
          Per-Project Usage (30 days)
        </div>
        {!loadingProjectBreakdown && projectBreakdown && projectBreakdown.length > 0 ? (
          <div className="space-y-2 text-sm">
            {projectBreakdown.map((p: ProjectBreakdownItem) => {
              const maxTokens = Math.max(...projectBreakdown.map((x: ProjectBreakdownItem) => x.totalTokens), 1);
              return (
                <div key={p.projectId} className="flex items-center gap-3">
                  <span className="w-40 truncate font-medium">{p.projectName}</span>
                  <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(p.totalTokens / maxTokens) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-muted-foreground">{p.totalTokens.toLocaleString()} tok</span>
                  <span className="w-12 text-right text-muted-foreground">{p.callCount} calls</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No project usage data yet</div>
        )}
      </div>

      {/* Usage Breakdown by Model */}
      <div className="border rounded-lg p-4 bg-card/40 border-border/20">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <BarChart2 className="h-4 w-4" />
          Usage by Model (7 days)
        </div>
        {!loadingBreakdown && breakdown && breakdown.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {breakdown.map((b: BreakdownItem, i: number) => (
              <div key={i} className="flex items-center justify-between border rounded p-2 bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{b.provider}</span>
                  <span className="text-muted-foreground">{b.model}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{b._sum?.totalTokens?.toLocaleString?.() ?? b._sum?.totalTokens}</div>
                  <div className="text-xs text-muted-foreground">{b._count} calls</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No usage data yet</div>
        )}
      </div>

      {/* Recent Calls */}
      <div className="border rounded-lg p-4 bg-card/40 border-border/20">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Clock className="h-4 w-4" />
          Recent Calls
        </div>
        {!loadingRecent && recentCalls && recentCalls.length > 0 ? (
          <div className="space-y-2">
            {recentCalls.map((r: RecentCallItem) => (
              <div key={r.id} className="flex items-center justify-between text-sm border rounded p-2 bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.provider}</span>
                  <span className="text-muted-foreground">{r.model}</span>
                  {r.projectName && (
                    <span className="text-muted-foreground text-xs">· {r.projectName}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold">{r.totalTokens.toLocaleString?.() ?? r.totalTokens} tokens</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No recent calls</div>
        )}
      </div>

      {/* Recent Alerts */}
      <div className="border rounded-lg p-4 bg-card/40 border-border/20">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <AlertCircle className="h-4 w-4" />
          Recent Alerts
        </div>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-2 text-sm">
            {alerts.map((a: UsageAlert) => (
              <div key={a.id} className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-amber-500" />
                <div>
                  <div className="font-medium">{a.alertType.replaceAll("_", " ")}</div>
                  <div className="text-muted-foreground">{a.message}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No recent alerts</div>
        )}
      </div>

      {/* Grace Period & Account Info */}
      {quotaStatus.graceTokens > 0 && (
        <div className="border rounded-lg p-4 bg-card/40 border-border/20">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Info className="h-4 w-4" />
            Grace Period
          </div>
          <p className="text-sm text-muted-foreground">
            {quotaStatus.graceUsed
              ? "Grace period has been used for this cycle. It will reset at midnight UTC."
              : `${quotaStatus.graceTokens.toLocaleString()} grace tokens available when you exceed your daily limit.`}
          </p>
        </div>
      )}
    </div>
  );
}
