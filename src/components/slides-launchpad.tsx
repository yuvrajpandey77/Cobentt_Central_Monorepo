"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles, Wand2, SlidersHorizontal, RotateCcw } from "lucide-react";
import { SLIDES_MODE } from "@/lib/modes/definitions";
import {
  DYNAMIC_SLIDE_THEMES,
  SLIDE_FONTS,
  SLIDE_BACKDROPS,
  buildSlidesSetupBlock,
  getSlideTheme,
  slideBackgroundStyle,
  type DynamicSlideTheme,
} from "@/lib/modes/slide-themes";
import { cn } from "@/lib/utils";

type Audience = "executives" | "customers" | "team" | "investors" | "classroom";
type Goal = "persuade" | "inform" | "excite";

const audiences: Array<{ id: Audience; label: string }> = [
  { id: "executives", label: "Executives" },
  { id: "customers", label: "Customers" },
  { id: "team", label: "Your team" },
  { id: "investors", label: "Investors" },
  { id: "classroom", label: "Classroom" },
];

const goals: Array<{ id: Goal; label: string; hint: string }> = [
  { id: "persuade", label: "Persuade", hint: "Drive a decision" },
  { id: "inform", label: "Inform", hint: "Transfer understanding" },
  { id: "excite", label: "Excite", hint: "Build energy" },
];

interface CustomThemeState {
  bg: string;
  bg2: string;
  accent: string;
  accent2: string;
  text: string;
  muted: string;
  backdrop: DynamicSlideTheme["backdrop"];
  fontHeading: string;
}

function themePreviewStyle(theme: DynamicSlideTheme): React.CSSProperties {
  return {
    ...slideBackgroundStyle(theme),
    fontFamily: `${theme.fontBody}, Inter, sans-serif`,
  };
}

