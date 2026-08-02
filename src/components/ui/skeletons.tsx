"use client";

import { cn } from "@/lib/utils";

export function ChatSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/5" />
            <div className="h-3 w-16 bg-white/5 rounded" />
          </div>
          <div className="h-12 w-48 bg-white/5 rounded-lg" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          <div className="flex items-center justify-end gap-2">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-8 w-8 rounded-full bg-white/10" />
          </div>
          <div className="h-12 w-40 bg-white/10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ProjectCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 space-y-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 bg-white/5 rounded" />
          <div className="h-3 w-1/2 bg-white/5 rounded" />
          <div className="flex items-center gap-2 mt-2">
            <div className="h-5 w-16 bg-white/5 rounded-full" />
            <div className="h-5 w-20 bg-white/5 rounded-full" />
          </div>
        </div>
        <div className="h-8 w-8 bg-white/5 rounded" />
      </div>
      <div className="pt-2 border-t border-border/50 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 bg-white/5 rounded" />
          <div className="h-3 w-3 bg-white/5 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 bg-white/5 rounded" />
          <div className="h-3 w-3 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ModeListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}
