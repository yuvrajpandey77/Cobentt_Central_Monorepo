"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Lock,
  KeyRound,
  Eye,
  ShieldBan,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import { SectionContainer } from "@/components/overview/ui/section-container";

const securityItems = [
  {
    icon: Lock,
    title: "Local First",
    desc: "Your data stays on your machine. Process everything locally when possible.",
  },
  {
    icon: KeyRound,
    title: "Your API Keys",
    desc: "Bring your own API keys. We never proxy through our servers.",
  },
  {
    icon: Eye,
    title: "No Training",
    desc: "We never train on your data. Your conversations are yours.",
  },
  {
    icon: ShieldBan,
    title: "Encrypted",
    desc: "End-to-end encryption for all your data in transit and at rest.",
  },
  {
    icon: Cpu,
    title: "Bring Your Own Models",
    desc: "Run local models with Ollama. No cloud dependency required.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    desc: "Built from the ground up with privacy as a core principle.",
  },
];

export function Security() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <SectionContainer className="py-20 lg:py-32">
      <div ref={ref} className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 rounded-tr-lg rounded-bl-lg rounded-tl-[8px] rounded-br-[8px] border border-accent/20 mb-4"
          >
            <Lock className="w-3 h-3" />
            Security & Privacy
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Your data.{" "}
            <span className="text-accent">Your control.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base lg:text-lg text-text-secondary max-w-2xl mx-auto"
          >
            Privacy isn&apos;t a feature. It&apos;s the foundation.
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {securityItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
              className={`group p-6 bg-bg-card border border-border transition-all duration-300 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5 cursor-pointer ${
                i % 2 === 0
                  ? "rounded-tl-[40px] rounded-tr-[12px] rounded-br-[40px] rounded-bl-[12px]"
                  : "rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px]"
              }`}
            >
              <div className="w-10 h-10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[6px] rounded-br-[6px] bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <item.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1.5">{item.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}
