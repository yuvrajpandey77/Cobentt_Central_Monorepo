import { Hero } from "@/components/overview/hero";
import { MeridianSection } from "@/components/overview/meridian-section";
import { ContextEngine } from "@/components/overview/context-engine";
import { DevelopersSection } from "@/components/overview/developers-section";
import { EcosystemMarquee } from "@/components/overview/ecosystem-marquee";
import { Security } from "@/components/overview/security";
import { FinalCTA } from "@/components/overview/final-cta";

export default function OverviewPage() {
  return (
    <main>
      <Hero />
      <MeridianSection />
      <ContextEngine />
      <DevelopersSection />
      <EcosystemMarquee />
      <Security />
      <FinalCTA />
    </main>
  );
}