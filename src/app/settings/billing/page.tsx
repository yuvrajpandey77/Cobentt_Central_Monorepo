"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Clock, ArrowUpRight, Receipt, Loader2 } from "lucide-react";
import Link from "next/link";

type Me = {
  plan: "free" | "starter" | "plus" | "pro";
  planLabel: string;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  subscriptionStatus: string | null;
  balance: {
    planUSD: string;
    topupUSD: string;
    totalUSD: string;
    planExpiresAt: string | null;
    topupExpiresAt: string | null;
    tokens: Array<{ model: string; tokens: number }>;
  };
  usage: Array<{ kind: string; amountUSD: string; direction: "spent" | "added"; model: string | null; promptTokens: number | null; completionTokens: number | null; at: string }>;
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}k` : String(n));

export default function BillingPage() {
  const { isLoaded } = useUser();
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Me>({
    queryKey: ["billing", "me"],
    queryFn: async () => {
      const res = await fetch("/api/billing/me", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load billing");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const cancel = async () => {
    if (!confirm("Stop renewal? You keep access until the end of this period.")) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not cancel.");
      await qc.invalidateQueries({ queryKey: ["billing", "me"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setCancelling(false);
    }
  };

  if (!isLoaded || isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const isPaid = data.plan !== "free";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Your plan, renewal, and API usage budget.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{data.planLabel}</p>
              <p className="text-sm text-muted-foreground">
                {!isPaid
                  ? "Free tier. On-device chat is unlimited."
                  : data.cancelAtPeriodEnd
                    ? `Ends ${fmtDate(data.renewsAt)}. Renewal is off.`
                    : `Renews automatically on ${fmtDate(data.renewsAt)}.`}
              </p>
            </div>
            <Badge variant={isPaid ? "default" : "secondary"}>{isPaid ? (data.cancelAtPeriodEnd ? "Ending" : "Active") : "Free"}</Badge>
          </div>

          {data.subscriptionStatus === "PAST_DUE" ? (
            <p className="text-sm text-destructive">A renewal payment failed. Update your payment method in Razorpay, or subscribe again.</p>
          ) : null}

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Plan budget left</p>
                <p className="text-sm text-muted-foreground">
                  {data.balance.planUSD} · resets {fmtDate(data.balance.planExpiresAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Top-up balance</p>
                <p className="text-sm text-muted-foreground">
                  {data.balance.topupUSD} · valid until {fmtDate(data.balance.topupExpiresAt)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">About how many tokens you have left</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {data.balance.tokens.map((t) => (
                <li key={t.model}>
                  ~{fmtTokens(t.tokens)} on {t.model}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Estimates use current provider prices plus a 10% platform margin, and assume a typical mix of input and output.
            </p>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            {isPaid && !data.cancelAtPeriodEnd ? (
              <Button variant="outline" onClick={cancel} disabled={cancelling}>
                {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Stop renewal
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/overview/pricing">
                {isPaid ? "Change plan" : "Subscribe"}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent usage</CardTitle>
          <CardDescription>Each request is charged at the model&apos;s provider price plus 10%.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.usage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.usage.map((u) => (
                <li key={`${u.at}-${u.kind}-${u.model ?? ""}`} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{u.kind === "USAGE" ? u.model ?? "Request" : u.kind === "GRANT_PLAN" ? "Plan renewed" : u.kind === "TOPUP" ? "Top-up added" : "Plan ended"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.at).toLocaleString()}
                      {u.kind === "USAGE" && u.promptTokens != null ? ` · ${u.promptTokens} in / ${u.completionTokens ?? 0} out` : ""}
                    </p>
                  </div>
                  <span className={u.direction === "spent" ? "text-muted-foreground" : "text-foreground"}>
                    {u.direction === "spent" ? "−" : "+"}
                    {u.amountUSD}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/billing/history">
                Payment history
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
