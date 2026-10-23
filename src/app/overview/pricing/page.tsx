import type { Metadata } from "next";
import { RazorpayCheckoutButton } from "@/components/overview/razorpay-checkout-button";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PLAN_SPECS, TOPUP_SPECS, chargeAmount, formatMoney } from "@/lib/pricing-catalog";
import { billingCurrency, usdInrRate } from "@/lib/billing-config";

// Prices come from the server-side plan table so what is shown is exactly what is charged.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for individuals, teams, and enterprises.",
};

const currency = billingCurrency();
const money = (usdCents: number) => formatMoney(chargeAmount(usdCents, currency, usdInrRate()), currency);
const millions = (st: number) => `${st / 1_000_000}M`;

const plans = [
  {
    key: "free",
    name: "Free",
    price: money(0),
    period: "forever",
    desc: "On-device AI, always free",
    features: [
      "Unlimited on-device chat in the Cobentt app",
      "Memory, notes, reminders and calendar",
      "Bring your own API key",
    ],
    cta: "Get Started",
    featured: false,
  },
  ...(["starter", "plus", "pro"] as const).map((k) => {
    const spec = PLAN_SPECS[k];
    const blurb = { starter: "For everyday use", plus: "For heavier daily use", pro: "For power users" }[k];
    const models = { starter: "Standard models", plus: "Standard and premium models", pro: "All models, including frontier" }[k];
    return {
      key: k,
      name: spec.label,
      price: money(spec.usdCents),
      period: "/ 30 days",
      desc: blurb,
      features: [
        `${millions(spec.monthlyST)} standard tokens each period`,
        models,
        `Up to ${spec.dailyRequests} requests a day`,
        "Cobentt Cloud in the mobile app",
        "Buy again early and the days stack",
      ],
      cta: `Get ${spec.label}`,
      featured: k === "plus",
    };
  }),
];

const topups = (["t5", "t10", "t25"] as const).map((k) => ({ key: k, price: money(TOPUP_SPECS[k].usdCents), tokens: millions(TOPUP_SPECS[k].st) }));

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

export default function PricingPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Plans & Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Simple pricing.{" "}
            <span className="text-white">No surprises.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            Start free. Upgrade when you need more power, storage, or team features.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-12 lg:mb-16">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col p-8 transition-all duration-300 ${
                plan.featured
                  ? "bg-white/[0.03] border-white/30 shadow-xl lg:scale-105"
                  : "bg-bg-card border-white/10 hover:border-white/20"
              } border ${
                plan.featured
                  ? "rounded-tl-[40px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[40px]"
                  : "rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px]"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-bg-primary text-[10px] font-semibold rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
                  MOST POPULAR
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-text-tertiary">{plan.period}</span>}
                </div>
                <p className="text-sm text-text-tertiary mt-1">{plan.desc}</p>
              </div>
              <div className="flex-1 space-y-2.5 mb-8">
                {plan.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                    <span className="text-sm text-text-tertiary">{feat}</span>
                  </div>
                ))}
              </div>
              {plan.key === "free" ? (
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 w-full bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10 hover:text-white rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]"
                >
                  {plan.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <RazorpayCheckoutButton
                  product={`plan:${plan.key}` as "plan:starter" | "plan:plus" | "plan:pro"}
                  label={`${plan.name} plan, 30 days`}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 w-full ${
                    plan.featured
                      ? "bg-white text-bg-primary hover:bg-white/90 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]"
                      : "bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10 hover:text-white rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </RazorpayCheckoutButton>
              )}
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mb-12 lg:mb-16 p-8 bg-bg-card border border-white/10 rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px]">
          <h2 className="text-xl font-bold text-white">Pay as you go</h2>
          <p className="text-sm text-text-tertiary mt-1">No plan needed. Buy tokens when you want them; they last 12 months and are used after any plan allowance.</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {topups.map((t) => (
              <div key={t.key} className="flex flex-col gap-3 p-5 border border-white/10 rounded-[12px] bg-white/[0.02]">
                <div>
                  <div className="text-2xl font-bold text-white">{t.price}</div>
                  <div className="text-sm text-text-tertiary">{t.tokens} standard tokens</div>
                </div>
                <RazorpayCheckoutButton
                  product={`topup:${t.key}` as "topup:t5" | "topup:t10" | "topup:t25"}
                  label={`Top-up ${t.tokens} tokens`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium w-full bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10 hover:text-white rounded-[8px] transition-all"
                >
                  Buy tokens
                </RazorpayCheckoutButton>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto mb-12 lg:mb-16 text-sm text-text-tertiary leading-relaxed">
          <h2 className="text-lg font-semibold text-white mb-2">What is a standard token?</h2>
          <p>
            A standard token is one token of a small, fast model. Larger models cost more per token, so they use your balance faster: a Starter plan lasts for about
            10 million tokens of a small model, or a fraction of that on a frontier model. Hosted AI only works while you have a plan or a balance. Nothing is charged automatically.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-20 lg:mb-28">
          <div className="p-8 lg:p-10 bg-bg-card border border-white/10 rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px]">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
              <div>
                <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Enterprise</span>
                <h2 className="text-2xl lg:text-3xl font-bold text-white mt-2">
                  Need more? We cover the rest.
                </h2>
                <p className="text-sm text-text-tertiary mt-1 max-w-lg">
                  Custom deployments, dedicated infrastructure, on-premise Meridian, and enterprise-grade security for organizations with advanced requirements.
                </p>
              </div>
              <a
                href="/overview/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-bg-primary text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all shrink-0"
              >
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
          <h2 className="text-2xl lg:text-3xl font-bold text-white text-center mb-10">
            Questions?
          </h2>
          <div className="space-y-3">
            {[
              { q: "How does billing work?", a: "Each purchase gives you 30 days of the plan. Buying again before it ends adds another 30 days on top. Nothing renews automatically, so you are never charged without choosing to." },
              { q: "What happens when my tokens run out?", a: "Hosted AI pauses until you buy a top-up or your plan period renews. On-device chat in the app never stops." },
              { q: "Does my plan work in the Cobentt mobile app?", a: "Yes. Sign in to the app with the same account and Cobentt Cloud unlocks automatically. On-device chat in the app is always free." },
              { q: "Can I use my own API keys?", a: "Yes. You can bring your own API keys for OpenAI, Anthropic, Google, and any provider. Your data never passes through our servers." },
              { q: "Do you offer student or academic pricing?", a: "Yes. Contact us with your academic email for a discount on Pro plans." },
            ].map((item) => (
              <details key={item.q} className="group border border-white/10 bg-bg-card rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px] overflow-hidden">
                <summary className="px-5 py-3.5 text-sm font-medium text-text-secondary cursor-pointer hover:text-white transition-colors list-none flex items-center justify-between">
                  {item.q}
                  <ArrowRight className="w-3 h-3 text-text-muted rotate-90 group-open:rotate-[-90deg] transition-transform" />
                </summary>
                <div className="px-5 pb-4 text-sm text-text-tertiary leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}