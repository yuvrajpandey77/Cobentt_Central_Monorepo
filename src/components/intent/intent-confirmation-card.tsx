"use client";

import { useEffect, useRef, useState } from "react";
import { Presentation, FileText, Table, BarChart3, Globe, Search, X, Check } from "lucide-react";
import type { IntentResult } from "@/lib/intent/types";

const ICONS: Record<string, React.ReactNode> = {
  slides: <Presentation className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  sheet: <Table className="w-4 h-4" />,
  data_analysis: <BarChart3 className="w-4 h-4" />,
  web_search: <Globe className="w-4 h-4" />,
  deep_research: <Search className="w-4 h-4" />,
};

function primaryArtifact(result: IntentResult): string {
  const order = ["slides", "document", "sheet", "data_analysis", "deep_research", "web_search"] as const;
  for (const o of order) if (result.capabilities.includes(o as never)) return o;
  return result.capabilities[0] ?? "chat";
}

const LABELS: Record<string, string> = {
  slides: "Presentation detected",
  document: "Document detected",
  sheet: "Spreadsheet detected",
  data_analysis: "Data analysis detected",
  deep_research: "Deep research detected",
  web_search: "Web research detected",
};

const ACTIONS: Record<string, string> = {
  slides: "Use Presentations",
  document: "Use Documents",
  sheet: "Use Sheets",
  data_analysis: "Analyze data",
  deep_research: "Use Deep Research",
  web_search: "Search the web",
};

interface Props {
  result: IntentResult;
  telemetryId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Smart confirmation card — small, near-composer, non-modal, non-blocking.
 * - High confidence + auto_after_ms: 3s countdown, then onConfirm.
 * - Medium: waits indefinitely for the user.
 * - Respects prefers-reduced-motion (no animated countdown bar).
 * - Esc cancels, Enter confirms.
 */
export function IntentConfirmationCard({ result, telemetryId, onConfirm, onCancel }: Props) {
  const key = primaryArtifact(result);
  const autoMs = result.auto_after_ms ?? 0;
  const [remaining, setRemaining] = useState(autoMs);
  const doneRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    doneRef.current = false;
    setRemaining(autoMs);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
    if (autoMs > 0) {
      const started = Date.now();
      intervalRef.current = window.setInterval(() => {
        setRemaining(Math.max(0, autoMs - (Date.now() - started)));
      }, 100);
      timeoutRef.current = window.setTimeout(() => {
        if (!doneRef.current) { doneRef.current = true; void report("auto"); onConfirm(); }
      }, autoMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMs, result.reason]);

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const report = async (decision: "confirmed" | "cancelled" | "auto") => {
    if (!telemetryId) return;
    try {
      await fetch("/api/intent/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telemetryId, userDecision: decision }),
      });
    } catch { /* telemetry never blocks UX */ }
  };

  const confirm = () => { if (doneRef.current) return; doneRef.current = true; void report("confirmed"); onConfirm(); };
  const cancel = () => { if (doneRef.current) return; doneRef.current = true; void report("cancelled"); onCancel(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = autoMs > 0 ? Math.max(0, Math.min(1, remaining / autoMs)) : 0;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={LABELS[key] ?? "Capability detected"}
      className="mx-auto mb-2 w-full max-w-[810px] rounded-2xl border border-white/15 bg-black/80 backdrop-blur-lg shadow-xl px-3.5 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
        {ICONS[key] ?? <Check className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white leading-tight">{LABELS[key] ?? "Capability detected"}</p>
        <p className="text-[12px] text-white/60 truncate" title={result.reason}>{result.reason}</p>
        {autoMs > 0 && (
          <p className="text-[11px] text-white/50 mt-0.5" aria-label={`${Math.ceil(remaining / 1000)} seconds until automatic action`}>
            Using {ACTIONS[key]?.replace("Use ", "") ?? key} automatically in {Math.ceil(remaining / 1000)}s…
          </p>
        )}
        {autoMs > 0 && (
          <div className="h-0.5 mt-1.5 rounded-full bg-white/10 overflow-hidden motion-reduce:hidden" aria-hidden>
            <div className="h-full bg-white/70 transition-[width] duration-100" style={{ width: `${pct * 100}%` }} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={confirm}
          className="px-3 py-1.5 rounded-full bg-white text-black text-[12px] font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />{autoMs > 0 ? ACTIONS[key] ?? "Confirm" : "Yes"}
        </button>
        <button
          onClick={cancel}
          className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-[12px] hover:bg-white/20 transition-colors flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />Keep chat
        </button>
      </div>
    </div>
  );
}
