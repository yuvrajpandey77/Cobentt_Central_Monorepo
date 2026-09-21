"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  FileText,
  Search,
  Bot,
  Code2,
  BrainCircuit,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { SectionContainer } from "@/components/overview/ui/section-container";

const capabilities = [
  {
    icon: MessageSquare,
    title: "Multi-Model Chat",
    desc: "Meridian routes every request to the optimal model while maintaining full context across conversations.",
  },
  {
    icon: BrainCircuit,
    title: "Context Engine",
    desc: "Persistent memory that connects projects, chats, documents, and research into a unified knowledge graph.",
  },
  {
    icon: Search,
    title: "Research Pipeline",
    desc: "Collect sources, read PDFs, extract data, compare papers, and generate citations all with AI assistance.",
  },
  {
    icon: Code2,
    title: "Developer Workspace",
    desc: "Built-in terminal, sandbox, GitHub sync, and AI pair programming that understands your entire codebase.",
  },
  {
    icon: Bot,
    title: "Agent Runtime",
    desc: "Deploy autonomous agents that plan, reason, call tools, and execute complex multi-step tasks.",
  },
  {
    icon: FileText,
    title: "Rich Documents",
    desc: "Write, edit, and publish documents with live AI collaboration. Export to Markdown, PDF, and more.",
  },
];

/* ── Visual icon background for each capability ── */
function CapabilityGraphic({ icon: Icon, index }: { icon: LucideIcon; index: number }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Animated rings */}
      <div
        className="absolute rounded-full"
        style={{
          width: "90%",
          paddingBottom: "90%",
          border: "1px solid rgba(255,255,255,0.04)",
          animation: `glowPulse ${4 + index}s ease-in-out infinite`,
          animationDelay: `${index * 0.5}s`,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "65%",
          paddingBottom: "65%",
          border: "1px solid rgba(255,255,255,0.03)",
          animation: `glowPulse ${5 + index * 0.3}s ease-in-out infinite`,
          animationDelay: `${index * 0.7 + 1}s`,
        }}
      />
      <Icon
        className="relative z-10"
        style={{ width: "32%", height: "32%" }}
        strokeWidth={1.2}
      />
    </div>
  );
}

export function TheWorkspace() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((i: number) => {
    setDirection(i > activeIndex ? 1 : -1);
    setActiveIndex(i);
  }, [activeIndex]);

  const next = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % capabilities.length);
  }, []);

  useEffect(() => {
    if (!isInView) return;
    const id = setInterval(next, 4500);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [isInView, next]);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 120 : -120, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -120 : 120, opacity: 0 }),
  };

  const active = capabilities[activeIndex];

  return (
    <SectionContainer id="features" className="py-20 lg:py-32">
      <div ref={ref} className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-14 lg:mb-18">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4"
          >
            The Workspace
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            One interface.{" "}
            <span className="text-white">Unified intelligence.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base lg:text-lg text-white/40 max-w-2xl mx-auto"
          >
            Meridian orchestrates every capability &mdash; context, models, agents, and tools &mdash; into a single intelligent workspace.
          </motion.p>
        </div>

        {/* Animated showcase panel */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-bg-card border border-white/[0.06] rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px] overflow-hidden shadow-xl shadow-black/20">
            <div className="relative z-10 flex flex-col lg:flex-row">
              {/* Left: animated icon */}
              <div className="w-full lg:w-[42%] min-h-[240px] lg:min-h-[300px] flex items-center justify-center p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/[0.04]">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={activeIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                    className="w-full max-w-[180px] aspect-square"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    <CapabilityGraphic icon={active.icon} index={activeIndex} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right: animated text */}
              <div className="flex-1 flex flex-col justify-center p-8 lg:p-10 min-h-[200px] lg:min-h-[300px]">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={activeIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <span className="text-[10px] font-mono text-white/20 tracking-wider">
                      {(activeIndex + 1).toString().padStart(2, "0")}
                    </span>
                    <h3 className="text-xl lg:text-2xl font-bold text-white mt-1 mb-3">
                      {active.title}
                    </h3>
                    <p className="text-sm lg:text-base text-white/40 leading-relaxed max-w-md">
                      {active.desc}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Dot navigation */}
                <div className="flex items-center gap-2 mt-6 lg:mt-8">
                  {capabilities.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className="group relative h-3 flex items-center cursor-pointer"
                      aria-label={`Go to ${capabilities[i].title}`}
                    >
                      <div
                        className={`transition-all duration-500 rounded-full ${
                          i === activeIndex
                            ? "w-6 h-1.5 bg-white/60"
                            : "w-1.5 h-1.5 bg-white/15 group-hover:bg-white/30"
                        }`}
                      />
                    </button>
                  ))}
                  <button
                    onClick={next}
                    className="ml-4 p-1 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] hover:bg-white/10 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-white/30" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick capability labels below */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-4">
            {capabilities.map((c, i) => (
              <button
                key={c.title}
                onClick={() => goTo(i)}
                className={`text-[9px] px-2.5 py-1 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] transition-all duration-300 ${
                  i === activeIndex
                    ? "bg-white/15 text-white/70"
                    : "text-white/25 hover:text-white/50 hover:bg-white/5"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
