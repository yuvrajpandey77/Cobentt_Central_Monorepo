"use client";

import { useEffect, useRef, useState } from "react";
import { ArtifactBlock, BlockStyle } from "@/lib/modes/types";
import { getSlideTheme, type DynamicSlideTheme } from "@/lib/modes/slide-themes";
import { SlideChart, parseValues } from "./charts";
import { SlideDiagram, type DiagramEdge, type DiagramNode } from "./diagrams";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export function styleToAttr(style?: BlockStyle): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (!style) return s;
  if (style.fontFamily) s.fontFamily = style.fontFamily;
  if (style.fontSize) s.fontSize = style.fontSize;
  if (style.fontWeight) s.fontWeight = style.fontWeight;
  if (style.color) s.color = style.color;
  if (style.backgroundColor) s.backgroundColor = style.backgroundColor;
  if (style.textAlign) s.textAlign = style.textAlign;
  if (style.lineHeight) s.lineHeight = style.lineHeight;
  if (style.letterSpacing !== undefined) s.letterSpacing = style.letterSpacing;
  if (style.padding) s.padding = style.padding;
  if (style.borderRadius) s.borderRadius = style.borderRadius;
  if (style.border) s.border = "1px solid rgba(255,255,255,0.25)";
  if (style.offsetX || style.offsetY) {
    s.transform = `translate(${style.offsetX ?? 0}px, ${style.offsetY ?? 0}px)`;
  }
  return s;
}

export interface SlideTheme {
  bg: string;
  accent: string;
  text: string;
  muted: string;
  chip: string;
  bg2?: string;
  accent2?: string;
  fontHeading?: string;
  fontBody?: string;
  backdrop?: string;
  radius?: number;
}

const STATIC_THEME: SlideTheme = { bg: "#0b1220", accent: "#38bdf8", text: "#f1f5f9", muted: "#94a3b8", chip: "#0ea5e9" };

// Resolve a text color honoring the per-block style first, then the theme default.
function textColor(style?: BlockStyle, theme?: SlideTheme, fallback?: string): string {
  if (style?.color) return style.color;
  return fallback || theme?.text || "#ffffff";
}

function fontSizeOf(style?: BlockStyle): number | undefined {
  const n = style?.fontSize;
  if (typeof n === "number") return n;
  if (typeof n === "string" && /^\d+$/.test(n)) return parseInt(n, 10);
  return undefined;
}

type EditHandler = (block: ArtifactBlock) => void;

function editProp(onEdit: EditHandler | undefined, block: ArtifactBlock, key: string, value: string) {
  onEdit?.({ ...block, props: { ...block.props, [key]: value } });
}

// Inline click-to-edit text element. When `editable` is true the text becomes
// contentEditable and commits edits via onCommit on blur / Enter.
function EditableText({
  as: Tag = "span",
  value,
  className,
  style,
  editable,
  onCommit,
  title,
}: {
  as?: string;
  value: string;
  className?: string;
  style?: React.CSSProperties;
  editable?: boolean;
  onCommit?: (v: string) => void;
  title?: string;
}) {
  if (!editable || !onCommit) {
    const El = Tag as React.ElementType;
    return (
      <El className={className} style={style} title={title}>
        {value}
      </El>
    );
  }
  const El = Tag as React.ElementType;
  return (
    <El
      className={cn(className, "cursor-text outline-none")}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      title={title}
      data-editable
      onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const text = (e.currentTarget.innerText || "").replace(/\u00A0/g, " ").replace(/\n+$/, "").trimEnd();
        onCommit(text);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    >
      {value}
    </El>
  );
}

/** Background for a slide honoring the full dynamic theme recipe.
 *  Falls back to the legacy mesh look when only the 6-field palette exists. */
