"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionContainer } from "@/components/overview/ui/section-container";

function NeuralNetwork() {
  return (
    <svg viewBox="0 0 500 500" fill="none" className="w-full h-full">
      <defs>
        <radialGradient id="pulse1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.12" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pulse2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="250" cy="250" r="220" fill="url(#pulse1)" className="animate-pulse" style={{ animationDuration: '5s' }} />
      <circle cx="250" cy="250" r="160" fill="url(#pulse2)" className="animate-pulse" style={{ animationDuration: '3.5s' }} />
      <circle cx="250" cy="250" r="100" fill="url(#pulse1)" className="animate-pulse" style={{ animationDuration: '2.5s' }} />
      <circle cx="250" cy="250" r="28" className="fill-white/80" />
      <circle cx="250" cy="250" r="38" className="stroke-white/20" strokeWidth="1" fill="none" />
      <circle cx="250" cy="250" r="50" className="stroke-white/10" strokeWidth="0.5" fill="none" />
      {[
        [250, 80], [160, 120], [340, 120], [90, 190], [410, 190],
        [120, 300], [380, 300], [170, 380], [330, 380], [250, 430],
        [60, 260], [440, 260], [200, 60], [300, 60],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <line x1="250" y1="250" x2={cx} y2={cy} className="stroke-white/10" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r={i < 3 ? 9 : 6} className={i < 3 ? "fill-white/50" : "fill-white/25"} />
          <circle cx={cx} cy={cy} r={(i < 3 ? 9 : 6) + 8} className="stroke-white/5" strokeWidth="0.3" fill="none" />
        </g>
      ))}
      {[
        [160, 120, 90, 190],
        [340, 120, 410, 190],
        [90, 190, 60, 260],
        [410, 190, 440, 260],
        [90, 190, 120, 300],
        [410, 190, 380, 300],
        [120, 300, 170, 380],
        [380, 300, 330, 380],
        [170, 380, 250, 430],
        [330, 380, 250, 430],
        [200, 60, 160, 120],
        [300, 60, 340, 120],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={`conn-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-white/5" strokeWidth="0.3" />
      ))}
      <text x="250" y="256" textAnchor="middle" className="fill-white/80 text-[12px] font-semibold" fontFamily="system-ui">M</text>
    </svg>
  );
}

export function MeridianSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <SectionContainer id="meridian" className="py-20 lg:py-32">
      <div ref={ref} className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
              The Intelligence Layer
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]">
              Meet{" "}
              <span className="text-white">Meridian.</span>
            </h2>
            <p className="text-lg lg:text-xl text-text-secondary font-medium">
              The intelligence behind Cobentt.
            </p>
            <p className="text-base lg:text-lg text-text-tertiary leading-relaxed max-w-lg">
              Meridian is a purpose-built orchestration engine. It plans every request, retrieves context, routes to the optimal model, and verifies every response   before you see a result.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {[
                { label: "Plans", desc: "Breaks down intent into steps" },
                { label: "Routes", desc: "Selects optimal model per task" },
                { label: "Context", desc: "Retrieves persistent memory" },
                { label: "Verifies", desc: "Validates before responding" },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-bg-card border border-white/5 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]">
                  <p className="text-xs font-semibold text-text-secondary">{item.label}</p>
                  <p className="text-[9px] text-text-muted mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="w-full max-w-[500px] mx-auto aspect-square">
              <NeuralNetwork />
            </div>
          </motion.div>
        </div>
      </div>
    </SectionContainer>
  );
}
