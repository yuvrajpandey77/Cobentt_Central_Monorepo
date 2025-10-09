"use client";

import { useState } from "react";

interface Props {
  pagePath: string;
  alignment?: "row" | "col";
}

export default function FeedbackButtons({ pagePath, alignment = "row" }: Props) {
  const [submitted, setSubmitted] = useState<"up" | "neutral" | "down" | null>(null);
  const send = async (value: "up" | "neutral" | "down") => {
    setSubmitted(value);
    try {
      await fetch("/api/docs/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagePath, value }),
      });
    } catch {
      // ignore network errors for UX
    }
  };
  const base = "h-8 w-8 rounded-md border hover:bg-white/10";
  const wrap = alignment === "row" ? "flex items-center gap-2" : "flex flex-col gap-2";
  return (
    <div className={wrap}>
      <button className={`${base} ${submitted === "up" ? "bg-white/10" : ""}`} onClick={() => send("up")} aria-label="Helpful">🙂</button>
      <button className={`${base} ${submitted === "neutral" ? "bg-white/10" : ""}`} onClick={() => send("neutral")} aria-label="Neutral">😐</button>
      <button className={`${base} ${submitted === "down" ? "bg-white/10" : ""}`} onClick={() => send("down")} aria-label="Not helpful">🙁</button>
    </div>
  );
}


