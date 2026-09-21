"use client";

import { BlockStyle } from "@/lib/modes/types";
import { cn } from "@/lib/utils";

const FONTS = [
  "Inter",
  "Georgia",
  "Times New Roman",
  "Arial",
  "Helvetica",
  "Courier New",
  "monospace",
];

const WEIGHTS = ["300", "400", "500", "600", "700", "800", "900"];

const COLOR_PRESETS = [
  "#ffffff", "#f8fafc", "#e2e8f0", "#94a3b8", "#475569", "#0f172a",
  "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
];

const BG_PRESETS = [
  "#0b1220", "#1e1b4b", "#022c22", "#2a0a1a", "#082f49", "#171717", "#ffffff", "#f4f4f5",
];

const ALIGN: { value: "left" | "center" | "right"; label: string }[] = [
  { value: "left", label: "⇤" },
  { value: "center", label: "⇹" },
  { value: "right", label: "⇥" },
];

interface BlockStyleEditorProps {
  style: BlockStyle | undefined;
  onChange: (style: BlockStyle) => void;
}

function set<K extends keyof BlockStyle>(style: BlockStyle | undefined, key: K, value: BlockStyle[K]): BlockStyle {
  return { ...(style || {}), [key]: value };
}

export function BlockStyleEditor({ style, onChange }: BlockStyleEditorProps) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Style & Design</p>

      <div className="space-y-1.5">
        <label className="text-[11px] text-text-tertiary">Font family</label>
        <select
          value={style?.fontFamily ?? "Inter"}
          onChange={(e) => onChange(set(style, "fontFamily", e.target.value))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40"
        >
          {FONTS.map((f) => <option key={f} value={f} className="bg-neutral-900">{f}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[11px] text-text-tertiary">Font size</label>
          <input
            type="number"
            min={8}
            max={96}
            value={style?.fontSize ?? 16}
            onChange={(e) => onChange(set(style, "fontSize", Number(e.target.value)))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] text-text-tertiary">Weight</label>
          <select
            value={style?.fontWeight ?? "400"}
            onChange={(e) => onChange(set(style, "fontWeight", e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40"
          >
            {WEIGHTS.map((w) => <option key={w} value={w} className="bg-neutral-900">{w}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[11px] text-text-tertiary">Line height</label>
          <input
            type="number"
            step={0.1}
            min={0.5}
            max={3}
            value={style?.lineHeight ?? 1.6}
            onChange={(e) => onChange(set(style, "lineHeight", Number(e.target.value)))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] text-text-tertiary">Letter spacing</label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={style?.letterSpacing ?? 0}
            onChange={(e) => onChange(set(style, "letterSpacing", Number(e.target.value)))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40"
          />
        </div>
      </div>

      <div className="pt-1 border-t border-white/10" />

      <div className="space-y-1.5">
        <label className="text-[11px] text-text-tertiary">Align</label>
        <div className="flex gap-1">
          {ALIGN.map((a) => (
            <button
              key={a.value}
              onClick={() => onChange(set(style, "textAlign", a.value))}
              className={cn(
                "flex-1 h-7 rounded-md border transition-colors text-xs",
                style?.textAlign === a.value
                  ? "bg-primary/20 border-primary/40 text-white"
                  : "border-white/10 text-text-tertiary hover:text-text-secondary"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] text-text-tertiary">Text color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={style?.color ?? "#ffffff"}
            onChange={(e) => onChange(set(style, "color", e.target.value))}
            className="h-7 w-10 rounded border border-white/10 bg-transparent cursor-pointer"
          />
          <input
            value={style?.color ?? ""}
            onChange={(e) => onChange(set(style, "color", e.target.value))}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40 font-mono"
            placeholder="#ffffff"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(set(style, "color", c))}
              style={{ background: c }}
              className={cn("h-5 w-5 rounded-md border cursor-pointer transition-transform hover:scale-110", style?.color === c ? "ring-2 ring-primary" : "border-white/10")}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] text-text-tertiary">Background</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={style?.backgroundColor ?? "#0b1220"}
            onChange={(e) => onChange(set(style, "backgroundColor", e.target.value))}
            className="h-7 w-10 rounded border border-white/10 bg-transparent cursor-pointer"
          />
          <input
            value={style?.backgroundColor ?? ""}
            onChange={(e) => onChange(set(style, "backgroundColor", e.target.value))}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40 font-mono"
            placeholder="#0b1220"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BG_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(set(style, "backgroundColor", c))}
              style={{ background: c }}
              className={cn("h-5 w-5 rounded-md border cursor-pointer transition-transform hover:scale-110", style?.backgroundColor === c ? "ring-2 ring-primary" : "border-white/10")}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] text-text-tertiary">Decorative</label>
        <div className="flex gap-1.5">
          <button
            onClick={() => onChange(set(style, "border", !style?.border))}
            className={cn(
              "flex-1 h-7 rounded-md border transition-colors text-xs",
              style?.border
                ? "bg-primary/20 border-primary/40 text-white"
                : "border-white/10 text-text-tertiary hover:text-text-secondary bg-white/[0.03]"
            )}
          >
            Border
          </button>
          <button
            onClick={() => onChange(set(style, "shadow", !style?.shadow))}
            className={cn(
              "flex-1 h-7 rounded-md border transition-colors text-xs",
              style?.shadow
                ? "bg-primary/20 border-primary/40 text-white"
                : "border-white/10 text-text-tertiary hover:text-text-secondary bg-white/[0.03]"
            )}
          >
            Shadow
          </button>
        </div>
      </div>
    </div>
  );
}
