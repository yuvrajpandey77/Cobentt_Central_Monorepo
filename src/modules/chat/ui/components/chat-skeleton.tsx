"use client";

import { Skeleton } from "@/components/ui/skeleton";

export const ChatSkeleton = () => {
  return (
    <div className="flex-1 flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
      <div className="flex-1 px-4 py-6 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
            <div className={`space-y-2 ${i % 2 === 0 ? "" : "items-end"}`}>
              <Skeleton className={`h-4 ${i % 2 === 0 ? "w-48" : "w-32"}`} />
              <Skeleton className={`h-4 ${i % 2 === 0 ? "w-96" : "w-64"}`} />
              <Skeleton className={`h-4 ${i % 2 === 0 ? "w-72" : "w-48"}`} />
            </div>
            {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-border/20">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
};