export function SlidesLaunchpad({
  onCreate,
  initialTopic = "",
  compact = false,
}: {
  onCreate: (prompt: string, templateId: string) => void;
  initialTopic?: string;
  compact?: boolean;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [audience, setAudience] = useState<Audience>("executives");
  const [goal, setGoal] = useState<Goal>("persuade");
  const [useSourceImages, setUseSourceImages] = useState(false);
  const [slideCount, setSlideCount] = useState(10);
  const [selected, setSelected] = useState("pitch");
  const [showAll, setShowAll] = useState(false);
  const [useCustomTheme, setUseCustomTheme] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState<CustomThemeState>({
    bg: "#0b1220",
    bg2: "#1e1b4b",
    accent: "#38bdf8",
    accent2: "#a78bfa",
    text: "#f1f5f9",
    muted: "#94a3b8",
    backdrop: "mesh",
    fontHeading: "Sora",
  });

  const template = SLIDES_MODE.templates.find((item) => item.id === selected) ?? SLIDES_MODE.templates[0];
  const baseTheme = useMemo(
    () => DYNAMIC_SLIDE_THEMES.find((item) => item.id === template.theme) ?? DYNAMIC_SLIDE_THEMES[0],
    [template.theme]
  );

  // The effective theme: prebuilt visual system, or the user's custom build.
  const effectiveTheme: DynamicSlideTheme = useMemo(() => {
    if (!useCustomTheme) return baseTheme;
    return getSlideTheme(baseTheme.id, {
      label: "Custom",
      bg: custom.bg,
      bg2: custom.bg2,
      accent: custom.accent,
      accent2: custom.accent2,
      text: custom.text,
      muted: custom.muted,
      chip: custom.accent,
      fontHeading: custom.fontHeading,
      fontBody: "Inter",
      backdrop: custom.backdrop,
    });
  }, [useCustomTheme, baseTheme, custom]);

  const set = <K extends keyof CustomThemeState>(key: K, value: CustomThemeState[K]) =>
    setCustom((prev) => ({ ...prev, [key]: value }));

  const create = () => {
    const topicText = topic.trim();
    if (!topicText) return;
    const setup = buildSlidesSetupBlock({
      slideCount,
      goal,
      useSourceImages,
      themeId: effectiveTheme.id === baseTheme.id && !useCustomTheme ? baseTheme.id : baseTheme.id,
      themeConfig: useCustomTheme
        ? {
            id: "custom",
            label: "Custom",
            bg: custom.bg,
            bg2: custom.bg2,
            accent: custom.accent,
            accent2: custom.accent2,
            text: custom.text,
            muted: custom.muted,
            chip: custom.accent,
            fontHeading: custom.fontHeading,
            fontBody: "Inter",
            backdrop: custom.backdrop,
            dark: true,
            custom: true,
          }
        : undefined,
      audience,
    });
    onCreate(
      `${setup}\nCreate an EXACTLY ${slideCount}-slide presentation about: ${topicText}\n\nAudience: ${audiences.find((item) => item.id === audience)?.label}.\nPurpose: make the audience understand the core idea, care about it, and know what to do next.\nVisual direction: ${template.designDirection}\n\nUse a compelling narrative arc. Start with a strong hook, vary the slide layouts, use only concise presentation copy, and finish with a decisive closing slide.`,
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
          <h2 className="text-base font-semibold text-white">Design your deck before we build it</h2>
          <p className="mt-0.5 text-sm text-text-tertiary">
            Describe the idea, pick exactly how many slides you want, and choose a visual world — prebuilt or your own custom theme.
          </p>
        </div>
      </div>

      <textarea
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="What should this presentation make people believe or do? e.g. Seed pitch for a dev-tools startup raising $2M…"
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

          <p className="mb-2 mt-4 text-xs font-medium text-text-secondary">What should it do?</p>
          <div className="grid grid-cols-3 gap-2">
            {goals.map((item) => (
              <button key={item.id} type="button" onClick={() => setGoal(item.id)} className={cn("rounded-xl border px-2 py-2 text-left transition", goal === item.id ? "border-primary/50 bg-primary/15" : "border-white/10 bg-white/[0.02] hover:border-white/25")}>
                <span className="block text-xs font-medium text-white">{item.label}</span>
                <span className="mt-0.5 block text-[10px] text-text-muted">{item.hint}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setUseSourceImages((v) => !v)}
            className={cn("mt-4 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition", useSourceImages ? "border-primary/50 bg-primary/15" : "border-white/10 bg-white/[0.02] hover:border-white/25")}
          >
            <span>
              <span className="block text-xs font-medium text-white">Use my uploaded images</span>
              <span className="mt-0.5 block text-[10px] text-text-muted">Attached images become slide visuals</span>
            </span>
            <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", useSourceImages ? "bg-primary" : "bg-white/15")}>
              <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: useSourceImages ? 18 : 2 }} />
            </span>
          </button>

          <div className="mb-2 mt-5 flex items-center justify-between">
            <p className="text-xs font-medium text-text-secondary">How many slides?</p>
            <span className="rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
              {slideCount} pages
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={20}
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Number of slides"
          />
          <div className="mt-1 flex justify-between text-[10px] text-text-muted tabular-nums">
            <span>3</span><span>10</span><span>20</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { label: "Quick", count: 6, detail: "6 slides" },
              { label: "Story", count: 10, detail: "10 slides" },
              { label: "Deep dive", count: 16, detail: "16 slides" },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSlideCount(preset.count)}
                className={cn("rounded-xl border px-2 py-2 text-left transition", slideCount === preset.count ? "border-primary/50 bg-primary/15" : "border-white/10 bg-white/[0.02] hover:border-white/25")}
              >
                <span className="block text-xs font-medium text-white">{preset.label}</span>
                <span className="mt-0.5 block text-[10px] text-text-muted">{preset.detail}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live theme preview */}
        <div className="overflow-hidden rounded-2xl border border-white/10" style={themePreviewStyle(effectiveTheme)}>
          <div className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: effectiveTheme.muted }}>
              {useCustomTheme ? "Custom theme · live preview" : "Selected visual system"}
            </p>
            <p className="mt-6 text-2xl font-semibold leading-tight" style={{ color: effectiveTheme.text, fontFamily: `${effectiveTheme.fontHeading}, sans-serif` }}>
              {template.label}
            </p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed" style={{ color: effectiveTheme.muted }}>{template.description}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${effectiveTheme.accent}, ${effectiveTheme.accent2})` }} />
              <span className="text-[10px] tabular-nums" style={{ color: effectiveTheme.muted }}>{slideCount} slides · {effectiveTheme.fontHeading}</span>
            </div>
            {/* Mini slide mock */}
            <div className="mt-4 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${effectiveTheme.accent}33`, borderRadius: effectiveTheme.radius }}>
              <div className="h-2 w-2/3 rounded" style={{ background: effectiveTheme.text }} />
              <div className="mt-2 h-1.5 w-1/2 rounded" style={{ background: effectiveTheme.muted, opacity: 0.7 }} />
              <div className="mt-2 h-1.5 w-3/4 rounded" style={{ background: effectiveTheme.accent, opacity: 0.8 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-xs font-medium text-text-secondary">Choose a visual system</p>
          {!compact && (
            <button type="button" onClick={() => setShowAll((value) => !value)} className="text-xs text-primary hover:text-primary/80">{showAll ? "Show fewer" : `View all ${SLIDES_MODE.templates.length}`}</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {SLIDES_MODE.templates.slice(0, showAll || compact ? SLIDES_MODE.templates.length : 8).map((item) => {
            const swatch = DYNAMIC_SLIDE_THEMES.find((entry) => entry.id === item.theme) ?? DYNAMIC_SLIDE_THEMES[0];
            const active = item.id === selected;
            return (
              <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={cn("relative min-h-20 overflow-hidden rounded-xl border p-3 text-left transition hover:-translate-y-0.5", active ? "border-primary ring-1 ring-primary/70" : "border-white/10 hover:border-white/30")} style={{ ...slideBackgroundStyle(swatch) }}>
                {active && <Check className="absolute right-2 top-2 h-3.5 w-3.5" style={{ color: swatch.text }} />}
                <span className="block text-sm font-semibold" style={{ color: swatch.text, fontFamily: `${swatch.fontHeading}, sans-serif` }}>{item.label}</span>
                <span className="mt-1 block text-[10px] leading-snug" style={{ color: swatch.muted }}>{item.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom dynamic theme builder */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="inline-flex items-center gap-2 text-xs font-medium text-white">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            {useCustomTheme ? "Custom theme: ON — tune it below" : "Or build a custom dynamic theme"}
          </span>
          <span className="flex items-center gap-2">
            <span
              role="switch"
              aria-checked={useCustomTheme}
              onClick={(e) => { e.stopPropagation(); setUseCustomTheme((v) => !v); }}
              className={cn("relative h-5 w-9 rounded-full transition-colors", useCustomTheme ? "bg-primary" : "bg-white/15")}
            >
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", useCustomTheme ? "left-4.5 ml-0.5" : "left-0.5")} style={{ left: useCustomTheme ? 18 : 2 }} />
            </span>
            <span className="text-[11px] text-text-tertiary">{customOpen ? "Hide" : "Show"}</span>
          </span>
        </button>
        {customOpen && (
          <div className="grid gap-4 border-t border-white/10 p-4 sm:grid-cols-2">
            {([
              ["bg", "Background"],
              ["bg2", "Background deep"],
              ["accent", "Accent"],
              ["accent2", "Accent 2"],
              ["text", "Text"],
              ["muted", "Muted text"],
            ] as const).map(([key, label]) => (
              <label key={key} className="space-y-1.5">
                <span className="text-[11px] text-text-tertiary">{label}</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={custom[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="h-8 w-11 cursor-pointer rounded border border-white/10 bg-transparent"
                  />
                  <input
                    value={custom[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="h-8 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 font-mono text-xs text-white/90 outline-none focus:border-primary/40"
                  />
                </span>
              </label>
            ))}
            <label className="space-y-1.5">
              <span className="text-[11px] text-text-tertiary">Background style</span>
              <select value={custom.backdrop} onChange={(e) => set("backdrop", e.target.value as CustomThemeState["backdrop"])} className="h-8 w-full rounded-lg border border-white/10 bg-neutral-900 px-2 text-xs text-white/90 outline-none">
                {SLIDE_BACKDROPS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] text-text-tertiary">Heading font</span>
              <select value={custom.fontHeading} onChange={(e) => set("fontHeading", e.target.value)} className="h-8 w-full rounded-lg border border-white/10 bg-neutral-900 px-2 text-xs text-white/90 outline-none">
                {SLIDE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(true);
                  setUseCustomTheme(true);
                }}
                className="rounded-lg bg-primary/20 border border-primary/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/30"
              >
                Use this custom theme
              </button>
              <button
                type="button"
                onClick={() => setUseCustomTheme(false)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-text-tertiary hover:text-white"
              >
                <RotateCcw className="h-3 w-3" /> Back to prebuilt
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-[11px] text-text-muted">
          {slideCount} slides · {goal} · {useCustomTheme ? "Custom theme" : baseTheme.label} · {template.label} narrative
        </p>
        <button type="button" disabled={!topic.trim()} onClick={create} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
          <Wand2 className="h-4 w-4" /> Create the deck <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
