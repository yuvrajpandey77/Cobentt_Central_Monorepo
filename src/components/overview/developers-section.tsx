"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Code2,
  GitPullRequest,
  Terminal,
  Box,
  GitBranch,
  Bug,
  Rocket,
  FileCode,
} from "lucide-react";
import { SectionContainer } from "@/components/overview/ui/section-container";

const devFeatures = [
  { icon: Code2, label: "VS Code Integration" },
  { icon: GitPullRequest, label: "GitHub Sync" },
  { icon: Terminal, label: "Built-in Terminal" },
  { icon: Box, label: "Sandbox" },
  { icon: GitBranch, label: "Artifacts" },
  { icon: Bug, label: "Debugging" },
  { icon: Rocket, label: "Deployments" },
  { icon: FileCode, label: "Code Generation" },
];

export function DevelopersSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <SectionContainer id="developers" className="py-20 lg:py-32">
      <div ref={ref} className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 rounded-tr-lg rounded-bl-lg rounded-tl-[8px] rounded-br-[8px] border border-accent/20">
              <Code2 className="w-3 h-3" />
              For Developers
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]">
              Code with purpose.{" "}
              <span className="text-accent">Ship with confidence.</span>
            </h2>
            <p className="text-base lg:text-lg text-text-secondary leading-relaxed max-w-lg">
              An AI pair programmer that understands your codebase, writes production-ready code, and helps you ship faster.
            </p>
            <div className="flex flex-wrap gap-2">
              {devFeatures.map((feat) => (
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

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-[4/3] w-full bg-bg-card border border-border rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px] overflow-hidden shadow-2xl shadow-accent/5">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-bg-secondary/50">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fbc02d]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
                </div>
                <span className="ml-3 text-xs text-text-secondary">sandbox — app/page.tsx</span>
              </div>
              <div className="p-4 space-y-2 font-mono text-[10px] leading-relaxed bg-[#0a0a0f] h-[calc(100%-40px)] overflow-hidden">
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="text-green-400">import</span>
                  <span>{`{ useState, useEffect }`}</span>
                  <span className="text-green-400">from</span>
                  <span className="text-amber-400">&ldquo;react&rdquo;</span>
                  <span>;</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="text-green-400">import</span>
                  <span>{`{ motion }`}</span>
                  <span className="text-green-400">from</span>
                  <span className="text-amber-400">&ldquo;framer-motion&rdquo;</span>
                  <span>;</span>
                </div>
                <div className="h-px bg-white/5 my-2" />
                <div>
                  <span className="text-blue-400">export</span>
                  <span className="text-blue-400"> default</span>
                  <span className="text-purple-400"> function</span>
                  <span className="text-amber-400"> DataTable</span>
                  <span>{`({ data, onSort }: Props)`}</span>
                  <span> {`{`}</span>
                </div>
                <div className="pl-4">
                  <span className="text-blue-400">const</span>
                  <span className="text-text-primary"> [sortConfig, setSortConfig]</span>
                  <span> = </span>
                  <span className="text-purple-400">useState</span>
                  <span>{`<SortConfig | null>(null)`}</span>
                </div>
                <div className="pl-4">
                  <span className="text-blue-400">const</span>
                  <span> sortedData = </span>
                  <span className="text-purple-400">useMemo</span>
                  <span>{`(() => {`}</span>
                </div>
                <div className="pl-8">
                  <span className="text-blue-400">if</span>
                  <span> (sortConfig === </span>
                  <span className="text-blue-400">null</span>
                  <span>) </span>
                  <span className="text-blue-400">return</span>
                  <span> data;</span>
                </div>
                <div className="pl-8">
                  <span className="text-blue-400">return</span>
                  <span> [...data].sort((a, b) </span>
                  <span className="text-purple-400">=&gt;</span>
                  <span> {`{`}</span>
                </div>
                <div className="pl-10">
                  <span className="text-blue-400">const</span>
                  <span> cmp = a[sortConfig.key] </span>
                  <span>{`&lt;`}</span>
                  <span> b[sortConfig.key] </span>
                  <span className="text-text-secondary">? -1 : 1;</span>
                </div>
                <div className="pl-10">
                  <span className="text-blue-400">return</span>
                  <span> sortConfig.direction === </span>
                  <span className="text-amber-400">&ldquo;asc&rdquo;</span>
                  <span> ? cmp : -cmp;</span>
                </div>
                <div className="pl-8">{`})`}, [data, sortConfig]);</div>
                <div className="h-px bg-white/5 my-2" />
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <span className="text-green-400">✓</span>
                  <span>TypeScript</span>
                  <span>•</span>
                  <span>No errors</span>
                  <span>•</span>
                  <span>2.1s</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-48 h-48 bg-accent/5 blur-[60px] rounded-full pointer-events-none" aria-hidden="true" />
          </motion.div>
        </div>
      </div>
    </SectionContainer>
  );
}
