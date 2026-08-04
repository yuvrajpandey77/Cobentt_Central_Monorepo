"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Receipt, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface PaymentRecord {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  plan: string;
  status: string;
  createdAt: string;
  refundId: string | null;
  refundAmount: number | null;
}

interface BillingData {
  payments: PaymentRecord[];
  subscription: {
    plan: string;
    subscriptionStatus: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

const PAGE_SIZE = 10;

export default function BillingHistoryPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/billing/history");
      if (!res.ok) throw new Error("Failed to fetch billing history");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load billing history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const payments = data?.payments || [];
  const totalPages = Math.ceil(payments.length / PAGE_SIZE);
  const pagePayments = payments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/billing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Billing History</h1>
          <p className="text-sm text-muted-foreground">
            View your past invoices and payment records.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            All transactions are immutable and auditable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-3">
              {pagePayments.map((payment) => (
                <div key={payment.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{payment.plan} Plan</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          payment.status === "CAPTURED"
                            ? "default"
                            : payment.status === "REFUNDED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        ₹{(payment.amount / 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No payment history yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
