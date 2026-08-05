"use client";

import { useState } from "react";
import { ArtifactBlock, BlockTypeDef } from "@/lib/modes/types";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlockStyleEditor } from "./block-style-editor";

interface PropertyEditorProps {
  block: ArtifactBlock;
  def: BlockTypeDef;
  onChange: (block: ArtifactBlock) => void;
}

const PRESET_COLORS = [
  "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1",
  "#3b82f6", "#06b6d4", "#10b981", "#84cc16", "#eab308",
  "#f59e0b", "#78716c", "#ffffff", "#a3a3a3", "#171717",
];

export function PropertyEditor({ block, def, onChange }: PropertyEditorProps) {
  const [styleOpen, setStyleOpen] = useState(false);

  const update = (key: string, value: unknown) => {
    onChange({ ...block, props: { ...block.props, [key]: value } });
  };

  const updateStyle = (style: import("@/lib/modes/types").BlockStyle) => {
    onChange({ ...block, style });
  };

  const moveItem = (key: string, index: number, dir: -1 | 1) => {
    const arr = Array.isArray(block.props[key]) ? [...(block.props[key] as string[])] : [];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    update(key, arr);
  };

  return (
    <div className="space-y-4">
      {def.properties.map((prop) => {
        const value = block.props[prop.key] ?? def.defaultProps[prop.key] ?? "";
        return (
          <div key={prop.key} className="space-y-1.5">
            <label className="text-xs font-medium text-white/60">{prop.label}</label>
            {prop.type === "textarea" && (
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 outline-none focus:border-primary/40 min-h-[72px] resize-y"
                value={String(value ?? "")}
                placeholder={prop.placeholder}
                onChange={(e) => update(prop.key, e.target.value)}
              />
            )}
            {prop.type === "text" && (
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 outline-none focus:border-primary/40"
                value={String(value ?? "")}
                placeholder={prop.placeholder}
                onChange={(e) => update(prop.key, e.target.value)}
              />
            )}
            {prop.type === "number" && (
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 outline-none focus:border-primary/40"
                value={Number(value ?? 0)}
                onChange={(e) => update(prop.key, Number(e.target.value))}
              />
            )}
            {prop.type === "select" && (
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 outline-none focus:border-primary/40"
                value={String(value ?? "")}
                onChange={(e) => update(prop.key, e.target.value)}
              >
                {(prop.options || []).map((opt) => (
                  <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
                ))}
              </select>
            )}
            {prop.type === "color" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-8 w-10 rounded border border-white/10 bg-transparent cursor-pointer"
                    value={String(value ?? "#ffffff")}
                    onChange={(e) => update(prop.key, e.target.value)}
                  />
                  <input
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40 font-mono"
                    value={String(value ?? "")}
                    onChange={(e) => update(prop.key, e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update(prop.key, c)}
                      className={cnPreset(c, value)}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            )}
            {prop.type === "list" && (
              <div className="space-y-1.5">
                {(Array.isArray(value) ? value : []).map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex flex-col">
                      <button type="button" disabled={i === 0} onClick={() => moveItem(prop.key, i, -1)} className="text-white/30 hover:text-white disabled:opacity-20 leading-none">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button type="button" disabled={i === (Array.isArray(value) ? value : []).length - 1} onClick={() => moveItem(prop.key, i, 1)} className="text-white/30 hover:text-white disabled:opacity-20 leading-none">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/90 outline-none focus:border-primary/40"
                      value={String(item ?? "")}
                      onChange={(e) => {
                        const arr = [...(Array.isArray(value) ? value : [])];
                        arr[i] = e.target.value;
                        update(prop.key, arr);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const arr = (Array.isArray(value) ? value : []).filter((_: string, idx: number) => idx !== i);
                        update(prop.key, arr);
                      }}
                      className="text-white/30 hover:text-red-400 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => update(prop.key, [...(Array.isArray(value) ? value : []), ""])}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  + Add
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Style & design section with expanded toggle */}
      <div className="pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setStyleOpen(!styleOpen)}
          className="flex w-full items-center justify-between px-1 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
        >
          <span>Style & design</span>
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", styleOpen && "rotate-90")} />
        </button>
        {styleOpen && (
          <div className="pt-1">
            <BlockStyleEditor style={block.style} onChange={updateStyle} />
          </div>
        )}
      </div>
    </div>
  );
}

function cnPreset(c: string, value: unknown): string {
  return `h-6 w-6 rounded-md border cursor-pointer transition-transform hover:scale-110 ${
    String(value ?? "") === c ? "ring-2 ring-primary" : "border-white/10"
  }`;
}
