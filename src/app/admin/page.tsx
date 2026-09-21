"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, Users, Activity } from "lucide-react";

export default function AdminPanel() {
  const [email, setEmail] = useState("");
  const [newLimit, setNewLimit] = useState(200000);
  const [newRequests, setNewRequests] = useState(6);
  const [newGrace, setNewGrace] = useState(20000);
  const [newPlan, setNewPlan] = useState<"FREE" | "PRO" | "ENTERPRISE" | "CUSTOM">("FREE");
  const [newStatus, setNewStatus] = useState<"PENDING" | "APPROVED" | "REVOKED">("APPROVED");

  const trpc = useTRPC();

  // Search user query
  const {
    data: user,
    refetch,
    isLoading: isSearching,
  } = useQuery(
    trpc.admin.findUserByEmail.queryOptions(
      { email },
      { enabled: false } // manual trigger
    )
  );

  // Update limits mutation
  const updateLimitsMutation = useMutation(
    trpc.admin.updateUserLimits.mutationOptions({
      onSuccess: () => {
        toast.success("User limits updated successfully!");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Update plan mutation
  const updatePlanMutation = useMutation(
    trpc.admin.updateUserPlan.mutationOptions({
      onSuccess: () => {
        toast.success("User plan updated successfully!");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Get platform analytics
  const { data: analytics } = useQuery(
    trpc.admin.platformAnalytics.queryOptions({ days: 30 })
  );

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage user quotas, plans, and monitor platform usage
        </p>
      </div>

      {/* Platform Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.usersByStatus.reduce((acc, u) => acc + u._count, 0)}
              </div>
              <div className="flex gap-2 mt-2">
                {analytics.usersByStatus.map((s) => (
                  <Badge key={s.status} variant="secondary" className="text-xs">
                    {s.status}: {s._count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens (30d)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.totalUsage.totalTokens.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalUsage.totalRequests.toLocaleString()} requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Cost (30d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Number(analytics.totalUsage.totalCost).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                ${(Number(analytics.totalUsage.totalCost) / 30).toFixed(2)}/day avg
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search User</CardTitle>
          <CardDescription>
            Find and manage user quotas by email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="user@example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    refetch();
                  }
                }}
              />
            </div>
            <Button
              onClick={() => refetch()}
              disabled={!email || isSearching}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {user && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{user.email}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant={
                        user.status === "APPROVED"
                          ? "default"
                          : user.status === "PENDING"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {user.status}
                    </Badge>
                    <Badge variant="outline">{user.plan} Plan</Badge>
                  </div>
                </div>
                {user.usage && (
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground">Daily Usage</div>
                    <div className="font-semibold">
                      {user.usage.dailyTokens.toLocaleString()} /{" "}
                      {user.maxDailyTokens.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(
                        (user.usage.dailyTokens / user.maxDailyTokens) * 100
                      )}
                      % used
                    </div>
                  </div>
                )}
              </div>

              {/* Current Limits */}
              <div className="grid grid-cols-2 gap-4 py-3 border-y">
                <div>
                  <div className="text-sm text-muted-foreground">Daily Token Limit</div>
                  <div className="font-semibold">
                    {user.maxDailyTokens.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Daily Requests</div>
                  <div className="font-semibold">{user.maxDailyRequests}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Grace Tokens</div>
                  <div className="font-semibold">
                    {user.graceTokens.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Usage</div>
                  <div className="font-semibold">
                    {user.usage?.totalTokens.toLocaleString() ?? 0}
                  </div>
                </div>
              </div>

              {/* Update Plan */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Update Plan</h4>
                <div className="flex gap-2">
                  <Select
                    value={newPlan}
                    onValueChange={(v: string) => setNewPlan(v as "FREE" | "PRO" | "ENTERPRISE" | "CUSTOM")}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">FREE</SelectItem>
                      <SelectItem value="PRO">PRO</SelectItem>
                      <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() =>
                      updatePlanMutation.mutate({
                        email,
                        plan: newPlan,
                        applyPlanLimits: true,
                      })
                    }
                    disabled={updatePlanMutation.isPending}
                    variant="secondary"
                  >
                    Update Plan
                  </Button>
                </div>
              </div>

              {/* Update Limits */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Update Limits</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Daily Tokens
                    </label>
                    <Input
                      type="number"
                      value={newLimit}
                      onChange={(e) => setNewLimit(Number(e.target.value))}
                      placeholder="200000"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Daily Requests
                    </label>
                    <Input
                      type="number"
                      value={newRequests}
                      onChange={(e) => setNewRequests(Number(e.target.value))}
                      placeholder="6"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Grace Tokens
                    </label>
                    <Input
                      type="number"
                      value={newGrace}
                      onChange={(e) => setNewGrace(Number(e.target.value))}
                      placeholder="20000"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={newStatus}
                    onValueChange={(v: string) => setNewStatus(v as "PENDING" | "APPROVED" | "REVOKED")}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="APPROVED">APPROVED</SelectItem>
                      <SelectItem value="REVOKED">REVOKED</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() =>
                      updateLimitsMutation.mutate({
                        email,
                        maxDailyTokens: newLimit,
                        maxDailyRequests: newRequests,
                        graceTokens: newGrace,
                        status: newStatus,
                      })
                    }
                    disabled={updateLimitsMutation.isPending}
                  >
                    {updateLimitsMutation.isPending
                      ? "Updating..."
                      : "Update Limits"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

