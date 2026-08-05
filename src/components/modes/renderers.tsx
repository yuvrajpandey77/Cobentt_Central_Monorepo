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

function SingleSlideRenderer({
  block,
  viewport,
  theme,
}: {
  block: ArtifactBlock;
  viewport: "desktop" | "tablet" | "phone";
  theme: SlideTheme;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;
  const size = viewport === "desktop" ? "text-4xl" : viewport === "tablet" ? "text-2xl" : "text-xl";
  const bodySize = viewport === "desktop" ? "text-base" : viewport === "tablet" ? "text-sm" : "text-xs";
  const cardBg = hexToRgba(theme.bg === "#fafafa" ? "#ffffff" : theme.bg, theme.bg === "#fafafa" ? 0.6 : 0.45);

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
          <h2 className={cn("font-bold", size)} style={{ color: theme.text }}>{p.title}</h2>
          {p.subtitle && <p className="mx-auto max-w-2xl text-sm md:text-base" style={{ color: theme.muted }}>{p.subtitle}</p>}
          {p.author && (
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: hexToRgba(theme.chip, 0.2), color: theme.text }}>
              {p.author}
            </span>
          )}
        </div>
      )}

      {block.type === "content-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <h2 className={cn("font-bold mb-5", size)} style={{ color: theme.text }}>{p.title}</h2>
          <ul className="space-y-3">
            {(p.bullets || []).map((b: string, i: number) => (
              <li key={i} className={cn("flex items-start gap-3", bodySize)} style={{ color: theme.muted }}>
                <span className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: theme.accent }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {block.type === "quote-slide" && (
        <div className="text-center px-6 space-y-4 w-full">
          <p className={cn("leading-relaxed font-medium", viewport === "desktop" ? "text-2xl" : "text-lg")} style={{ color: theme.text }}>
            {String(p.quote ?? "").length ? `\u201C${p.quote}\u201D` : ""}
          </p>
          {p.citation && <p className="text-sm" style={{ color: theme.accent }}>— {p.citation}</p>}
        </div>
      )}

      {block.type === "two-column-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <h2 className={cn("font-bold mb-5", size)} style={{ color: theme.text }}>{p.title}</h2>
          <div className="grid grid-cols-2 gap-6">
            {[
              { key: "left", title: p.leftTitle, items: p.left },
              { key: "right", title: p.rightTitle, items: p.right },
            ].map((col) => (
              <div key={col.key} className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${hexToRgba(theme.accent, 0.2)}` }}>
                <h3 className="text-[11px] uppercase tracking-wide font-semibold mb-3" style={{ color: theme.accent }}>{col.title}</h3>
                <ul className="space-y-1.5">
                  {(col.items || []).map((b: string, i: number) => (
                    <li key={i} className={bodySize} style={{ color: theme.muted }}>• {b}</li>
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
          <h2 className={cn("font-bold", size)} style={{ color: theme.text }}>{p.title}</h2>
          {p.subtitle && <p className="text-base" style={{ color: theme.muted }}>{p.subtitle}</p>}
          {p.contact && (
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: hexToRgba(theme.chip, 0.2), color: theme.text }}>
              {p.contact}
            </span>
          )}
        </div>
      )}

      {block.type === "stat-slide" && (
        <div className="w-full text-center space-y-3">
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: theme.accent }}>{p.title}</p>
          <div className="flex items-baseline justify-center gap-3">
            <span className={cn("font-black", viewport === "desktop" ? "text-7xl" : "text-5xl")} style={{ color: theme.text }}>{p.value}</span>
            <span className={cn("font-semibold", viewport === "desktop" ? "text-3xl" : "text-2xl")} style={{ color: theme.accent }}>{p.suffix}</span>
          </div>
          {p.note && <p className="mx-auto max-w-md text-sm" style={{ color: theme.muted }}>{p.note}</p>}
        </div>
      )}

      {block.type === "agenda-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-12">
          <h2 className={cn("font-bold mb-6", size)} style={{ color: theme.text }}>{p.title}</h2>
          <ol className="space-y-3">
            {(p.items || []).map((item: string, i: number) => (
              <li key={i} className={cn("flex items-center gap-4", bodySize)} style={{ color: theme.text }}>
                <span
                  className="flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: hexToRgba(theme.accent, 0.85), color: theme.bg }}
                >
                  {i + 1}
                </span>
                <span style={{ color: theme.muted }}>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function SlidesRenderer({
  block,
  viewport,
  theme,
}: {
  block: ArtifactBlock;
  viewport: "desktop" | "tablet" | "phone";
  theme?: SlideTheme;
}) {
  return <SingleSlideRenderer block={block} viewport={viewport} theme={theme ?? STATIC_THEME} />;
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

export function DocumentBlockRenderer({ block, light = false }: { block: ArtifactBlock; light?: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;
  const heading = light ? "text-neutral-900" : "text-white";
  const body = light ? "text-neutral-700" : "text-white/80";
  const sub = light ? "text-neutral-500" : "text-white/40";
  const border = light ? "border-neutral-200" : "border-white/10";
  const codeBg = light ? "bg-neutral-100" : "bg-neutral-900";
  switch (block.type) {
    case "heading":
      if (p.level === "h1") return <h1 className={`text-3xl font-semibold ${heading} mt-6 mb-2`}>{p.text}</h1>;
      if (p.level === "h3") return <h3 className={`text-lg font-medium ${heading} mt-4 mb-1.5`}>{p.text}</h3>;
      return <h2 className={`text-2xl font-semibold ${heading} mt-5 mb-2`}>{p.text}</h2>;
    case "paragraph":
      return <p className={`${body} leading-relaxed my-2`}>{p.text}</p>;
    case "bullets":
      return (
        <ul className={`list-disc list-inside space-y-1 ${body} my-2`}>
          {(p.items || []).map((item: string, i: number) => (
            <li key={i}>{item}</li>
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
          {p.text}
          {p.attribution && <footer className={`${sub} text-xs mt-1`}>— {p.attribution}</footer>}
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
              <span className={item.done ? "line-through opacity-60" : ""}>{item.text || ""}</span>
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
          <p className={`${t.text} text-sm leading-relaxed`}>{p.text}</p>
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
      return <p className={`${body} my-2`}>{p.text || ""}</p>;
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
