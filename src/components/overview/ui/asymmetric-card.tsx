"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type CornerVariant = "default" | "inverted" | "alternate";

interface AsymmetricCardProps extends HTMLAttributes<HTMLDivElement> {
  corner?: CornerVariant;
  glow?: boolean;
  interactive?: boolean;
}

const cornerStyles: Record<CornerVariant, string> = {
  default: "rounded-tl-[40px] rounded-tr-[12px] rounded-br-[40px] rounded-bl-[12px]",
  inverted: "rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px]",
  alternate: "rounded-tl-[40px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[40px]",
};

export const AsymmetricCard = forwardRef<HTMLDivElement, AsymmetricCardProps>(
  ({ corner = "default", glow, interactive, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative bg-bg-card border border-border overflow-hidden",
          cornerStyles[corner],
          interactive && "transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5 cursor-pointer",
          className
        )}
        {...props}
      >
        {glow && (
          <div
            className="absolute -inset-px rounded-inherit opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute inset-0 rounded-inherit bg-gradient-to-b from-accent/10 to-transparent blur-xl" />
          </div>
        )}
        {children}
      </div>
    );
  }
);

AsymmetricCard.displayName = "AsymmetricCard";
