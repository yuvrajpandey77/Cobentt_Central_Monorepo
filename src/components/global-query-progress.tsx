"use client";

import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

export default function GlobalQueryProgress() {
  const isFetching = useIsFetching();
  const barRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hasShownRef = useRef(false);

  const [routePending, setRoutePending] = useState(false);

  useEffect(() => {
    const onStart = () => setRoutePending(true);
    const onDone = () => setRoutePending(false);
    window.addEventListener("routeProgress:start", onStart as EventListener);
    window.addEventListener("routeProgress:done", onDone as EventListener);
    return () => {
      window.removeEventListener("routeProgress:start", onStart as EventListener);
      window.removeEventListener("routeProgress:done", onDone as EventListener);
    };
  }, []);

  // Reset single-show guard on route change
  useEffect(() => {
    hasShownRef.current = false;
  }, [pathname]);

  useEffect(() => {
    const bar = barRef.current;
    const wrap = visibleRef.current;
    if (!bar || !wrap) return;

    const showAfterMs = 300; // debounce before showing to avoid flicker on quick fetches
    const minVisibleMs = 300; // keep visible for at least this time when shown
    let showTimer: number | null = null;
    let hideTimer: number | null = null;
    let becameVisibleAt = 0;

    const show = () => {
      if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = null; }
      wrap.style.opacity = "1";
      becameVisibleAt = Date.now();
      bar.style.transform = "scaleX(0.1)";
      bar.style.transition = "transform 200ms ease-out";
      requestAnimationFrame(() => {
        bar.style.transform = "scaleX(0.9)";
        bar.style.transition = "transform 1200ms ease";
      });
    };

    const hide = () => {
      const elapsed = Date.now() - becameVisibleAt;
      const delay = Math.max(minVisibleMs - elapsed, 0);
      hideTimer = window.setTimeout(() => {
        bar.style.transform = "scaleX(1)";
        bar.style.transition = "transform 200ms ease-out";
        const t2 = window.setTimeout(() => {
          wrap.style.opacity = "0";
          bar.style.transform = "scaleX(0)";
          bar.style.transition = "none";
        }, 220);
        hideTimer = t2;
      }, delay);
    };

    const isProjectRoute = typeof pathname === "string" && pathname.startsWith("/projects/");

    if (isFetching > 0 || routePending) {
      // If we're on a project page, only show once per route visit
      if (isProjectRoute && hasShownRef.current) {
        return () => {};
      }
      // debounce showing
      if (!showTimer) {
        showTimer = window.setTimeout(() => {
          show();
          if (isProjectRoute) hasShownRef.current = true;
        }, showAfterMs);
      }
    } else {
      if (showTimer) { window.clearTimeout(showTimer); showTimer = null; }
      if (wrap.style.opacity === "1") hide();
    }

    return () => {
      if (showTimer) window.clearTimeout(showTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [isFetching]);

  return (
    <div
      ref={visibleRef}
      style={{ opacity: 0 }}
      className="pointer-events-none fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent"
      aria-hidden
    >
      <div
        ref={barRef}
        style={{ transform: "scaleX(0)", transformOrigin: "0 0" }}
        className="h-full bg-white/70"
      />
    </div>
  );
}


