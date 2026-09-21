import type { Metadata } from "next";
import { RazorpayCheckoutButton } from "@/components/overview/razorpay-checkout-button";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for individuals, teams, and enterprises.",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for getting started",
    features: [
      "5 chats per day",
      "3 AI models",
      "Basic documents",
      "100MB storage",
      "Community support",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month",
    desc: "For power users and professionals",
    features: [
      "Unlimited chats",
      "All AI models",
      "Full document suite with AI",
      "10GB storage",
      "AI agents",
      "Image generation",
      "Priority support",
      "Context memory",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Teams",
    price: "$50",
    period: "/month",
    desc: "For teams and organizations",
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "Team collaboration",
      "Admin controls & audit logs",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "SSO & advanced security",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Plans & Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Simple pricing.{" "}
            <span className="text-white">No surprises.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/40 max-w-xl mx-auto">
            Start free. Upgrade when you need more power, storage, or team features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-20 lg:mb-28">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-8 transition-all duration-300 ${
                plan.featured
                  ? "bg-white/[0.03] border-white/30 shadow-xl scale-105 md:scale-110"
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
                  {plan.period && <span className="text-sm text-white/40">{plan.period}</span>}
                </div>
                <p className="text-sm text-white/40 mt-1">{plan.desc}</p>
              </div>
              <div className="flex-1 space-y-2.5 mb-8">
                {plan.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
                    <span className="text-sm text-white/50">{feat}</span>
                  </div>
                ))}
              </div>
              <RazorpayCheckoutButton
                plan={plan.name.toLowerCase() as "free" | "pro" | "teams"}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 w-full ${
                  plan.featured
                    ? "bg-white text-bg-primary hover:bg-white/90 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]"
                    : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </RazorpayCheckoutButton>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mb-20 lg:mb-28">
          <div className="p-8 lg:p-10 bg-bg-card border border-white/10 rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px]">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
              <div>
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Enterprise</span>
                <h2 className="text-2xl lg:text-3xl font-bold text-white mt-2">
                  Need more? We cover the rest.
                </h2>
                <p className="text-sm text-white/40 mt-1 max-w-lg">
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
                <div key={feat} className="flex items-center gap-2 text-sm text-white/40">
                  <Check className="w-3 h-3 text-white/30 flex-shrink-0" />
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
              { q: "Can I switch plans anytime?", a: "Yes. You can upgrade or downgrade at any time. Changes take effect immediately." },
              { q: "Is there a free trial for Pro?", a: "Yes. Pro comes with a 14-day free trial. No credit card required." },
              { q: "Can I use my own API keys?", a: "Yes. You can bring your own API keys for OpenAI, Anthropic, Google, and any provider. Your data never passes through our servers." },
              { q: "Do you offer student or academic pricing?", a: "Yes. Contact us with your academic email for a discount on Pro plans." },
            ].map((item) => (
              <details key={item.q} className="group border border-white/10 bg-bg-card rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px] overflow-hidden">
                <summary className="px-5 py-3.5 text-sm font-medium text-white/70 cursor-pointer hover:text-white transition-colors list-none flex items-center justify-between">
                  {item.q}
                  <ArrowRight className="w-3 h-3 text-white/30 rotate-90 group-open:rotate-[-90deg] transition-transform" />
                </summary>
                <div className="px-5 pb-4 text-sm text-white/40 leading-relaxed">
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