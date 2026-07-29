"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  BookOpen,
  Quote,
  FileText,
  Heading,
  ClipboardList,
  Bookmark,
  Download,
  ExternalLink,
} from "lucide-react";
import { SectionContainer } from "@/components/overview/ui/section-container";

const researchFeatures = [
  { icon: BookOpen, label: "Academic Writing" },
  { icon: Quote, label: "Source Tracking" },
  { icon: FileText, label: "PDF Understanding" },
  { icon: Heading, label: "Markdown" },
  { icon: ClipboardList, label: "Citation Support" },
  { icon: Bookmark, label: "Research Notes" },
  { icon: Download, label: "Reference Mgmt" },
  { icon: ExternalLink, label: "Export" },
];

export function ResearchSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <SectionContainer id="research" className="py-20 lg:py-32">
      <div ref={ref} className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative aspect-[4/3] w-full bg-bg-card border border-border rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px] overflow-hidden shadow-2xl shadow-accent/5">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-bg-secondary/50">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fbc02d]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
                </div>
                <span className="ml-3 text-xs text-text-secondary">research   transformer architectures</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-medium">Literature Review Notes</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-tr-[3px] rounded-bl-[3px] rounded-tl-[2px] rounded-br-[2px]">12 sources</span>
                </div>
                <div className="space-y-2">
                  {[
                    { title: "Attention Is All You Need", type: "PDF" },
                    { title: "BERT: Pre-training of Deep Bidirectional Transformers", type: "PDF" },
                    { title: "GPT-4 Technical Report", type: "PDF" },
                    { title: "Scaling Laws for Neural Language Models", type: "PDF" },
                  ].map((source) => (
                    <div
                      key={source.title}
                      className="flex items-center gap-2 p-2 bg-bg-secondary/30 border border-border/40 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[6px] rounded-br-[6px] hover:border-accent/20 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-text-secondary flex-shrink-0" />
                      <span className="text-[10px] text-text-primary flex-1 truncate">{source.title}</span>
                      <span className="text-[8px] px-1 py-0.5 bg-white/5 text-text-secondary rounded-tr-[2px] rounded-bl-[2px] rounded-tl-[1px] rounded-br-[1px]">{source.type}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-bg-secondary/30 border border-border/40 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px]">
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    &ldquo;The transformer architecture introduced in Vaswani et al. (2017) has become the foundation of modern NLP. Key innovations include multi-head self-attention...&rdquo;
                  </p>
                  <p className="text-[8px] text-text-secondary mt-1">
                      Generated summary with 4 citations
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-48 h-48 bg-accent/5 blur-[60px] rounded-full pointer-events-none" aria-hidden="true" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-6 order-1 lg:order-2"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 rounded-tr-lg rounded-bl-lg rounded-tl-[8px] rounded-br-[8px] border border-accent/20">
              <BookOpen className="w-3 h-3" />
              Research
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]">
              Deep research.{" "}
              <span className="text-accent">Real sources.</span>
            </h2>
            <p className="text-base lg:text-lg text-text-secondary leading-relaxed max-w-lg">
              Conduct thorough research with AI that reads PDFs, tracks sources, generates citations, and synthesizes findings   just like a research assistant.
            </p>
            <div className="flex flex-wrap gap-2">
              {researchFeatures.map((feat) => (
                <div
                  key={feat.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary bg-white/5 border border-border/50 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]"
                >
                  <feat.icon className="w-3 h-3 text-accent" />
                  {feat.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </SectionContainer>
  );
}
