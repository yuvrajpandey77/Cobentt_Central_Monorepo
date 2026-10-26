"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Download, Zap } from "lucide-react";
import { AsymmetricButton } from "@/components/overview/ui/asymmetric-button";

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 lg:py-40 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" aria-hidden="true" />

      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center max-w-3xl mx-auto space-y-8"
        >
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 rounded-tr-lg rounded-bl-lg rounded-tl-[8px] rounded-br-[8px] border border-accent/20">
              <Zap className="w-3 h-3" />
              Get Started Today
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            Start using{" "}
            <span className="text-accent">Cobentt.</span>
          </h2>

          <p className="text-base lg:text-xl text-text-secondary max-w-xl mx-auto leading-relaxed">
            Chat, research, code and run agents in one workspace.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <AsymmetricButton variant="secondary" size="lg" as="a" href="/overview/download">
              <Download className="w-4 h-4" />
              Download Cobentt
            </AsymmetricButton>
            <AsymmetricButton variant="primary" size="lg" as="a" href="/">
              Open Workspace
              <ArrowRight className="w-4 h-4" />
            </AsymmetricButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
