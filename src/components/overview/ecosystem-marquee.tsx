"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionContainer } from "@/components/overview/ui/section-container";

const providers = [
  "OpenAI", "Anthropic", "Google", "Meta", "DeepSeek",
  "Mistral", "Qwen", "Ollama", "OpenRouter", "Azure",
  "Groq", "Together AI", "Fireworks", "Perplexity",
];

export function EcosystemMarquee() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <SectionContainer className="py-16 lg:py-20 overflow-hidden">
      <div ref={ref} className="mx-auto max-w-[1440px] px-6 lg:px-10 mb-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-xs text-white/30 text-center font-medium tracking-wide uppercase"
        >
          Meridian supports every major model provider
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative"
      >
        <div className="flex gap-3 animate-marquee w-max px-4">
          {[...providers, ...providers].map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-white/5 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px] whitespace-nowrap hover:border-white/20 transition-colors duration-300"
            >
              <div className="w-6 h-6 rounded-tr-[5px] rounded-bl-[5px] rounded-tl-[3px] rounded-br-[3px] bg-white/10 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white/60">{name.charAt(0)}</span>
              </div>
              <span className="text-xs text-white/50">{name}</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bg-primary to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bg-primary to-transparent pointer-events-none" />
      </motion.div>
    </SectionContainer>
  );
}
