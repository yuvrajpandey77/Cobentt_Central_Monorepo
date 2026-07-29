"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Cpu, Database, Route, Shield, BrainCircuit, Zap } from "lucide-react";
import { SectionContainer } from "@/components/overview/ui/section-container";

const layers = [
  { icon: BrainCircuit, label: "Context Engine", desc: "Understands your projects, history, preferences, and active work." },
  { icon: Database, label: "Memory Engine", desc: "Persistent knowledge graph connecting every interaction across your workspace." },
  { icon: Route, label: "Routing Engine", desc: "Routes every request to the optimal model based on task, cost, and capability." },
  { icon: Shield, label: "Safety Layer", desc: "Content filtering, prompt injection detection, and output validation." },
  { icon: Cpu, label: "Model Selection", desc: "Selects from 40+ models   frontier APIs to local Ollama instances." },
  { icon: Zap, label: "Response Generator", desc: "Formats, cites, and delivers results with full provenance tracking." },
];

export function InsideMeridian() {
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4"
          >
            Inside Meridian
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Built from the ground up.{" "}
            <span className="text-white">Runs anywhere.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base lg:text-lg text-white/40 max-w-2xl mx-auto"
          >
            Meridian is a small language model that runs locally on your machine. It orchestrates frontier models, manages context, and keeps everything connected   without sending your data to the cloud.
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className={`relative group p-6 bg-bg-card border border-white/5 transition-all duration-500 hover:border-white/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer overflow-hidden ${
                i % 2 === 0
                  ? "rounded-tl-[40px] rounded-tr-[12px] rounded-br-[40px] rounded-bl-[12px]"
                  : "rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px]"
              }`}
            >
              <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent blur-xl" />
              </div>
              <div className="w-10 h-10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[6px] rounded-br-[6px] bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors duration-300">
                <layer.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1.5">{layer.label}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{layer.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}
