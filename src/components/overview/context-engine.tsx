"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  FolderKanban,
  MessageSquare,
  FileText,
  StickyNote,
  Files,
  BrainCircuit,
  Search,
  GitBranch,
} from "lucide-react";
import { SectionContainer } from "@/components/overview/ui/section-container";

const contextSources = [
  { icon: FolderKanban, label: "Projects" },
  { icon: MessageSquare, label: "Chats" },
  { icon: FileText, label: "Documents" },
  { icon: StickyNote, label: "Notes" },
  { icon: Files, label: "Files" },
  { icon: BrainCircuit, label: "Memory" },
  { icon: Search, label: "Research" },
  { icon: GitBranch, label: "Connections" },
];

export function ContextEngine() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <SectionContainer className="py-20 lg:py-32">
      <div ref={ref} className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
              The Context Engine
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]">
              Everything connected.{" "}
              <span className="text-white">Nothing forgotten.</span>
            </h2>
            <p className="text-base lg:text-lg text-white/40 leading-relaxed max-w-lg">
              Meridian maintains a persistent knowledge graph that connects every project, chat, document, file, and research source. Context doesn&apos;t reset when you switch conversations.
            </p>
            <div className="space-y-2">
              {[
                { stat: "100%", label: "Context persistence across sessions" },
                { stat: "Real-time", label: "Knowledge graph updates as you work" },
                { stat: "Local", label: "Memory stored on your machine" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm">
                  <span className="text-white font-semibold w-20">{item.stat}</span>
                  <span className="text-white/40">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="grid grid-cols-4 gap-2 max-w-[400px] mx-auto">
              {contextSources.map((source, i) => (
                <motion.div
                  key={source.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                  className={`flex flex-col items-center gap-1.5 p-3 bg-bg-card border border-white/5 hover:border-white/20 transition-colors cursor-pointer ${
                    i % 4 < 2
                      ? "rounded-tl-[14px] rounded-tr-[6px] rounded-br-[14px] rounded-bl-[6px]"
                      : "rounded-tl-[6px] rounded-tr-[14px] rounded-br-[6px] rounded-bl-[14px]"
                  }`}
                >
                  <source.icon className="w-4 h-4 text-white/50" />
                  <span className="text-[9px] text-white/30 text-center leading-tight">{source.label}</span>
                </motion.div>
              ))}
              <div className="col-span-4 mt-2 p-3 bg-bg-card border border-white/10 rounded-tr-[16px] rounded-bl-[16px] rounded-tl-[10px] rounded-br-[10px] text-center">
                <span className="text-xs text-white/60 font-medium">Unified Context</span>
                <p className="text-[9px] text-white/30 mt-0.5">Every source feeds into a single persistent knowledge graph</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </SectionContainer>
  );
}
