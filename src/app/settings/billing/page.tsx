"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, Clock, ArrowUpRight, Receipt } from "lucide-react";
import Link from "next/link";

export default function BillingPage() {
  const { isLoaded } = useUser();
  const trpc = useTRPC();

  const { data: quotaStatus, isLoading: loadingQuota } = useQuery(
    trpc.usage.quotaStatus.queryOptions()
  );

  if (!isLoaded || loadingQuota) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const plan = quotaStatus?.plan || "FREE";
  const isPaid = plan === "PRO" || plan === "ENTERPRISE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription, payment methods, and billing history.
        </p>
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
              <p className="text-2xl font-bold">{plan}</p>
              <p className="text-sm text-muted-foreground">
                {isPaid ? "Billed monthly" : "Free tier"}
              </p>
            </div>
            <Badge variant={isPaid ? "default" : "secondary"}>
              {plan}
            </Badge>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Account Status</p>
                <p className="text-sm text-muted-foreground">
                  {quotaStatus?.accountStatus || "Active"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Plan Status</p>
                <p className="text-sm text-muted-foreground">
                  {quotaStatus?.plan || "FREE"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isPaid ? "Need to change your plan?" : "Upgrade to access premium features"}
            </p>
            <Button asChild>
              <Link href="/overview/pricing">
                {isPaid ? "Manage Plan" : "Upgrade"}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            View your past invoices and payment records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              View your complete billing history and download invoices.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/billing/history">
                View History
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
