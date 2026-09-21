import { useEffect, useMemo, useState } from "react";

interface BuildTimerProps {
  isBuilding: boolean;
  className?: string;
}

export const BuildTimer = ({ isBuilding, className = "" }: BuildTimerProps) => {
  const [startTs] = useState<number>(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isBuilding) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startTs), 1000);
    return () => clearInterval(id);
  }, [isBuilding, startTs]);

  const formatElapsed = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60).toString();
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const progressPercent = useMemo(() => {
    if (!isBuilding) return 100;
    const approxMax = 8 * 60 * 1000; // 8 minutes
    return Math.min(99, Math.floor((elapsedMs / approxMax) * 100));
  }, [elapsedMs, isBuilding]);

  const getStatusText = () => {
    if (!isBuilding) return "Ready";
    if (elapsedMs < 30000) return "Starting..."; // First 30 seconds
    if (elapsedMs < 120000) return "Building..."; // 30s - 2min
    if (elapsedMs < 300000) return "Almost ready..."; // 2min - 5min
    return "Finalizing..."; // 5min+
  };

  const getProgressColor = () => {
    if (!isBuilding) return "text-green-400";
    if (elapsedMs < 120000) return "text-blue-400"; // First 2 minutes
    if (elapsedMs < 300000) return "text-yellow-400"; // 2-5 minutes
    return "text-orange-400"; // 5+ minutes
  };

  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Circular Progress */}
        <div className="relative w-7 h-7" aria-hidden>
          <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <circle 
              cx="18" 
              cy="18" 
              r="16" 
              fill="none" 
              stroke="currentColor" 
              className="text-text-disabled" 
              strokeWidth="3" 
            />
            {/* Progress circle */}
            <circle 
              cx="18" 
              cy="18" 
              r="16" 
              fill="none" 
              stroke="currentColor" 
              className={getProgressColor()}
              strokeWidth="3" 
              strokeDasharray={`${progressPercent}, 100`} 
              strokeLinecap="round"
              pathLength={100}
              style={{
                transition: 'stroke-dasharray 0.3s ease-in-out'
              }}
            />
          </svg>
        </div>

        {/* Status and Timer */}
        <div className="flex flex-col">
          <div className={`text-xs font-medium ${getProgressColor()}`}>
            {getStatusText()}
          </div>
          <div className="text-[10px] text-text-secondary font-mono">
            {formatElapsed(elapsedMs)} • 2–8 min typical
          </div>
        </div>
      </div>
    </div>
  );
};
