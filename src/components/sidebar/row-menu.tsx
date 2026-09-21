"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface RowMenuProps {
  trigger: ReactNode;
  onToggle?: (open: boolean) => void;
  children: (close: () => void) => ReactNode;
  width?: number;
}

export function RowMenu({ trigger, onToggle, children, width = 168 }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // onToggle is a parent callback — keep it in a ref so the effect below
  // doesn't re-run (and re-position) when the parent re-renders.
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  useEffect(() => {
    if (!open) return;

    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const place = () => {
      const rect = btn.getBoundingClientRect();
      const menuH = menu.offsetHeight;
      const menuW = menu.offsetWidth;
      const gap = 6;
      const margin = 8;

      let top = rect.bottom + gap;
      if (top + menuH > window.innerHeight - margin) {
        top = rect.top - gap - menuH;
      }
      top = Math.max(margin, top);

      let left = rect.right - menuW;
      left = Math.max(margin, Math.min(left, window.innerWidth - menuW - margin));
      // Only store when the position actually changed — setPos with a fresh
      // object on every scroll/resize would re-render endlessly.
      setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.contains(t) && !menu.contains(t)) {
        setOpen(false);
        onToggleRef.current?.(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onToggleRef.current?.(false);
      }
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
    // NOTE: intentionally only [open] — pos is *written* by this effect, so
    // listing it here re-ran place() → setPos() forever (max update depth).
  }, [open]);

  const close = () => {
    setOpen(false);
    setPos(null);
    onToggleRef.current?.(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = !open;
          setOpen(next);
          if (!next) setPos(null);
          onToggleRef.current?.(next);
        }}
        aria-label="More actions"
        aria-expanded={open}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-150"
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9998] w-[168px] bg-card/95 backdrop-blur-xl border border-border/30 rounded-lg py-1 shadow-2xl"
            style={{
              width,
              top: pos?.top ?? -9999,
              left: pos ? pos.left : -9999,
              visibility: pos ? "visible" : "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children(close)}
          </div>,
          document.body
        )}
    </>
  );
}
