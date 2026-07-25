"use client";

import { cn } from "@/lib/utils";
import { useMode, MODES } from "@/contexts/mode-context";
import { MessageCircle, Globe, Code2, FileText, Search, FileSpreadsheet } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  MessageCircle: <MessageCircle className="w-3.5 h-3.5" />,
  Globe: <Globe className="w-3.5 h-3.5" />,
  Code2: <Code2 className="w-3.5 h-3.5" />,
  FileText: <FileText className="w-3.5 h-3.5" />,
  Search: <Search className="w-3.5 h-3.5" />,
  FileSpreadsheet: <FileSpreadsheet className="w-3.5 h-3.5" />,
};

export function ModePills() {
  const { mode, setMode } = useMode();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
            mode === m.id
              ? "bg-primary/20 border-primary/40 text-white"
              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 hover:border-white/20"
          )}
        >
          {iconMap[m.icon]}
          {m.label}
        </button>
      ))}
    </div>
  );
}
