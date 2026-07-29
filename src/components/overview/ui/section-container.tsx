"use client";

import { type HTMLAttributes, forwardRef, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionContainerProps extends HTMLAttributes<HTMLDivElement> {
  animate?: boolean;
  delay?: number;
  id?: string;
  parallax?: number;
}

export const SectionContainer = forwardRef<HTMLDivElement, SectionContainerProps>(
  ({ animate = true, delay = 0, id, parallax, className, children, ...props }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);
    const resolvedRef = (ref || localRef) as React.RefObject<HTMLDivElement | null>;
    const isInView = useInView(resolvedRef, { once: true, margin: "-120px" });

    const { scrollYProgress } = useScroll({
      target: resolvedRef,
      offset: ["start end", "end start"],
    });
    const parallaxY = useTransform(scrollYProgress, [0, 1], [parallax || 0, -(parallax || 0)]);

    return (
      <div
        ref={resolvedRef}
        id={id}
        className={cn("w-full", className)}
        {...props}
      >
        {animate ? (
          <motion.div
            style={parallax ? { y: parallaxY } : undefined}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {children}
          </motion.div>
        ) : (
          children
        )}
      </div>
    );
  }
);

SectionContainer.displayName = "SectionContainer";
