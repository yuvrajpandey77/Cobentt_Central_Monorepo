"use client";

import { useEffect, useRef, useState } from "react";

export function CursorFlower() {
  const [pos, setPos] = useState({ x: -999, y: -999 });
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [coarse, setCoarse] = useState(true);
  const [isLight, setIsLight] = useState(false);
  const raf = useRef<number | null>(null);
  const target = useRef({ x: -999, y: -999 });
  const lastSample = useRef(0);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const sampleBackground = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return;
    let node: HTMLElement | null = el;
    while (node) {
      const comp = getComputedStyle(node);
      if (comp.backgroundColor && comp.backgroundColor !== "rgba(0, 0, 0, 0)") {
        const m = comp.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m) {
          const r = parseInt(m[1], 10);
          const g = parseInt(m[2], 10);
          const b = parseInt(m[3], 10);
          const a = m[4] ? parseFloat(m[4]) : 1;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const isDarkBg = a < 0.15 || lum < 128;
          setIsLight(!isDarkBg);
          return;
        }
      }
      node = node.parentElement;
    }
    setIsLight(false);
  };

  useEffect(() => {
    if (coarse) return;

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
      if (Date.now() - lastSample.current > 60) {
        lastSample.current = Date.now();
        sampleBackground(e.clientX, e.clientY);
      }
      const t = e.target as HTMLElement | null;
      setHovering(!!t?.closest?.("a, button, [role='button'], textarea, input, select, [contenteditable='true']"));
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setVisible(false);

    const loop = () => {
      const t = target.current;
      setPos((p) => {
        const nx = p.x + (t.x - p.x) * 0.85;
        const ny = p.y + (t.y - p.y) * 0.85;
        return { x: Math.abs(nx - t.x) < 0.1 ? t.x : nx, y: Math.abs(ny - t.y) < 0.1 ? t.y : ny };
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [visible, coarse]);

  if (coarse) return null;

  const size = pressed ? 14 : hovering ? 20 : 18;
  const opacity = visible && pos.x > -50 ? 1 : 0;
  const fill = isLight ? "#1a2430" : "var(--primary, #a3c987)";
  const stroke = isLight ? "#ffffff" : "rgba(0,0,0,0.25)";

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{ left: pos.x, top: pos.y, opacity, transition: "opacity 0.2s" }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 4l7.1 15.6 2.2-7.5L21 10l-17-6z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}