"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PLANS, type PlanTier, setPlanInStorage } from "@/lib/premium";

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
  prefill: { contact: string };
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

interface RazorpayCheckoutButtonProps {
  plan: PlanTier;
  className?: string;
  children?: React.ReactNode;
}

export function RazorpayCheckoutButton({ plan, className, children }: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!document.querySelector('script[src*="checkout.razorpay"]');
  });
  const scriptAdded = useRef(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (scriptLoaded) return;
    if (scriptAdded.current) return;
    scriptAdded.current = true;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [scriptLoaded]);

  const handleCheckout = useCallback(async () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config = PLANS[plan];
      if (!config || config.amountPaise <= 0) return;

      const receipt = `${plan}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: config.amountPaise,
          currency: "INR",
          receipt,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Failed to create order");
      }

      const { order_id, amount, currency } = await orderRes.json();

      const options: RazorpayConstructorOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "Cobentt",
        description: `${config.label} Plan - ${config.description}`,
        order_id,
        prefill: {
          contact: "",
        },
        theme: { color: "#000000" },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        handler: async function (response: RazorpayResponse) {
          const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = response;

          const confirmRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id,
              razorpay_order_id,
              razorpay_signature,
              plan,
            }),
          });

          if (!confirmRes.ok) {
            const err = await confirmRes.json();
            throw new Error(err.error || "Payment confirmation failed");
          }

          setPlanInStorage(plan);
          window.dispatchEvent(new CustomEvent("cb-plan-updated", { detail: { plan } }));
          router.refresh();
        },
        retry: { enabled: true, max_count: 3 },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        const err = response as RazorpayError;
        setError(err.error?.description || "Payment failed. Please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }, [plan, isSignedIn, router]);

  return (
    <>
      <button
        onClick={handleCheckout}
        disabled={loading || !scriptLoaded}
        className={className}
      >
        {loading || !scriptLoaded ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          children
        )}
      </button>
      {error && (
        <div className="text-xs text-red-400 mt-2 text-center">{error}</div>
      )}
    </>
  );
}
