"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayError {
  error?: { description?: string };
}
interface RazorpayConstructorOptions {
  key: string | undefined;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: RazorpayResponse) => void;
  retry: { enabled: boolean; max_count: number };
}
declare global {
  interface Window {
    Razorpay: new (options: RazorpayConstructorOptions) => RazorpayInstance;
  }
}

type ProductKey = "plan:starter" | "plan:plus" | "plan:pro" | "topup:t5" | "topup:t10" | "topup:t25";

interface Props {
  /** What to buy. The server decides the price. */
  product: ProductKey;
  /** Shown in the payment window, e.g. "Plus plan, 30 days". */
  label: string;
  className?: string;
  children?: React.ReactNode;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Razorpay Checkout for a 30-day plan. The browser sends ONLY the plan name; the server decides the price, creates
 * the order, and after payment re-checks everything with Razorpay before granting access.
 */
export function RazorpayCheckoutButton({ product, label, className, children }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(() => typeof window !== "undefined" && !!window.Razorpay);
  const scriptAdded = useRef(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (scriptLoaded || scriptAdded.current) return;
    scriptAdded.current = true;
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      if (window.Razorpay) setScriptLoaded(true);
      else existing.addEventListener("load", () => setScriptLoaded(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setMessage({ ok: false, text: "Couldn't load the payment window. Check your connection and reload." });
    document.body.appendChild(script); // left in place: removing it on unmount breaks other buttons on the page
  }, [scriptLoaded]);

  const handleCheckout = useCallback(async () => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent("/overview/pricing")}`);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      if (!orderRes.ok) throw new Error(await readError(orderRes, "Could not start checkout. Please try again."));
      const { order_id, amount, currency } = (await orderRes.json()) as { order_id: string; amount: number; currency: string };

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "Cobentt",
        description: label,
        order_id,
        theme: { color: "#000000" },
        modal: { ondismiss: () => setLoading(false) },
        retry: { enabled: true, max_count: 3 },
        handler: async (response: RazorpayResponse) => {
          try {
            const res = await fetch("/api/payments/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (!res.ok) throw new Error(await readError(res, "We couldn't confirm your payment yet."));
            const done = (await res.json()) as { periodEnd?: string };
            window.dispatchEvent(new CustomEvent("cb-plan-updated", { detail: { product } }));
            const until = done.periodEnd && product.startsWith("plan:") ? new Date(done.periodEnd).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;
            setMessage({ ok: true, text: product.startsWith("topup:") ? "Tokens added to your balance." : until ? `Your plan is active until ${until}.` : "Your plan is active." });
            router.refresh();
          } catch (e) {
            setMessage({
              ok: false,
              text: `${e instanceof Error ? e.message : "Confirmation failed."} If money was taken, your plan activates automatically within a few minutes.`,
            });
          } finally {
            setLoading(false);
          }
        },
      });
      rzp.on("payment.failed", (r: unknown) => {
        setMessage({ ok: false, text: (r as RazorpayError).error?.description || "Payment failed. Please try again." });
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Something went wrong." });
      setLoading(false);
    }
  }, [product, label, isSignedIn, router]);

  return (
    <>
      <button onClick={handleCheckout} disabled={loading || !scriptLoaded} className={className} aria-busy={loading}>
        {loading || !scriptLoaded ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : children}
      </button>
      {message && (
        <div role="status" aria-live="polite" className={`text-xs mt-2 text-center ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </div>
      )}
    </>
  );
}
