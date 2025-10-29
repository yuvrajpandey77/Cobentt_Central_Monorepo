"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart2, Clock, Info, Settings, Zap } from "lucide-react";
import { UsageDisplay } from "@/components/usage-display";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

export default function UserInfoPage() {
  const trpc = useTRPC();

  const { data: quotaStatus, isLoading: loadingQuota } = useQuery(
    trpc.usage.quotaStatus.queryOptions()
  );

  const { data: userTotals, isLoading: loadingTotals } = useQuery(
    trpc.usage.userTotals.queryOptions()
  );

  const { data: alerts, isLoading: loadingAlerts } = useQuery(
    trpc.usage.alerts.queryOptions({ limit: 5 })
  );

  const { data: breakdown, isLoading: loadingBreakdown } = useQuery(
    trpc.usage.breakdown.queryOptions({ days: 7 })
  );

  const { data: recentCalls, isLoading: loadingRecent } = useQuery(
    trpc.usage.recentCalls.queryOptions({ limit: 10 })
  );

  if (loadingQuota || loadingTotals) {
    return (
      <div className="p-6">
        <div className="h-6 w-40 bg-card/40 border border-border/20 rounded mb-4 animate-pulse" />
        <div className="h-20 w-full bg-card/40 border border-border/20 rounded animate-pulse" />
      </div>
    );
  }

  if (!quotaStatus || !userTotals) {
    return (
      <div className="p-6">
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">User Settings</h1>
          <p className="text-sm text-muted-foreground">Plan, usage, and activity</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs border rounded-lg px-3 py-2">
          <Settings className="h-3.5 w-3.5" />
          <span className="font-medium">{quotaStatus.plan} Plan</span>
        </div>
      </div>

      <UsageDisplay variant="compact" />

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
              className={cn(
                "h-full transition-all",
                percent >= 100
                  ? "bg-red-500"
                  : percent >= 90
                  ? "bg-amber-500"
                  : percent >= 75
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
              )}
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

      <div className="border rounded-lg p-4 bg-card/40 border-border/20">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <AlertCircle className="h-4 w-4" />
          Recent Alerts
        </div>
        {!loadingAlerts && alerts && alerts.length > 0 ? (
          <div className="space-y-2 text-sm">
            {alerts.map((a: any) => (
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

      <div className="border rounded-lg p-4 bg-card/40 border-border/20">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <BarChart2 className="h-4 w-4" />
          Usage Breakdown (7 days)
        </div>
        {!loadingBreakdown && breakdown && breakdown.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {breakdown.map((b: any, i: number) => (
              <div key={`${b.provider}-${b.model}-${i}`} className="flex items-center justify-between border rounded p-2 bg-white/5">
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

      <div className="border rounded-lg p-4 bg-card/40 border-border/20">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Clock className="h-4 w-4" />
          Recent Calls
        </div>
        {!loadingRecent && recentCalls && recentCalls.length > 0 ? (
          <div className="space-y-2">
            {recentCalls.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm border rounded p-2 bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.provider}</span>
                  <span className="text-muted-foreground">{r.model}</span>
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
        </div>
      </main>
      <Footer />
    </div>
  );
}


