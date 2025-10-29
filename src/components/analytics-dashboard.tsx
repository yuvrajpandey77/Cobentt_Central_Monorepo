"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  TrendingUp,
  Zap,
  DollarSign,
  BarChart3,
  Clock,
} from "lucide-react";

interface AnalyticsDashboardProps {
  days?: number;
}

export function AnalyticsDashboard({ days = 30 }: AnalyticsDashboardProps) {
  const trpc = useTRPC();

  const { data: analytics } = useSuspenseQuery(
    trpc.usage.analytics.queryOptions({ days })
  );

  const { data: breakdown } = useSuspenseQuery(
    trpc.usage.breakdown.queryOptions({ days: 7 })
  );

  const { data: userTotals } = useSuspenseQuery(
    trpc.usage.userTotals.queryOptions()
  );

  const totalTokens = analytics.dailyUsage.reduce(
    (sum, day) => sum + day.totalTokens,
    0
  );
  const totalCost = analytics.dailyUsage.reduce(
    (sum, day) => sum + Number(day.totalCost),
    0
  );
  const avgTokensPerDay = totalTokens / days;
  const avgCostPerDay = totalCost / days;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userTotals.totalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {userTotals.totalRequests.toLocaleString()} total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Cost
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Number(userTotals.totalCostUsd).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime spend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Tokens/Day
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(avgTokensPerDay).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Cost/Day
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${avgCostPerDay.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {days} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Provider Breakdown
          </CardTitle>
          <CardDescription>Token usage by AI provider (last 7 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.providerBreakdown.map((provider) => (
              <div key={provider.provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{provider.provider}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {provider._count} calls
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {(provider._sum.totalTokens ?? 0).toLocaleString()} tokens
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${Number(provider._sum.costUsd ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        ((provider._sum.totalTokens ?? 0) / totalTokens) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Model Usage
          </CardTitle>
          <CardDescription>Top models by token consumption (last 7 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {breakdown.slice(0, 5).map((model, idx) => (
              <div
                key={`${model.provider}-${model.model}`}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-muted-foreground">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-medium">{model.model}</div>
                    <div className="text-xs text-muted-foreground">
                      {model.provider} • {model._count} calls
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {(model._sum.totalTokens ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${Number(model._sum.costUsd ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Usage Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Usage Trend
          </CardTitle>
          <CardDescription>Token usage over time (last {days} days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.dailyUsage.slice(0, 14).map((day) => (
              <div key={day.date.toISOString()} className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground w-20">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-full h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/70 transition-all"
                        style={{
                          width: `${Math.min(
                            (day.totalTokens / Math.max(...analytics.dailyUsage.map((d) => d.totalTokens))) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs font-medium w-24 text-right">
                      {day.totalTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground w-16 text-right">
                  ${Number(day.totalCost).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

