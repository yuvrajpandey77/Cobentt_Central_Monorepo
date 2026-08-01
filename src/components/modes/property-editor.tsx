"use client";

import { ArtifactBlock, BlockTypeDef } from "@/lib/modes/types";

interface PropertyEditorProps {
  block: ArtifactBlock;
  def: BlockTypeDef;
  onChange: (block: ArtifactBlock) => void;
}

export function PropertyEditor({ block, def, onChange }: PropertyEditorProps) {
  const update = (key: string, value: unknown) => {
    onChange({ ...block, props: { ...block.props, [key]: value } });
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
            {prop.type === "list" && (
              <div className="space-y-1.5">
                {(Array.isArray(value) ? value : []).map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
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
    </div>
  );
}