function dynamicSlideBackground(theme: SlideTheme): React.CSSProperties {
  const bg2 = theme.bg2 ?? rgb(theme.bg, -18);
  const accent2 = theme.accent2 ?? theme.chip;
  const backdrop = theme.backdrop ?? "mesh";
  const base = `linear-gradient(135deg, ${theme.bg} 0%, ${bg2} 100%)`;
  const glowA = hexToRgba(theme.accent, 0.22);
  const glowB = hexToRgba(accent2, 0.22);
  switch (backdrop) {
    case "aurora":
      return { background: `radial-gradient(90% 70% at 50% -10%, ${glowA} 0%, transparent 60%), radial-gradient(70% 90% at 85% 110%, ${glowB} 0%, transparent 55%), ${base}` };
    case "grid":
      return {
        background: base,
        backgroundImage: `linear-gradient(${hexToRgba(theme.accent, 0.1)} 1px, transparent 1px), linear-gradient(90deg, ${hexToRgba(theme.accent, 0.1)} 1px, transparent 1px), ${base}`,
        backgroundSize: "44px 44px, 44px 44px, cover",
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(${hexToRgba(theme.accent, 0.22)} 1.2px, transparent 1.2px), ${base}`,
        backgroundSize: "22px 22px, cover",
      };
    case "lines":
      return { backgroundImage: `repeating-linear-gradient(0deg, ${hexToRgba(theme.accent, 0.08)} 0 1px, transparent 1px 14px), ${base}` };
    case "diagonal":
      return { background: `linear-gradient(115deg, ${hexToRgba(theme.accent, 0.28)} 0%, transparent 32%), linear-gradient(115deg, transparent 62%, ${hexToRgba(accent2, 0.25)} 100%), ${base}` };
    case "paper":
      return { background: `radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 60%), ${base}` };
    case "solid":
      return { background: theme.bg };
    case "mesh":
    default:
      return {
        background: `radial-gradient(120% 120% at 15% 10%, ${glowA} 0%, transparent 45%), radial-gradient(100% 100% at 100% 90%, ${hexToRgba(theme.chip, 0.28)} 0%, transparent 50%), ${base}`,
      };
  }
}

/**
 * Mouse-direct editing chrome for a selected slide.
 * - Text selection floating toolbar: pick text color, highlight
 *   (background), alignment (placement), and bump font size — straight from
 *   the mouse, no sidebar needed.
 * - Drag-to-move handle: grab the move grip and drag the slide content to a
 *   new placement; offsets persist on block.style.
 */
function SlideMouseTools({ block, onEdit }: { block: ArtifactBlock; onEdit: EditHandler }) {
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Show the floating toolbar whenever the user selects text with the mouse.
  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-slide-tools]")) return;
      const sel = window.getSelection();
      const root = target?.closest?.("[data-slide-root]");
      if (!root || !sel || sel.isCollapsed || sel.toString().trim().length === 0) {
        setToolbar(null);
        return;
      }
      // Only for selections inside this slide.
      let node: Node | null = sel.anchorNode;
      let inside = false;
      while (node) {
        if (node === root) { inside = true; break; }
        node = node.parentNode;
      }
      if (!inside) {
        setToolbar(null);
        return;
      }
      try {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        setToolbar({
          top: Math.max(8, rect.top - 52),
          left: Math.min(Math.max(8, rect.left + rect.width / 2 - 130), window.innerWidth - 280),
        });
      } catch {
        setToolbar(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setToolbar(null);
    };
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const patchStyle = (patch: Partial<BlockStyle>) => {
    onEdit({ ...block, style: { ...(block.style ?? {}), ...patch } });
  };

  // Drag-to-move: pointer capture on the grip, commit offsets on release.
  const onGripDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: block.style?.offsetX ?? 0,
      oy: block.style?.offsetY ?? 0,
    };
    setDragging(true);
    const onMove = (ev: PointerEvent) => {
      const s = dragStart.current;
      if (!s) return;
      const nx = Math.max(-320, Math.min(320, s.ox + (ev.clientX - s.x)));
      const ny = Math.max(-220, Math.min(220, s.oy + (ev.clientY - s.y)));
      onEdit({ ...block, style: { ...(block.style ?? {}), offsetX: Math.round(nx), offsetY: Math.round(ny) } });
    };
    const onUp = () => {
      dragStart.current = null;
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const resetPlacement = () => {
    const next = { ...(block.style ?? {}) };
    delete next.offsetX;
    delete next.offsetY;
    onEdit({ ...block, style: next });
  };

  return (
    <>
      {/* drag-to-move grip */}
      <div data-slide-tools className="absolute right-2 top-2 z-20 flex items-center gap-1">
        {(block.style?.offsetX || block.style?.offsetY) ? (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); resetPlacement(); }}
            title="Reset placement"
            className="rounded-md border border-white/15 bg-black/60 px-1.5 py-1 text-[10px] text-white/70 backdrop-blur hover:text-white"
          >
            Reset
          </button>
        ) : null}
        <button
          onPointerDown={onGripDown}
          onClick={(e) => e.stopPropagation()}
          title="Drag to move content"
          className={cn(
            "cursor-grab rounded-md border border-white/15 bg-black/60 px-1.5 py-1 text-[10px] text-white/70 backdrop-blur hover:text-white active:cursor-grabbing",
            dragging && "text-white border-white/40"
          )}
        >
          ✥ Move
        </button>
      </div>

      {/* text-selection floating toolbar */}
      {toolbar && (
        <div
          data-slide-tools
          className="fixed z-50 flex items-center gap-2 rounded-xl border border-white/15 bg-neutral-900/95 px-2.5 py-1.5 shadow-2xl backdrop-blur-xl"
          style={{ top: toolbar.top, left: toolbar.left }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <label title="Text color" className="flex items-center gap-1 text-[10px] text-white/60">
            A
            <input
              type="color"
              value={block.style?.color ?? "#ffffff"}
              onChange={(e) => patchStyle({ color: e.target.value })}
              className="h-6 w-7 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </label>
          <label title="Highlight / background" className="flex items-center gap-1 text-[10px] text-white/60">
            ▨
            <input
              type="color"
              value={block.style?.backgroundColor ?? "#000000"}
              onChange={(e) => patchStyle({ backgroundColor: e.target.value })}
              className="h-6 w-7 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </label>
          <span className="h-4 w-px bg-white/10" />
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              title={`Align ${align}`}
              onClick={() => patchStyle({ textAlign: align })}
              className={cn(
                "rounded-md px-1.5 py-1 text-[10px]",
                block.style?.textAlign === align || (!block.style?.textAlign && align === "left")
                  ? "bg-primary/30 text-white"
                  : "text-white/60 hover:text-white"
              )}
            >
              {align === "left" ? "⇤" : align === "center" ? "⇹" : "⇥"}
            </button>
          ))}
          <span className="h-4 w-px bg-white/10" />
          <button
            title="Smaller text"
            onClick={() => patchStyle({ fontSize: Math.max(8, (block.style?.fontSize ?? 16) - 2) })}
            className="rounded-md px-1.5 py-1 text-[10px] text-white/60 hover:text-white"
          >
            A−
          </button>
          <button
            title="Bigger text"
            onClick={() => patchStyle({ fontSize: Math.min(96, (block.style?.fontSize ?? 16) + 2) })}
            className="rounded-md px-1.5 py-1 text-[10px] text-white/60 hover:text-white"
          >
            A+
          </button>
          <button title="Close" onClick={() => setToolbar(null)} className="rounded-md px-1 py-1 text-[10px] text-white/40 hover:text-white">
            ✕
          </button>
        </div>
      )}
    </>
  );
}

const SPLIT_RATIOS: Record<string, [number, number]> = {
  "50-50": [1, 1], "60-40": [1.5, 1], "40-60": [1, 1.5], "65-35": [1.86, 1], "35-65": [1, 1.86],
};

interface BodyCommon {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any;
  theme: SlideTheme;
  cardBg: string;
  cardBorder: string;
  titleColor: React.CSSProperties;
  mutedColor: React.CSSProperties;
  accentColor?: React.CSSProperties;
  titleSize?: React.CSSProperties;
  bodySize: string;
  size: string;
  editable?: boolean;
  edit: (key: string) => (v: string) => void;
}

function MediaSplitBody({ p, theme, titleColor, mutedColor, titleSize, bodySize, size, imageUrl, editable, edit, editListItem, strList }: BodyCommon & {
  imageUrl: string;
  editListItem: (key: string, i: number) => (v: string) => void;
  strList: (v: unknown) => string[];
}) {
  const ratio = SPLIT_RATIOS[String(p.ratio ?? "50-50")] ?? [1, 1];
  const imageLeft = p.imageSide === "left";
  const text = (
    <div className="flex h-full flex-col justify-center">
      <EditableText as="h2" value={p.title || ""} className={cn("font-bold mb-4", size)} style={titleSize ? { ...titleColor, ...titleSize } : titleColor} editable={editable} onCommit={edit("title")} />
      {p.body ? (
        <EditableText as="p" value={p.body} className={cn("leading-relaxed mb-4", bodySize)} style={mutedColor} editable={editable} onCommit={edit("body")} />
      ) : null}
      <ul className="space-y-2.5">
        {strList(p.bullets).slice(0, 5).map((b, i) => (
          <li key={i} className={cn("flex items-start gap-2.5", bodySize)} style={mutedColor}>
            <span className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: theme.accent }} />
            <EditableText value={b} editable={editable} onCommit={editListItem("bullets", i)} />
          </li>
        ))}
      </ul>
    </div>
  );
  const media = imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt={p.title || "Visual"} className="h-full w-full object-cover" style={{ borderRadius: theme.radius ?? 12, border: `1px solid ${hexToRgba(theme.accent, 0.25)}`, minHeight: 220 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
  ) : (
    <div className="flex h-full min-h-[220px] items-center justify-center text-sm" style={{ background: `linear-gradient(135deg, ${hexToRgba(theme.accent, 0.25)}, transparent)`, borderRadius: theme.radius ?? 12, border: `1px dashed ${hexToRgba(theme.accent, 0.4)}`, color: theme.muted }}>
      Add an image URL to display it
    </div>
  );
  return (
    <div className="grid h-full w-full items-stretch gap-6 px-2 md:px-6" style={{ gridTemplateColumns: `${ratio[0]}fr ${ratio[1]}fr` }}>
      {imageLeft ? media : text}
      {imageLeft ? text : media}
    </div>
  );
}

function TimelineBody({ p, theme, cardBg, cardBorder, titleColor, mutedColor, accentColor, titleSize, bodySize, size, editable, edit, editObjField, layoutVariant }: BodyCommon & {
  editObjField: (key: string, i: number, field: string) => (v: string) => void;
  layoutVariant?: string;
}) {
  const items = ((Array.isArray(p.items) ? p.items : []) as unknown[]).map((m) =>
    typeof m === "string" ? { date: "", label: m, detail: "" } : { date: String((m as { date?: unknown })?.date ?? ""), label: String((m as { label?: unknown })?.label ?? ""), detail: String((m as { detail?: unknown })?.detail ?? "") }
  ).slice(0, 6);
  const vertical = layoutVariant === "axis-vertical";
  return (
    <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
      <EditableText as="h2" value={p.title || ""} className={cn("font-bold mb-6", size)} style={titleSize ? { ...titleColor, ...titleSize } : titleColor} editable={editable} onCommit={edit("title")} />
      {!vertical ? (
        <div className="relative">
          <div className="absolute left-0 right-0 top-[7px] h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2 ?? theme.chip})` }} />
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}>
            {items.map((m, i) => (
              <div key={i} className="relative pt-6">
                <span className="absolute left-0 top-0 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: theme.accent, boxShadow: `0 0 0 4px ${hexToRgba(theme.accent, 0.25)}` }} />
                <EditableText value={m.date} className="text-[11px] font-bold uppercase tracking-wider" style={accentColor} editable={editable} onCommit={editObjField("items", i, "date")} />
                <EditableText value={m.label} className={cn("mt-1 font-semibold", bodySize)} style={titleColor} editable={editable} onCommit={editObjField("items", i, "label")} />
                {m.detail ? (
                  <EditableText value={m.detail} className="mt-1 text-xs leading-relaxed" style={mutedColor} editable={editable} onCommit={editObjField("items", i, "detail")} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative space-y-4 border-l-2 pl-6" style={{ borderColor: hexToRgba(theme.accent, 0.5) }}>
          {items.map((m, i) => (
            <div key={i} className="relative rounded-xl p-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <span className="absolute -left-[33px] top-4 h-3.5 w-3.5 rounded-full" style={{ background: theme.accent }} />
              <EditableText value={m.date} className="text-[11px] font-bold uppercase tracking-wider" style={accentColor} editable={editable} onCommit={editObjField("items", i, "date")} />
              <EditableText value={m.label} className={cn("font-semibold", bodySize)} style={titleColor} editable={editable} onCommit={editObjField("items", i, "label")} />
              {m.detail ? (
                <EditableText value={m.detail} className="text-xs" style={mutedColor} editable={editable} onCommit={editObjField("items", i, "detail")} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessBody({ p, theme, cardBg, cardBorder, titleColor, mutedColor, titleSize, bodySize, size, editable, edit, editObjField }: BodyCommon & {
  editObjField: (key: string, i: number, field: string) => (v: string) => void;
}) {
  const steps = ((Array.isArray(p.steps) ? p.steps : []) as unknown[]).map((s) =>
    typeof s === "string" ? { label: s, detail: "" } : { label: String((s as { label?: unknown })?.label ?? ""), detail: String((s as { detail?: unknown })?.detail ?? "") }
  ).slice(0, 6);
  const vertical = p.direction === "vertical";
  const card = (s: { label: string; detail: string }, i: number) => (
    <div key={i} className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: theme.radius ?? 12 }}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: hexToRgba(theme.accent, 0.9), color: theme.bg }}>{i + 1}</span>
      <EditableText value={s.label} className={cn("mt-2 font-semibold", bodySize)} style={titleColor} editable={editable} onCommit={editObjField("steps", i, "label")} />
      {s.detail ? (
        <EditableText value={s.detail} className="mt-1 text-xs leading-relaxed" style={mutedColor} editable={editable} onCommit={editObjField("steps", i, "detail")} />
      ) : null}
    </div>
  );
  return (
    <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
      <EditableText as="h2" value={p.title || ""} className={cn("font-bold mb-5", size)} style={titleSize ? { ...titleColor, ...titleSize } : titleColor} editable={editable} onCommit={edit("title")} />
      {!vertical ? (
        <div className="flex items-stretch gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-1 items-stretch gap-2">
              <div className="flex-1">{card(s, i)}</div>
              {i < steps.length - 1 ? (
                <div className="flex items-center text-2xl font-bold" style={{ color: theme.accent }}>→</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i}>
              {card(s, i)}
              {i < steps.length - 1 ? (
                <div className="flex justify-center py-0.5 text-xl font-bold" style={{ color: theme.accent }}>↓</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareBody({ p, theme, cardBg, cardBorder, titleColor, mutedColor, accentColor, titleSize, bodySize, size, editable, edit, editListItem, strList }: BodyCommon & {
  editListItem: (key: string, i: number) => (v: string) => void;
  strList: (v: unknown) => string[];
}) {
  const variant = String(p.variant || "vs-split");
  const left = strList(p.left).slice(0, 6);
  const right = strList(p.right).slice(0, 6);
  const listCol = (items: string[], key: "left" | "right", marker: string, markerColor: string) => (
    <ul className="mt-3 space-y-2">
      {items.map((b, i) => (
        <li key={i} className={cn("flex items-start gap-2", bodySize)} style={mutedColor}>
          <span className="font-bold" style={{ color: markerColor }}>{marker}</span>
          <EditableText value={b} editable={editable} onCommit={editListItem(key, i)} />
        </li>
      ))}
    </ul>
  );
  const cardShell = (title: string, titleKey: string, children: React.ReactNode, highlight?: boolean) => (
    <div className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${highlight ? theme.accent : cardBorder}`, borderRadius: theme.radius ?? 12 }}>
      <EditableText as="h3" value={title} className="text-sm font-bold uppercase tracking-wide" style={highlight ? accentColor : titleColor} editable={editable} onCommit={edit(titleKey)} />
      {children}
    </div>
  );
  return (
    <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
      <EditableText as="h2" value={p.title || ""} className={cn("font-bold mb-5", size)} style={titleSize ? { ...titleColor, ...titleSize } : titleColor} editable={editable} onCommit={edit("title")} />
      {variant === "table" ? (
        <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${cardBorder}` }}>
          <div className="grid grid-cols-2" style={{ background: hexToRgba(theme.accent, 0.15) }}>
            {[p.leftTitle, p.rightTitle].map((t, i) => (
              <EditableText key={i} value={String(t || "")} className="px-4 py-2.5 text-sm font-bold" style={titleColor} editable={editable} onCommit={edit(i === 0 ? "leftTitle" : "rightTitle")} />
            ))}
          </div>
          {Array.from({ length: Math.max(left.length, right.length, 1) }).map((_, i) => (
            <div key={i} className="grid grid-cols-2" style={{ background: i % 2 ? hexToRgba(theme.accent, 0.05) : "transparent" }}>
              <div className="px-4 py-2 text-sm" style={{ color: theme.muted }}><EditableText value={left[i] ?? ""} editable={editable} onCommit={editListItem("left", i)} /></div>
              <div className="px-4 py-2 text-sm" style={{ color: theme.muted }}><EditableText value={right[i] ?? ""} editable={editable} onCommit={editListItem("right", i)} /></div>
            </div>
          ))}
        </div>
      ) : variant === "before-after" || variant === "migration" ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
          {cardShell(String(p.leftTitle || "Before"), "leftTitle", listCol(left, "left", "•", theme.muted))}
          <div className="flex items-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-black" style={{ background: theme.accent, color: theme.bg }}>→</span>
          </div>
          {cardShell(String(p.rightTitle || "After"), "rightTitle", listCol(right, "right", "•", theme.accent), true)}
        </div>
      ) : variant === "pros-cons" ? (
        <div className="grid grid-cols-2 gap-4">
          {cardShell(String(p.leftTitle || "Pros"), "leftTitle", listCol(left, "left", "✓", theme.accent), true)}
          {cardShell(String(p.rightTitle || "Cons"), "rightTitle", listCol(right, "right", "✕", theme.muted))}
        </div>
      ) : (
        <div className="relative grid grid-cols-2 gap-8">
          {cardShell(String(p.leftTitle || "Option A"), "leftTitle", listCol(left, "left", "•", theme.muted))}
          {cardShell(String(p.rightTitle || "Option B"), "rightTitle", listCol(right, "right", "•", theme.accent), true)}
          <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-black" style={{ background: theme.accent, color: theme.bg }}>VS</span>
        </div>
      )}
      {p.verdict ? (
        <EditableText as="p" value={p.verdict} className="mt-4 text-center text-sm font-semibold" style={accentColor} editable={editable} onCommit={edit("verdict")} />
      ) : null}
    </div>
  );
}

function SingleSlideRenderer({
  block,
  viewport,
  theme,
  editable,
  onEdit,
}: {
  block: ArtifactBlock;
  viewport: "desktop" | "tablet" | "phone";
  theme: SlideTheme;
  editable?: boolean;
  onEdit?: EditHandler;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;
  const style = block.style;
  const size = viewport === "desktop" ? "text-4xl" : viewport === "tablet" ? "text-2xl" : "text-xl";
  const bodySize = viewport === "desktop" ? "text-base" : viewport === "tablet" ? "text-sm" : "text-xs";
  const cardBg = hexToRgba(theme.bg === "#fafafa" ? "#ffffff" : theme.bg, theme.bg === "#fafafa" ? 0.6 : 0.45);
  const overriddenFontSize = fontSizeOf(style);
  const titleSize = overriddenFontSize ? { fontSize: overriddenFontSize } : undefined;
  const headingFont: React.CSSProperties = theme.fontHeading ? { fontFamily: `${theme.fontHeading}, Inter, sans-serif` } : {};
  const bodyFont: React.CSSProperties = theme.fontBody ? { fontFamily: `${theme.fontBody}, Inter, sans-serif` } : {};
  const titleColor = { color: textColor(style, theme, theme.text), ...headingFont };
  const mutedColor = { color: textColor(style, theme, theme.muted) };
  const accentColor = { color: textColor(style, theme, theme.accent) };
  const edit = (key: string) => (v: string) => editProp(onEdit, block, key, v);
  const slideBg = dynamicSlideBackground(theme);
  const accent2 = theme.accent2 ?? theme.chip;
  const cardBorder = hexToRgba(theme.accent, 0.25);
  // Resolved visual asset: explicit URL first, then resolved asset id/URL.
  const visualUrl =
    (typeof p.url === "string" && p.url) ||
    (typeof block.visual?.assetId === "string" && block.visual.assetId) ||
    "";
  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : (x as { label?: string })?.label ?? "")) : [];
  const editListItem = (key: string, i: number) => (v: string) => {
    const items = [...strList((p as Record<string, unknown>)[key])];
    items[i] = v;
    onEdit?.({ ...block, props: { ...block.props, [key]: items } });
  };
  const editObjField = (key: string, i: number, field: string) => (v: string) => {
    const arr = Array.isArray((p as Record<string, unknown>)[key]) ? [...((p as Record<string, unknown>)[key] as unknown[])] : [];
    const cur = (arr[i] && typeof arr[i] === "object" ? arr[i] : {}) as Record<string, unknown>;
    arr[i] = { ...cur, [field]: v };
    onEdit?.({ ...block, props: { ...block.props, [key]: arr } });
  };

  return (
    <div
      className="w-full aspect-video rounded-xl border border-white/10 flex items-center justify-center p-8 shadow-2xl relative overflow-hidden"
      data-slide-root
      style={slideBg}
    >
      {/* deco line */}
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: `linear-gradient(180deg, ${theme.accent}, ${theme.chip})` }} />
      {editable && onEdit && <SlideMouseTools block={block} onEdit={onEdit} />}
      <div
        className="w-full h-full flex flex-col justify-center"
        data-slide-content
        style={{
          ...bodyFont,
          ...(style?.textAlign ? { textAlign: style.textAlign } : {}),
          ...(style?.offsetX || style?.offsetY
            ? { transform: `translate(${style.offsetX ?? 0}px, ${style.offsetY ?? 0}px)` }
            : {}),
        }}
      >

      {block.type === "title-slide" && (
        <div className="w-full text-center space-y-4">
          <div className="mx-auto h-1.5 w-14 rounded-full" style={{ background: p.accentColor || theme.accent }} />
          <EditableText
            as="h2"
            value={p.title || ""}
            className={cn("font-bold", size)}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("title")}
          />
          {p.subtitle != null && (
            <EditableText
              as="p"
              value={p.subtitle || ""}
              className="mx-auto max-w-2xl text-sm md:text-base"
              style={mutedColor}
              editable={editable}
              onCommit={edit("subtitle")}
            />
          )}
          {p.author && (
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: hexToRgba(theme.chip, 0.2), color: textColor(style, theme, theme.text) }}>
              {p.author}
            </span>
          )}
        </div>
      )}

      {block.type === "content-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <EditableText
            as="h2"
            value={p.title || ""}
            className={cn("font-bold mb-5", size)}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("title")}
          />
          <ul className="space-y-3">
            {(p.bullets || []).map((b: string, i: number) => (
              <li key={i} className={cn("flex items-start gap-3", bodySize)} style={mutedColor}>
                <span className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: theme.accent }} />
                <EditableText value={b} editable={editable} onCommit={(v) => {
                  const bullets = [...(p.bullets || [])];
                  bullets[i] = v;
                  onEdit?.({ ...block, props: { ...block.props, bullets } });
                }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {block.type === "quote-slide" && (
        <div className="text-center px-6 space-y-4 w-full">
          <EditableText
            as="p"
            value={p.quote ? `\u201C${p.quote}\u201D` : ""}
            className={cn("leading-relaxed font-medium", viewport === "desktop" ? "text-2xl" : "text-lg")}
            style={titleColor}
            editable={editable}
            onCommit={(v) => editProp(onEdit, block, "quote", v.replace(/^“|”$/g, "").trim())}
          />
          {p.citation && (
            <EditableText
              as="p"
              value={`— ${p.citation}`}
              className="text-sm"
              style={accentColor}
              editable={editable}
              onCommit={(v) => editProp(onEdit, block, "citation", v.replace(/^—\s*/, "").trim())}
            />
          )}
        </div>
      )}

      {block.type === "two-column-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <EditableText
            as="h2"
            value={p.title || ""}
            className={cn("font-bold mb-5", size)}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("title")}
          />
          <div className="grid grid-cols-2 gap-6">
            {[
              { key: "left", title: p.leftTitle, items: p.left, titleKey: "leftTitle", itemsKey: "left" },
              { key: "right", title: p.rightTitle, items: p.right, titleKey: "rightTitle", itemsKey: "right" },
            ].map((col) => (
              <div key={col.key} className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${hexToRgba(theme.accent, 0.2)}` }}>
                <EditableText
                  as="h3"
                  value={col.title || ""}
                  className="text-[11px] uppercase tracking-wide font-semibold mb-3"
                  style={accentColor}
                  editable={editable}
                  onCommit={edit(col.titleKey)}
                />
                <ul className="space-y-1.5">
                  {(col.items || []).map((b: string, i: number) => (
                    <li key={i} className={bodySize} style={mutedColor}>
                      • <EditableText
                        value={b}
                        editable={editable}
                        onCommit={(v) => {
                          const items = [...(col.items || [])];
                          items[i] = v;
                          onEdit?.({ ...block, props: { ...block.props, [col.itemsKey]: items } });
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === "closing-slide" && (
        <div className="text-center space-y-4 w-full">
          <div className="mx-auto h-1.5 w-14 rounded-full" style={{ background: theme.accent }} />
          <EditableText
            as="h2"
            value={p.title || ""}
            className={cn("font-bold", size)}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("title")}
          />
          {p.subtitle != null && (
            <EditableText as="p" value={p.subtitle || ""} className="text-base" style={mutedColor} editable={editable} onCommit={edit("subtitle")} />
          )}
          {p.contact && (
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: hexToRgba(theme.chip, 0.2), color: textColor(style, theme, theme.text) }}>
              {p.contact}
            </span>
          )}
        </div>
      )}

      {block.type === "stat-slide" && (
        <div className="w-full text-center space-y-3">
          <EditableText
            as="p"
            value={p.title || ""}
            className="text-[11px] uppercase tracking-widest font-semibold"
            style={accentColor}
            editable={editable}
            onCommit={edit("title")}
          />
          <div className="flex items-baseline justify-center gap-3">
            <EditableText
              as="span"
              value={p.value || ""}
              className={cn("font-black", viewport === "desktop" ? "text-7xl" : "text-5xl")}
              style={titleColor}
              editable={editable}
              onCommit={edit("value")}
            />
            <EditableText
              as="span"
              value={p.suffix || ""}
              className={cn("font-semibold", viewport === "desktop" ? "text-3xl" : "text-2xl")}
              style={accentColor}
              editable={editable}
              onCommit={edit("suffix")}
            />
          </div>
          {p.note && (
            <EditableText as="p" value={p.note || ""} className="mx-auto max-w-md text-sm" style={mutedColor} editable={editable} onCommit={edit("note")} />
          )}
        </div>
      )}

      {block.type === "agenda-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-12">
          <EditableText
            as="h2"
            value={p.title || ""}
            className={cn("font-bold mb-6", size)}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("title")}
          />
          <ol className="space-y-3">
            {(p.items || []).map((item: string, i: number) => (
              <li key={i} className={cn("flex items-center gap-4", bodySize)} style={titleColor}>
                <span
                  className="flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: hexToRgba(theme.accent, 0.85), color: theme.bg }}
                >
                  {i + 1}
                </span>
                <EditableText
                  value={item}
                  style={mutedColor}
                  editable={editable}
                  onCommit={(v) => {
                    const items = [...(p.items || [])];
                    items[i] = v;
                    onEdit?.({ ...block, props: { ...block.props, items } });
                  }}
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      {block.type === "image-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <EditableText
            as="h2"
            value={p.title || ""}
            className={cn("font-bold mb-4", size)}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("title")}
          />
          {p.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied arbitrary image URLs (unknown hosts/dimensions) can't use next/image remote optimization.
            <img
              src={p.url}
              alt={p.caption || p.title}
              className="w-full max-h-[55%] object-contain rounded-xl border border-white/10"
              style={{ background: theme.bg === "#fafafa" ? "#ffffff" : hexToRgba(theme.bg, 0.5) }}
              onError={(e) => { (e.currentTarget.style.display = "none"); }}
            />
          ) : (
            <div className="flex items-center justify-center h-40 rounded-xl text-sm" style={{ background: cardBg, border: `1px dashed ${hexToRgba(theme.accent, 0.4)}`, color: theme.muted }}>
              Add an image URL to display it
            </div>
          )}
          {p.caption != null && (
            <EditableText as="p" value={p.caption || ""} className="mt-3 text-sm" style={mutedColor} editable={editable} onCommit={edit("caption")} />
          )}
        </div>
      )}

      {block.type === "grid-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <EditableText
            as="h2"
            value={p.title || ""}
            className={cn("font-bold mb-5", size)}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("title")}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(Array.isArray(p.items) ? p.items : []).map((card: { label?: string; detail?: string } | string, i: number) => {
              const label = typeof card === "string" ? card : card?.label;
              const detail = typeof card === "object" && card ? card.detail : "";
              const isObj = typeof card === "object" && card;
              return (
                <div key={i} className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${hexToRgba(theme.accent, 0.25)}` }}>
                  <div className="mb-2 h-1.5 w-8 rounded-full" style={{ background: theme.accent }} />
                  <EditableText
                    value={label || ""}
                    className={cn("font-semibold", viewport === "tablet" ? "text-sm" : "text-base")}
                    style={titleColor}
                    editable={editable}
                    onCommit={(v) => {
                      const items = [...(p.items || [])];
                      items[i] = isObj ? { ...card, label: v } : v;
                      onEdit?.({ ...block, props: { ...block.props, items } });
                    }}
                  />
                  {detail != null && isObj && (
                    <EditableText
                      value={detail}
                      className="mt-1 text-xs"
                      style={mutedColor}
                      editable={editable}
                      onCommit={(v) => {
                        const items = [...(p.items || [])];
                        items[i] = { ...card, detail: v };
                        onEdit?.({ ...block, props: { ...block.props, items } });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {block.type === "numbered-steps" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-12">
          <EditableText
            as="h2"
            value={p.title || ""}
            className={cn("font-bold mb-6", size)}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("title")}
          />
          <div className="space-y-3">
            {(Array.isArray(p.steps) ? p.steps : []).map((step: string, i: number) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl px-4 py-2.5"
                style={{ background: cardBg, border: `1px solid ${hexToRgba(theme.accent, 0.18)}` }}
              >
                <span
                  className="flex items-center justify-center h-9 w-9 rounded-full text-sm font-bold flex-shrink-0"
                  style={{ background: hexToRgba(theme.accent, 0.85), color: theme.bg }}
                >
                  {i + 1}
                </span>
                <EditableText
                  value={step}
                  className={bodySize}
                  style={titleColor}
                  editable={editable}
                  onCommit={(v) => {
                    const steps = [...(p.steps || [])];
                    steps[i] = v;
                    onEdit?.({ ...block, props: { ...block.props, steps } });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === "statement-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-12" style={{ textAlign: style?.textAlign as React.CSSProperties["textAlign"] }}>
          {p.overline ? (
            <EditableText as="p" value={p.overline} className="text-xs font-semibold uppercase tracking-[0.2em] mb-4" style={accentColor} editable={editable} onCommit={edit("overline")} />
          ) : null}
          <EditableText
            as="h2"
            value={p.headline || ""}
            className={cn("font-black leading-[1.02]", viewport === "desktop" ? "text-5xl" : viewport === "tablet" ? "text-4xl" : "text-3xl")}
            style={titleSize ? { ...titleColor, ...titleSize } : titleColor}
            editable={editable}
            onCommit={edit("headline")}
          />
          {p.sub != null && p.sub !== "" ? (
            <EditableText as="p" value={p.sub} className={cn("mt-5 max-w-2xl leading-relaxed", viewport === "desktop" ? "text-xl" : "text-base")} style={mutedColor} editable={editable} onCommit={edit("sub")} />
          ) : null}
        </div>
      )}

      {block.type === "editorial-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-12">
          {p.overline ? (
            <EditableText as="p" value={p.overline} className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={accentColor} editable={editable} onCommit={edit("overline")} />
          ) : null}
          <div className="grid gap-8 md:grid-cols-[1fr_220px]">
            <div>
              <EditableText as="h2" value={p.headline || ""} className={cn("font-bold leading-tight", viewport === "desktop" ? "text-4xl" : "text-2xl")} style={titleSize ? { ...titleColor, ...titleSize } : titleColor} editable={editable} onCommit={edit("headline")} />
              {p.lede ? (
                <EditableText as="p" value={p.lede} className={cn("mt-4 leading-relaxed font-medium", viewport === "desktop" ? "text-xl" : "text-base")} style={titleColor} editable={editable} onCommit={edit("lede")} />
              ) : null}
              {p.body ? (
                <EditableText as="p" value={p.body} className={cn("mt-3 leading-relaxed", bodySize)} style={mutedColor} editable={editable} onCommit={edit("body")} />
              ) : null}
            </div>
            <div className="flex flex-col justify-center gap-3">
              {p.stat ? (
                <div className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: theme.radius ?? 12 }}>
                  <EditableText value={p.stat} className="text-4xl font-black" style={accentColor} editable={editable} onCommit={edit("stat")} />
                  {p.statLabel ? (
                    <EditableText value={p.statLabel} className="mt-1 text-xs" style={mutedColor} editable={editable} onCommit={edit("statLabel")} />
                  ) : null}
                </div>
              ) : null}
              {visualUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={visualUrl} alt={p.headline || "Visual"} className="w-full max-h-44 object-cover" style={{ borderRadius: theme.radius ?? 12, border: `1px solid ${cardBorder}` }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {block.type === "media-split-slide" && (
        <MediaSplitBody
          p={p} theme={theme} cardBg={cardBg} cardBorder={cardBorder}
          titleColor={titleColor} mutedColor={mutedColor} titleSize={titleSize}
          bodySize={bodySize} size={size} imageUrl={visualUrl}
          editable={editable} edit={edit} editListItem={editListItem} strList={strList}
        />
      )}

      {block.type === "bleed-slide" && (
        <div className="relative -m-8 flex h-[calc(100%+4rem)] w-[calc(100%+4rem)] flex-col justify-end overflow-hidden">
          {visualUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visualUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.bg}, ${accent2})` }} />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${hexToRgba(theme.bg, 0.88)} 78%)` }} />
          <div className="relative p-8 md:p-12">
            <div className="mb-4 h-1.5 w-16 rounded-full" style={{ background: theme.accent }} />
            <EditableText as="h2" value={p.title || ""} className={cn("font-black leading-tight", viewport === "desktop" ? "text-5xl" : "text-3xl")} style={titleSize ? { ...titleColor, ...titleSize } : titleColor} editable={editable} onCommit={edit("title")} />
            {p.subtitle ? (
              <EditableText as="p" value={p.subtitle} className={cn("mt-3 max-w-2xl", viewport === "desktop" ? "text-xl" : "text-base")} style={mutedColor} editable={editable} onCommit={edit("subtitle")} />
            ) : null}
          </div>
        </div>
      )}

      {block.type === "timeline-slide" && (
        <TimelineBody
          p={p} theme={theme} cardBg={cardBg} cardBorder={cardBorder}
          titleColor={titleColor} mutedColor={mutedColor} accentColor={accentColor}
          titleSize={titleSize} bodySize={bodySize} size={size}
          editable={editable} edit={edit} editObjField={editObjField}
          layoutVariant={block.layout?.variant}
        />
      )}

      {block.type === "process-slide" && (
        <ProcessBody
          p={p} theme={theme} cardBg={cardBg} cardBorder={cardBorder}
          titleColor={titleColor} mutedColor={mutedColor} titleSize={titleSize}
          bodySize={bodySize} size={size}
          editable={editable} edit={edit} editObjField={editObjField}
        />
      )}

      {block.type === "compare-slide" && (
        <CompareBody
          p={p} theme={theme} cardBg={cardBg} cardBorder={cardBorder}
          titleColor={titleColor} mutedColor={mutedColor} accentColor={accentColor}
          titleSize={titleSize} bodySize={bodySize} size={size}
          editable={editable} edit={edit} editListItem={editListItem} strList={strList}
        />
      )}

      {block.type === "chart-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <EditableText as="h2" value={p.title || ""} className={cn("font-bold mb-4", size)} style={titleSize ? { ...titleColor, ...titleSize } : titleColor} editable={editable} onCommit={edit("title")} />
          <SlideChart
            chartType={String(p.chartType || "bar")}
            labels={strList(p.labels)}
            values={parseValues(p.values)}
            accent={theme.accent} accent2={accent2} text={theme.text} muted={theme.muted}
          />
          {p.note ? (
            <EditableText as="p" value={p.note} className="mt-3 text-sm" style={mutedColor} editable={editable} onCommit={edit("note")} />
          ) : null}
        </div>
      )}

      {block.type === "diagram-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <EditableText as="h2" value={p.title || ""} className={cn("font-bold mb-4", size)} style={titleSize ? { ...titleColor, ...titleSize } : titleColor} editable={editable} onCommit={edit("title")} />
          <SlideDiagram
            nodes={((Array.isArray(p.nodes) ? p.nodes : []) as unknown[]).map((n) =>
              typeof n === "string" ? { label: n } : { label: String((n as DiagramNode)?.label ?? ""), detail: String((n as DiagramNode)?.detail ?? "") }
            )}
            edges={((Array.isArray(p.edges) ? p.edges : []) as unknown[]).map((e, i, arr) => ({
              from: Number((e as DiagramEdge)?.from ?? i),
              to: Number((e as DiagramEdge)?.to ?? Math.min(i + 1, arr.length - 1)),
              label: String((e as DiagramEdge)?.label ?? ""),
            }))}
            direction={String(p.direction || "horizontal")}
            accent={theme.accent} text={theme.text} muted={theme.muted}
            cardBg={cardBg} cardBorder={cardBorder}
          />
        </div>
      )}
      </div>
    </div>
  );
}

export function SlidesRenderer({
  block,
  viewport,
  theme,
  editable,
  onEdit,
}: {
  block: ArtifactBlock;
  viewport: "desktop" | "tablet" | "phone";
  theme?: SlideTheme;
  editable?: boolean;
  onEdit?: EditHandler;
}) {
  return (
    <SingleSlideRenderer
      block={block}
      viewport={viewport}
      theme={theme ?? STATIC_THEME}
      editable={editable}
      onEdit={onEdit}
    />
  );
}

/** Resolve the full dynamic theme (prebuilt + persisted custom override). */
export function resolveSlideThemeForBlock(
  themeId: string | undefined,
  themeConfig: unknown
): SlideTheme {
  try {
    const custom = (themeConfig && typeof themeConfig === "object" ? themeConfig : null) as Partial<DynamicSlideTheme> | null;
    const t = getSlideTheme(themeId, custom);
    return {
      bg: t.bg, bg2: t.bg2, accent: t.accent, accent2: t.accent2,
      text: t.text, muted: t.muted, chip: t.chip,
      fontHeading: t.fontHeading, fontBody: t.fontBody,
      backdrop: t.backdrop, radius: t.radius,
    };
  } catch {
    return STATIC_THEME;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgb(hex: string, delta: number): string {
  let { r, g, b } = parseHex(hex);
  r = clamp(r + delta);
  g = clamp(g + delta);
  b = clamp(b + delta);
  return `rgb(${r}, ${g}, ${b})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h || "000000", 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

export function DocumentBlockRenderer({
  block,
  light = false,
  editable,
  onEdit,
}: {
  block: ArtifactBlock;
  light?: boolean;
  editable?: boolean;
  onEdit?: EditHandler;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;
  const style = block.style;
  const heading = light ? "text-neutral-900" : "text-white";
  const body = light ? "text-neutral-700" : "text-white/80";
  const sub = light ? "text-neutral-500" : "text-text-tertiary";
  const border = light ? "border-neutral-200" : "border-white/10";
  const codeBg = light ? "bg-neutral-100" : "bg-neutral-900";
  const edit = (key: string) => (v: string) => editProp(onEdit, block, key, v);
  const colorStyle = (fallback?: string): React.CSSProperties =>
    style?.color ? { color: style.color } : fallback ? { color: fallback } : {};
  const fs = fontSizeOf(style);
  const fsStyle = fs ? { fontSize: fs } : {};

  switch (block.type) {
    case "heading": {
      const cls = p.level === "h1"
        ? `text-3xl font-semibold ${heading} mt-6 mb-2`
        : p.level === "h3"
        ? `text-lg font-medium ${heading} mt-4 mb-1.5`
        : `text-2xl font-semibold ${heading} mt-5 mb-2`;
      const Tag = p.level === "h1" ? "h1" : p.level === "h3" ? "h3" : "h2";
      return (
        <EditableText
          as={Tag}
          value={p.text || ""}
          className={cls}
          style={{ ...colorStyle(light ? "#171717" : "#ffffff"), ...fsStyle }}
          editable={editable}
          onCommit={edit("text")}
        />
      );
    }
    case "paragraph":
      return (
        <EditableText
          as="p"
          value={p.text || ""}
          className={`${body} leading-relaxed my-2`}
          style={{ ...colorStyle(light ? "#3f3f46" : "rgba(255,255,255,0.8)"), ...fsStyle }}
          editable={editable}
          onCommit={edit("text")}
        />
      );
    case "bullets":
      return (
        <ul className={`list-disc list-inside space-y-1 ${body} my-2`}>
          {(p.items || []).map((item: string, i: number) => (
            <li key={i} style={colorStyle()}>
              <EditableText
                value={item}
                editable={editable}
                onCommit={(v) => {
                  const items = [...(p.items || [])];
                  items[i] = v;
                  onEdit?.({ ...block, props: { ...block.props, items } });
                }}
              />
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className={`${codeBg} ${border} rounded-lg p-4 overflow-x-auto my-2`}>
          <code className={cn("text-sm", p.language)}>{p.code}</code>
        </pre>
      );
    case "quote":
      return (
        <blockquote className={`border-l-2 border-primary pl-4 ${body} italic my-2`}>
          <EditableText value={p.text || ""} editable={editable} onCommit={edit("text")} />
          {p.attribution && (
            <EditableText as="footer" value={`— ${p.attribution}`} className={`${sub} text-xs mt-1`} editable={editable} onCommit={(v) => editProp(onEdit, block, "attribution", v.replace(/^—\s*/, "").trim())} />
          )}
        </blockquote>
      );
    case "image":
      return (
        <div className="my-2">
          {p.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.url} alt={p.alt || ""} className="max-w-full rounded-lg border border-white/10" />
          ) : (
            <div className={`${border} rounded-lg border border-dashed px-4 py-8 text-center text-sm ${sub}`}>
              Add an image URL in Properties
            </div>
          )}
          {p.caption && <p className={`${sub} text-xs mt-1`}>{p.caption}</p>}
        </div>
      );
    case "divider":
      return <hr className={`my-4 border-0 h-px ${light ? "bg-neutral-200" : "bg-white/10"}`} />;
    case "checklist":
      return (
        <ul className={`space-y-1.5 ${body} my-2`}>
          {(p.items || []).map((item: { text?: string; done?: boolean }, i: number) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-1 inline-block h-3.5 w-3.5 rounded-sm border ${item.done ? "bg-primary border-primary" : ""}`}>
                {item.done && <span className="block text-center text-[10px] leading-[13px] text-white">✓</span>}
              </span>
              <EditableText
                value={item.text || ""}
                className={item.done ? "line-through opacity-60" : ""}
                editable={editable}
                onCommit={(v) => {
                  const items = [...(p.items || [])];
                  items[i] = { ...item, text: v };
                  onEdit?.({ ...block, props: { ...block.props, items } });
                }}
              />
            </li>
          ))}
        </ul>
      );
    case "link":
      return (
        <p className="my-2">
          <a href={p.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 break-all">
            {p.text || p.url}
          </a>
        </p>
      );
    case "callout": {
      const tones: Record<string, { box: string; text: string; border: string }> = {
        info: { box: light ? "bg-blue-50" : "bg-blue-950/40", text: light ? "text-blue-800" : "text-blue-200", border: "border-blue-500/40" },
        success: { box: light ? "bg-green-50" : "bg-green-950/40", text: light ? "text-green-800" : "text-green-200", border: "border-green-500/40" },
        warning: { box: light ? "bg-amber-50" : "bg-amber-950/40", text: light ? "text-amber-800" : "text-amber-200", border: "border-amber-500/40" },
        danger: { box: light ? "bg-red-50" : "bg-red-950/40", text: light ? "text-red-800" : "text-red-200", border: "border-red-500/40" },
      };
      const t = tones[p.tone || "info"];
      return (
        <div className={`rounded-lg border-l-4 ${t.box} ${t.border} px-4 py-3 my-2`}>
          <EditableText as="p" value={p.text || ""} className={`${t.text} text-sm leading-relaxed`} style={colorStyle()} editable={editable} onCommit={edit("text")} />
        </div>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto my-2">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${border}`}>
                {(p.headers || []).map((h: string, i: number) => (
                  <th key={i} className={`text-left py-2 px-3 ${heading} font-medium`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(p.rows || []).map((row: string[], i: number) => (
                <tr key={i} className={`border-b ${light ? "border-neutral-100" : "border-white/5"}`}>
                  {row.map((cell, j) => (
                    <td key={j} className={`py-2 px-3 ${body}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return <p className={`${body} my-2`} style={colorStyle()}>{p.text || ""}</p>;
  }
}

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ResearchMarkdown({ content, light = false }: { content: string; light?: boolean }) {
  return (
    <div className={cn("prose prose-sm max-w-none", light ? "prose-neutral" : "prose-invert")}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}