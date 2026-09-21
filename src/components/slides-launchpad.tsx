"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles, Wand2 } from "lucide-react";
import { SLIDES_MODE, SLIDE_THEMES } from "@/lib/modes/definitions";
import { cn } from "@/lib/utils";

type Audience = "executives" | "customers" | "team" | "investors" | "classroom";
type Length = "short" | "standard" | "detailed";

const audiences: Array<{ id: Audience; label: string }> = [
  { id: "executives", label: "Executives" },
  { id: "customers", label: "Customers" },
  { id: "team", label: "Your team" },
  { id: "investors", label: "Investors" },
  { id: "classroom", label: "Classroom" },
];

const lengths: Array<{ id: Length; label: string; detail: string }> = [
  { id: "short", label: "Quick", detail: "6–8 slides" },
  { id: "standard", label: "Story", detail: "10–12 slides" },
  { id: "detailed", label: "Deep dive", detail: "14–16 slides" },
];

export function SlidesLaunchpad({ onCreate }: { onCreate: (prompt: string, templateId: string) => void }) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState<Audience>("executives");
  const [length, setLength] = useState<Length>("standard");
  const [selected, setSelected] = useState("pitch");
  const [showAll, setShowAll] = useState(false);
  const template = SLIDES_MODE.templates.find((item) => item.id === selected) ?? SLIDES_MODE.templates[0];
  const theme = useMemo(
    () => SLIDE_THEMES.find((item) => item.id === template.theme) ?? SLIDE_THEMES[0],
    [template.theme]
  );

  const create = () => {
    const topicText = topic.trim();
    if (!topicText) return;
    const slideCount = length === "short" ? "6 to 8" : length === "detailed" ? "14 to 16" : "10 to 12";
    onCreate(
      `Create a ${slideCount}-slide presentation about: ${topicText}\n\nAudience: ${audiences.find((item) => item.id === audience)?.label}.\nPurpose: make the audience understand the core idea, care about it, and know what to do next.\nVisual direction: ${template.designDirection}\n\nUse a compelling narrative arc. Start with a strong hook, vary the slide layouts, use only concise presentation copy, and finish with a decisive closing slide.`,
      template.id
    );
  };

  return (
    <section className="w-full max-w-4xl rounded-[28px] border border-white/10 bg-[#0b0d12]/85 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Build a deck with a point of view</h2>
          <p className="mt-0.5 text-sm text-text-tertiary">Give Cobentt the idea and audience. Pick a visual world. You can edit every slide after generation.</p>
        </div>
      </div>

      <textarea
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="What should this presentation make people believe or do?"
        className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-text-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="mb-2 text-xs font-medium text-text-secondary">Who is this for?</p>
          <div className="flex flex-wrap gap-2">
            {audiences.map((item) => (
              <button key={item.id} type="button" onClick={() => setAudience(item.id)} className={cn("rounded-full border px-3 py-1.5 text-xs transition", audience === item.id ? "border-primary/50 bg-primary/20 text-white" : "border-white/10 text-text-tertiary hover:border-white/25 hover:text-white")}>
                {item.label}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-5 text-xs font-medium text-text-secondary">How much room do we have?</p>
          <div className="grid grid-cols-3 gap-2">
            {lengths.map((item) => (
              <button key={item.id} type="button" onClick={() => setLength(item.id)} className={cn("rounded-xl border px-2 py-2 text-left transition", length === item.id ? "border-primary/50 bg-primary/15" : "border-white/10 bg-white/[0.02] hover:border-white/25")}>
                <span className="block text-xs font-medium text-white">{item.label}</span>
                <span className="mt-0.5 block text-[10px] text-text-muted">{item.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 p-3" style={{ background: `linear-gradient(135deg, ${theme.bg}, ${theme.chip})` }}>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: theme.muted }}>Selected visual system</p>
          <p className="mt-5 text-2xl font-semibold leading-tight" style={{ color: theme.text }}>{template.label}</p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed" style={{ color: theme.muted }}>{template.description}</p>
          <div className="mt-6 h-1.5 w-20 rounded-full" style={{ background: theme.accent }} />
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-xs font-medium text-text-secondary">Choose a visual system</p>
          <button type="button" onClick={() => setShowAll((value) => !value)} className="text-xs text-primary hover:text-primary/80">{showAll ? "Show fewer" : "View all 12"}</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {SLIDES_MODE.templates.slice(0, showAll ? 12 : 8).map((item) => {
            const swatch = SLIDE_THEMES.find((entry) => entry.id === item.theme) ?? SLIDE_THEMES[0];
            const active = item.id === selected;
            return (
              <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={cn("relative min-h-20 overflow-hidden rounded-xl border p-3 text-left transition hover:-translate-y-0.5", active ? "border-primary ring-1 ring-primary/70" : "border-white/10 hover:border-white/30")} style={{ background: `radial-gradient(circle at 80% 15%, ${swatch.accent}88, transparent 42%), linear-gradient(135deg, ${swatch.bg}, ${swatch.chip})` }}>
                {active && <Check className="absolute right-2 top-2 h-3.5 w-3.5" style={{ color: swatch.text }} />}
                <span className="block text-sm font-semibold" style={{ color: swatch.text }}>{item.label}</span>
                <span className="mt-1 block text-[10px] leading-snug" style={{ color: swatch.muted }}>{item.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" disabled={!topic.trim()} onClick={create} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
          <Wand2 className="h-4 w-4" /> Create the deck <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
