"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

type PlanKey = "starter" | "plus" | "pro";

/**
 * Starts a monthly subscription. The server returns Razorpay's hosted mandate page; Razorpay then charges every month
 * until the customer cancels, and the renewal webhook refills the API budget automatically.
 */
export function SubscribeButton({ plan, label, className }: { plan: PlanKey; label: string; className?: string }) {
  const { isSignedIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(`/overview/pricing?subscribe=${plan}`)}`;
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !body.checkoutUrl) {
        setError(body.error ?? "Could not start checkout.");
        setBusy(false);
        return;
      }
      window.location.href = body.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        aria-label={label}
        className={`${className ?? ""} disabled:opacity-60`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {label}
      </button>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
