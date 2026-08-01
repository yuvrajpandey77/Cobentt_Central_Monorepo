"use client";

import { ArtifactBlock } from "@/lib/modes/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export function SlidesRenderer({
  block,
  viewport,
}: {
  block: ArtifactBlock;
  viewport: "desktop" | "tablet" | "phone";
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;
  const maxW = viewport === "desktop" ? "max-w-4xl" : viewport === "tablet" ? "max-w-md" : "max-w-[320px]";
  const size = viewport === "desktop" ? "text-4xl" : viewport === "tablet" ? "text-2xl" : "text-xl";

  return (
    <div className={cn("w-full aspect-video rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 flex items-center justify-center p-8 shadow-2xl", maxW)}>
      {block.type === "title-slide" && (
        <div className="text-center space-y-4">
          <h2 className={cn("font-semibold text-white", size)}>{p.title}</h2>
          {p.subtitle && <p className="text-white/60 text-sm md:text-base">{p.subtitle}</p>}
          {p.author && <p className="text-white/40 text-xs">{p.author}</p>}
        </div>
      )}
      {block.type === "content-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <h2 className={cn("font-semibold text-white mb-4", size)}>{p.title}</h2>
          <ul className="space-y-2">
            {(p.bullets || []).map((b: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-white/80 text-sm md:text-base">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
      {block.type === "quote-slide" && (
        <div className="text-center px-6 space-y-4">
          <p className={cn("text-white/90 italic leading-relaxed", viewport === "desktop" ? "text-2xl" : "text-lg")}>{String(p.quote ?? "").length ? `\u201C${p.quote}\u201D` : ""}</p>
          {p.citation && <p className="text-white/50 text-sm">— {p.citation}</p>}
        </div>
      )}
      {block.type === "two-column-slide" && (
        <div className="w-full h-full flex flex-col justify-center px-6 md:px-10">
          <h2 className={cn("font-semibold text-white mb-4", size)}>{p.title}</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-white/60 text-xs uppercase tracking-wide mb-2">{p.leftTitle}</h3>
              <ul className="space-y-1.5">
                {(p.left || []).map((b: string, i: number) => (
                  <li key={i} className="text-white/80 text-sm">• {b}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-white/60 text-xs uppercase tracking-wide mb-2">{p.rightTitle}</h3>
              <ul className="space-y-1.5">
                {(p.right || []).map((b: string, i: number) => (
                  <li key={i} className="text-white/80 text-sm">• {b}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {block.type === "closing-slide" && (
        <div className="text-center space-y-4">
          <h2 className={cn("font-semibold text-white", size)}>{p.title}</h2>
          {p.subtitle && <p className="text-white/60 text-base">{p.subtitle}</p>}
          {p.contact && <p className="text-white/40 text-sm">{p.contact}</p>}
        </div>
      )}
    </div>
  );
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
