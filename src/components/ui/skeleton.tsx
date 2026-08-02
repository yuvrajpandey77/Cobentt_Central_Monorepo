"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
  animate?: boolean;
}

export function Skeleton({ className, width, height, rounded = "md", animate = true, ...props }: SkeletonProps) {
  const roundedClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
    tl: "rounded-tl-2xl",
    tr: "rounded-tr-2xl",
    br: "rounded-br-2xl",
    bl: "rounded-bl-2xl",
  }[rounded];

  return (
    <div
      className={cn(
        "bg-white/5 animate-pulse",
        animate && "relative overflow-hidden",
        animate && "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        roundedClass,
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
}

interface DocumentSkeletonProps {
  className?: string;
}

export function DocumentSkeleton({ className }: DocumentSkeletonProps) {
  return (
    <div className={cn("max-w-3xl mx-auto py-8 px-6", className)}>
      <div className="shadow-2xl px-10 py-12 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-1/3" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t space-y-4">
          <Skeleton className="h-5 w-1/4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResearchSectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("py-20 lg:py-32", className)}>
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <Skeleton className="h-8 w-32 rounded-tr-lg rounded-bl-lg" />
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-tr-2xl rounded-bl-2xl rounded-tl-lg rounded-br-lg" />
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] w-full bg-bg-card border border-border rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px] overflow-hidden shadow-2xl shadow-accent/5">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-bg-secondary/50">
                <div className="flex gap-1.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="w-2.5 h-2.5 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-3 w-32 ml-3" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-3.5 h-3.5 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-16 rounded-tr-2xl rounded-bl-2xl rounded-tl-base rounded-br-base" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-2.5 w-full" />
                  ))}
                </div>
                <div className="p-3 bg-bg-secondary/30 border border-border/40 rounded-tr-2xl rounded-bl-2xl rounded-tl-2xl rounded-br-2xl">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-2/3 mt-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
