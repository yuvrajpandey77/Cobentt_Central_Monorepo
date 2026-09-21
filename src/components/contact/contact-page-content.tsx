"use client";

import { useSearchParams } from "next/navigation";
import { Building2, Bug, Mail, MessageSquareHeart } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { SUPPORT_EMAIL, type ContactTopic } from "@/lib/web3forms";

const VALID_TOPICS: ContactTopic[] = ["general", "issue", "integration", "feedback", "feature"];

const channels = [
  {
    icon: Mail,
    title: "Issues & queries",
    desc: "Something broken or unclear? Report bugs, ask questions, get help.",
    meta: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}?subject=Cobentt%20support%20request`,
    cta: "Email support",
  },
  {
    icon: Building2,
    title: "Industry-level integrations",
    desc: "Custom deployments, on-premise setups, compliance reviews, SLAs and pilots for teams and enterprises.",
    meta: "Response within 1 business day",
    href: "?topic=integration",
    cta: "Start a conversation",
  },
  {
    icon: MessageSquareHeart,
    title: "Feedback & ideas",
    desc: "Rate the product, request features, tell us what to build next. Every message is read by the team.",
    meta: "Shapes our roadmap",
    href: "?topic=feedback",
    cta: "Share feedback",
  },
];

export function ContactPageContent() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("topic");
  const initialTopic: ContactTopic = VALID_TOPICS.includes(raw as ContactTopic)
    ? (raw as ContactTopic)
    : "general";

  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-12 lg:mb-16 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Contact
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Talk to us. <span className="text-text-secondary">We listen.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            Questions, issues, feedback, or industry-level integrations — one
            form, one inbox:{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-text-secondary hover:text-white underline underline-offset-2"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-12 lg:mb-16">
          {channels.map((c) => (
            <div
              key={c.title}
              className="p-5 bg-bg-card border border-white/5 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[8px] rounded-br-[8px] hover:border-white/10 transition-colors flex flex-col"
            >
              <div className="w-9 h-9 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] bg-white/10 flex items-center justify-center mb-3">
                <c.icon className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold text-white mb-1">{c.title}</h2>
              <p className="text-xs text-text-tertiary leading-relaxed mb-3">{c.desc}</p>
              <p className="text-[11px] text-text-muted mb-4">{c.meta}</p>
              <a
                href={c.href}
                className="mt-auto inline-flex items-center text-xs font-medium text-text-secondary hover:text-white transition-colors"
              >
                {c.cta} →
              </a>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto pb-20 lg:pb-28">
          <div className="p-6 lg:p-8 bg-bg-card border border-white/10 rounded-tr-[20px] rounded-bl-[20px] rounded-tl-[12px] rounded-br-[12px]">
            <div className="flex items-center gap-2 mb-1">
              <Bug className="w-4 h-4 text-text-tertiary" />
              <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                Contact form
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Send us a message</h2>
            <p className="text-sm text-text-tertiary mb-6">
              We typically reply within 24 hours on business days.
            </p>
            <ContactForm key={initialTopic} initialTopic={initialTopic} />
          </div>
        </div>
      </div>
    </main>
  );
}
