"use client";

import { cn } from "@/lib/utils";
import { useMode } from "@/contexts/mode-context";
import { MODE_DEFINITIONS, RESEARCH_MODE } from "@/lib/modes/definitions";
import { LayoutTemplate } from "lucide-react";

export function TemplatePicker({ mode }: { mode: string }) {
  const { templateId, setTemplateId } = useMode();
  const def = mode === "deep-research" ? RESEARCH_MODE : MODE_DEFINITIONS[mode];
  if (!def || !def.templates?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium flex items-center gap-1.5">
        <LayoutTemplate className="h-3 w-3" /> Start from a template
      </p>
      <div className="flex flex-wrap gap-2">
        {def.templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTemplateId(templateId === t.id ? "" : t.id)}
            title={t.description}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
              templateId === t.id
                ? "bg-primary/20 border-primary/40 text-white"
                : "bg-white/5 border-white/10 text-text-tertiary hover:bg-white/10 hover:text-text-secondary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
