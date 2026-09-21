import { Hero } from "@/components/overview/hero";
import { TheWorkspace } from "@/components/overview/features";
import { MeridianSection } from "@/components/overview/meridian-section";
import { InsideMeridian } from "@/components/overview/inside-meridian";
import { ContextEngine } from "@/components/overview/context-engine";
import { DevelopersSection } from "@/components/overview/developers-section";
import { EcosystemMarquee } from "@/components/overview/ecosystem-marquee";
import { Security } from "@/components/overview/security";
import { FinalCTA } from "@/components/overview/final-cta";
import { ArrowRight, Bot } from "lucide-react";

export default function OverviewPage() {
  return (
    <main>
      <Hero />
      <TheWorkspace />
      <MeridianSection />
      <InsideMeridian />
      <ContextEngine />
      <DevelopersSection />
      <EcosystemMarquee />
      <Security />

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          <div className="max-w-4xl mx-auto p-8 lg:p-10 bg-bg-card border border-white/10 rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px]">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-text-tertiary" />
                  <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">AI Agents</span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white">
                  Autonomous agents. Intelligent workflows.
                </h3>
                <p className="text-sm text-text-tertiary mt-1 max-w-lg">
                  Deploy agents that plan, reason, call tools, and execute complex tasks autonomously.
                </p>
              </div>
              <a
                href="/overview/developers"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-bg-primary text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all shrink-0"
              >
                Explore agents
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 lg:pb-20">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          <div className="max-w-4xl mx-auto p-8 lg:p-10 bg-bg-card border border-white/10 rounded-tl-[16px] rounded-tr-[40px] rounded-br-[16px] rounded-bl-[40px]">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Plans & Pricing</span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white">
                  Start free. Scale as you grow.
                </h3>
                <p className="text-sm text-text-tertiary mt-1 max-w-lg">
                  Cobentt is available in multiple plans for individuals, teams, and enterprises.
                </p>
              </div>
              <a
                href="/overview/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-bg-primary text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all shrink-0"
              >
                View plans
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </main>
  );
}