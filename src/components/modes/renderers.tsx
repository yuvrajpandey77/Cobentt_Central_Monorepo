"use client";

import { ArtifactBlock, BlockStyle } from "@/lib/modes/types";
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
  return s;
}

export interface SlideTheme {
  bg: string;
  accent: string;
  text: string;
  muted: string;
  chip: string;
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
  const titleColor = { color: textColor(style, theme, theme.text) };
  const mutedColor = { color: textColor(style, theme, theme.muted) };
  const accentColor = { color: textColor(style, theme, theme.accent) };
  const edit = (key: string) => (v: string) => editProp(onEdit, block, key, v);

  return (
    <div
      className="w-full aspect-video rounded-xl border border-white/10 flex items-center justify-center p-8 shadow-2xl relative overflow-hidden"
      style={{
        background: `radial-gradient(120% 120% at 15% 10%, ${hexToRgba(theme.accent, 0.22)} 0%, transparent 45%),
                     radial-gradient(100% 100% at 100% 90%, ${hexToRgba(theme.chip, 0.28)} 0%, transparent 50%),
                     linear-gradient(135deg, ${theme.bg} 0%, ${rgb(theme.bg, -18)} 100%)`,
      }}
    >
      {/* deco line */}
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: `linear-gradient(180deg, ${theme.accent}, ${theme.chip})` }} />

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