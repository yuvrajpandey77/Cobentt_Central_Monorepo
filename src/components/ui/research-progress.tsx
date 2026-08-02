"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function ResearchProgress({ currentPhase, progress, running, runningText }: {
  currentPhase?: string;
  progress?: number;
  running?: boolean;
  runningText?: string;
}) {
  const PHASES = ["Planning", "Searching", "Writing", "Summarizing", "Compiling", "Complete"];
  
  if (!running) return null;

  const phaseIndex = PHASES.indexOf(currentPhase || "");
  const isActive = phaseIndex >= 0 && phaseIndex < PHASES.length - 1;
  const isComplete = currentPhase === "Complete";

  const displayProgress = progress !== undefined ? progress : 0;
  const displayPhase = currentPhase || "";

  return (
    <div className="absolute inset-0 flex flex-col space-y-2 p-3 bg-black/30 backdrop-blur-md rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white/80 truncate max-w-[120px]">
          {isActive ? displayPhase : "Processing..."}
        </span>
        <span className="text-xs text-white/60 tabular-nums">
          {displayProgress}%
        </span>
      </div>

      <div className="flex-1 flex flex-col space-y-1.5 max-h-[80px] overflow-hidden">
        {PHASES.map((phase, i) => {
          const isActivePhase = isActive && i === phaseIndex;
          const isCompletedPhase = isComplete && (i < phaseIndex + 1 || i === PHASES.length - 1);
          
          return (
            <div key={phase} className="flex items-center gap-1.5">
              <div className={cn(
                "w-3 h-3 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0",
                isActivePhase 
                  ? "bg-violet-500/50 border border-violet-400/50" 
                  : isCompletedPhase
                    ? "bg-green-500/30 border border-green-400/30"
                    : "bg-white/10 border border-white/20"
              )}>
                {isActivePhase ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-300 animate-pulse" />
                ) : isCompletedPhase ? (
                  <svg className="w-1.5 h-1.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                )}
              </div>
              <span className={cn(
                "text-xs transition-colors duration-300 truncate",
                isActivePhase
                  ? "text-violet-300 font-medium"
                  : isCompletedPhase
                    ? "text-green-300/70"
                    : "text-white/40"
              )}
              >
                {phase}
              </span>
            </div>
          );
        })}
      </div>

      {running && displayProgress > 0 && displayProgress < 100 && (
        <div className="mt-1 pt-1 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-2.5 w-2.5 text-violet-400 animate-spin" />
            <span className="text-xs text-violet-300/70 truncate">
              {runningText || "Analyzing..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
