import type { Metadata } from "next";
import { RazorpayCheckoutButton } from "@/components/overview/razorpay-checkout-button";
import { SubscribeButton } from "@/components/overview/subscribe-button";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { publicCatalog } from "@/lib/catalog";

// Prices and budgets come from the server catalog, so the page always shows what checkout will charge.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing. A monthly plan that renews automatically, or pay as you go.",
};

const formatTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}k` : String(n));

const enterpriseFeatures = [
  "On-premise deployment",
  "Custom SLM fine-tuning",
  "Dedicated Meridian instance",
  "Enterprise SSO & SCIM",
  "Custom contracts & invoicing",
  "24/7 dedicated support",
  "SLA with 99.99% uptime",
  "Data residency options",
];

export default async function PricingPage() {
  const catalog = await publicCatalog();
  const plans = catalog.plans;
  const topups = catalog.topups;
  const topupProducts = ["topup:t1", "topup:t2", "topup:t3"] as const;

  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Plans &amp; Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Simple pricing.{" "}
            <span className="text-white">No surprises.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            Pay monthly and the API budget renews automatically. Cancel anytime; you keep the time you paid for.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-12 lg:mb-16">
          <div className="relative flex flex-col p-8 bg-bg-card border border-white/10 rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px]">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Free</h3>
              <div className="text-4xl font-bold text-white">₹0</div>
              <p className="text-sm text-text-tertiary mt-1">On-device AI, always free</p>
            </div>
            <div className="flex-1 space-y-2.5 mb-8">
              {["Unlimited on-device chat in the Cobentt app", "Memory, notes, reminders and calendar", "Bring your own API key"].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                  <span className="text-sm text-text-tertiary">{feat}</span>
                </div>
              ))}
            </div>
            <Link href="/sign-up" className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium w-full bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10 hover:text-white rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]">
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col p-8 border ${
                plan.key === "plus" ? "bg-white/[0.03] border-white/30 shadow-xl lg:scale-105" : "bg-bg-card border-white/10 hover:border-white/20"
              } rounded-tl-[40px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[40px] transition-all duration-300`}
            >
              {plan.key === "plus" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-bg-primary text-[10px] font-semibold rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
                  MOST POPULAR
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.label}</h3>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl font-bold text-white">{plan.priceINR}</span>
                  <span className="text-sm text-text-tertiary">/ month</span>
                </div>
                <p className="text-sm text-text-tertiary mt-1">{plan.budgetUSD} of API usage each month</p>
              </div>
              <div className="flex-1 space-y-2.5 mb-8">
                <div className="flex items-center gap-2.5"><Check className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" /><span className="text-sm text-text-tertiary">Auto-renews monthly, cancel anytime</span></div>
                {plan.tokens.map((t) => (
                  <div key={t.model} className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                    <span className="text-sm text-text-tertiary">About {formatTokens(t.tokens)} tokens on {t.model.split("/").pop()}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2.5"><Check className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" /><span className="text-sm text-text-tertiary">Up to {plan.dailyRequests.toLocaleString()} requests a day</span></div>
              </div>
              <SubscribeButton
                plan={plan.key}
                label={`Subscribe to ${plan.label}`}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 w-full ${
                  plan.key === "plus"
                    ? "bg-white text-bg-primary hover:bg-white/90 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]"
                    : "bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10 hover:text-white rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mb-12 lg:mb-16 p-8 bg-bg-card border border-white/10 rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px]">
          <h2 className="text-xl font-bold text-white">Pay as you go</h2>
          <p className="text-sm text-text-tertiary mt-1">No subscription. Buy a pack when you need it; it is valid for a year and used after any plan allowance.</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {topups.map((t, i) => (
              <div key={t.key} className="flex flex-col gap-3 p-5 border border-white/10 rounded-[12px] bg-white/[0.02]">
                <div>
                  <div className="text-2xl font-bold text-white">{t.priceINR}</div>
                  <div className="text-sm text-text-tertiary">{t.budgetUSD} of API usage</div>
                  {t.tokens[0] ? <div className="text-xs text-text-muted mt-1">About {formatTokens(t.tokens[0].tokens)} tokens on {t.tokens[0].model.split("/").pop()}</div> : null}
                </div>
                <RazorpayCheckoutButton
                  product={topupProducts[i]}
                  label={`Top-up ${t.budgetUSD} of API usage`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium w-full bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10 hover:text-white rounded-[8px] transition-all"
                >
                  Buy top-up
                </RazorpayCheckoutButton>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto mb-12 lg:mb-16 text-sm text-text-tertiary leading-relaxed">
          <h2 className="text-lg font-semibold text-white mb-2">How the budget works</h2>
          <p>
            Each plan includes a dollar amount of AI usage. Every request is charged at the model&apos;s live provider price plus 10%, so the same budget buys
            more tokens on a cheaper model and fewer on a frontier one. The token counts shown are estimates from current prices. Nothing is charged beyond your plan or top-up balance.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-20 lg:mb-28">
          <div className="p-8 lg:p-10 bg-bg-card border border-white/10 rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px]">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
              <div>
                <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Enterprise</span>
                <h2 className="text-2xl lg:text-3xl font-bold text-white mt-2">Need more? We cover the rest.</h2>
                <p className="text-sm text-text-tertiary mt-1 max-w-lg">
                  Custom deployments, dedicated infrastructure, on-premise Meridian, and enterprise-grade security for organizations with advanced requirements.
                </p>
              </div>
              <a href="/overview/contact" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-bg-primary text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all shrink-0">
                Contact us
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              {enterpriseFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-sm text-text-tertiary">
                  <Check className="w-3 h-3 text-text-muted flex-shrink-0" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto pb-20 lg:pb-28">
          <h2 className="text-2xl lg:text-3xl font-bold text-white text-center mb-10">Questions?</h2>
          <div className="space-y-3">
            {[
              { q: "How does billing work?", a: "Monthly plans renew automatically through Razorpay until you cancel. Cancelling stops the next charge; you keep access until the end of the period you paid for." },
              { q: "What happens when my budget runs out?", a: "Hosted AI pauses until your plan renews or you add a top-up. On-device chat in the app never stops." },
              { q: "Does my plan work in the Cobentt mobile app?", a: "Yes. Sign in to the app with the same account and Cobentt Cloud unlocks after your payment is confirmed." },
              { q: "Can I use my own API keys?", a: "Yes. You can bring your own API keys for any provider. Your data never passes through our servers." },
            ].map((item) => (
              <details key={item.q} className="group border border-white/10 bg-bg-card rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px] overflow-hidden">
                <summary className="px-5 py-3.5 text-sm font-medium text-text-secondary cursor-pointer hover:text-white transition-colors list-none flex items-center justify-between">
                  {item.q}
                  <ArrowRight className="w-3 h-3 text-text-muted rotate-90 group-open:rotate-[-90deg] transition-transform" />
                </summary>
                <div className="px-5 pb-4 text-sm text-text-tertiary leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
