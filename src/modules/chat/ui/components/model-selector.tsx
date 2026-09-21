"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Zap, Brain, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODELS, TIER_LABELS, getModelById } from "@/lib/models";

const tierIcons: Record<string, React.ReactNode> = {
  fast: <Zap className="h-3.5 w-3.5" />,
  balanced: <Sparkles className="h-3.5 w-3.5" />,
  powerful: <Brain className="h-3.5 w-3.5" />,
  code: <Code2 className="h-3.5 w-3.5" />,
};

interface ModelSelectorProps {
  currentModel: string;
  onChange: (model: string) => void;
}

export const ModelSelector = ({ currentModel, onChange }: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = getModelById(currentModel);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tiers = ["fast", "balanced", "powerful", "code"] as const;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200",
          "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-text-secondary hover:text-white/80"
        )}
      >
        {current && (
          <span className="flex items-center gap-1">
            {tierIcons[current.tier]}
            <span className="max-w-[100px] truncate">{current.label}</span>
          </span>
        )}
        {!current && <span>Select model</span>}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-white/15 bg-black/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto thin-scrollbar p-2 space-y-1">
            {tiers.map((tier) => {
              const tierModels = MODELS.filter((m) => m.tier === tier);
              if (tierModels.length === 0) return null;
              return (
                <div key={tier}>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                    {tierIcons[tier]}
                    {TIER_LABELS[tier]}
                  </div>
                  {tierModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onChange(model.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all duration-150",
                        model.id === currentModel
                          ? "bg-primary/20 text-white border border-primary/30"
                          : "text-text-secondary hover:bg-white/10 hover:text-white border border-transparent"
                      )}
                    >
                      <div className="font-medium">{model.label}</div>
                      <div className="text-[10px] text-text-tertiary mt-0.5">
                        {model.description} &middot; {Math.round(model.context / 1000)}K context
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
