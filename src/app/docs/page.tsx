import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Settings2,
  Search,
  ShieldCheck,
  GitBranch,
  Users,
  FileText,
  Wand2,
  FolderGit2,
  Network,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import FeedbackButtons from "@/app/docs/FeedbackButtons";
import SearchBox from "./SearchBox";

interface PageProps {
  searchParams?: Promise<{ file?: string }>;
}

const DOCS_ROOT = path.join(process.cwd(), "docs");
const docCache = new Map<string, { mtimeMs: number; content: string }>();
let groupsCached: { folder: string; files: string[] }[] | null = null;
const indexCache = new Map<string, { items: { path: string; title: string; excerpt: string }[] }>();

function listDocs(): { folder: string; files: string[] }[] {
  if (groupsCached) return groupsCached;
  if (!fs.existsSync(DOCS_ROOT)) return [];
  const entries = fs.readdirSync(DOCS_ROOT, { withFileTypes: true });
  const groups: { folder: string; files: string[] }[] = [];

  if (entries.find((e) => e.isFile() && e.name.toLowerCase() === "readme.md")) {
    groups.push({ folder: "root", files: ["README.md"] });
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = path.join(DOCS_ROOT, entry.name);
      const files = fs
        .readdirSync(dirPath)
        .filter((f) => f.toLowerCase().endsWith(".md"))
        .map((f) => `${entry.name}/${f}`);
      if (files.length > 0) groups.push({ folder: entry.name, files });
    }
  }
  groupsCached = groups;
  return groups;
}

function readMarkdownFile(relPath: string): string | null {
  try {
    const abs = path.join(DOCS_ROOT, relPath);
    if (!abs.startsWith(DOCS_ROOT)) return null;
    const stat = fs.statSync(abs);
    const cached = docCache.get(abs);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.content;
    }
    const content = fs.readFileSync(abs, "utf8");
    docCache.set(abs, { mtimeMs: stat.mtimeMs, content });
    return content;
  } catch {
    return null;
  }
}

function renderBasicMarkdown(md: string): string {
  // very small subset: headings, lists, code fences, paragraphs, links, inline code
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let inCode = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html += "</code></pre>";
        inCode = false;
      } else {
        const lang = line.slice(3).trim();
        html += `<pre class=\"rounded-md bg-zinc-950/95 text-zinc-100 p-4 overflow-x-auto text-sm mb-4\"><code class=\"language-${lang}\">`;
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html += line.replaceAll("&", "&amp;").replaceAll("<", "&lt;") + "\n";
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      const text = h[2];
      const id = slugify(text);
      html += `<h${lvl} id="${id}" class="scroll-mt-24">${inline(text)}</h${lvl}>`;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      // single-level list
      html += `<ul class=\"list-disc pl-6 mb-2\"><li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li></ul>`;
      continue;
    }
    if (line.trim() === "") {
      html += "";
      continue;
    }
    html += `<p class=\"leading-7 text-muted-foreground\">${inline(line)}</p>`;
  }
  return html;
}

function inline(t: string): string {
  let out = t;
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</code>`);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href=\"${href}\" class=\"underline\">${label}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`);
  out = out.replace(/\*([^*]+)\*/g, (_, i) => `<em>${i}</em>`);
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

export default async function DocsPage({ searchParams }: PageProps) {
  const groups = listDocs();
  const sp = await searchParams;
  const selected = sp?.file ?? "README.md";
  const content = readMarkdownFile(selected) ?? "# Not found\nThe selected document does not exist.";
  const html = renderBasicMarkdown(content);

  // Derive page title from the first markdown heading, fallback to file name
  const firstHeadingMatch = /^(?:#|##|###)\s+(.+)$/m.exec(content);
  const pageTitle = firstHeadingMatch?.[1] ?? selected.split("/").pop()?.replace(/\.md$/i, "") ?? "Docs";
  const sectionLabel = selected.includes("/") ? selected.split("/")[0].replace(/[-_]/g, " ") : "Documentation";

  // Build a lightweight table of contents from h2/h3
  const toc: { id: string; text: string; level: number }[] = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = headingRegex.exec(content))) {
    const level = m[1].length;
    const text = m[2].trim();
    toc.push({ id: slugify(text), text, level });
  }

  // Build and cache search index once per doc mtimes snapshot
  const snapshotKey = JSON.stringify(
    groups.flatMap(({ files }) => files).map((f) => {
      const abs = path.join(DOCS_ROOT, f);
      try {
        return [f, fs.statSync(abs).mtimeMs];
      } catch {
        return [f, 0];
      }
    })
  );
  let searchIndex: { path: string; title: string; excerpt: string }[] | undefined = indexCache.get(snapshotKey)?.items;
  if (!searchIndex) {
    searchIndex = groups.flatMap(({ files }) => files).map((f) => {
      const md = readMarkdownFile(f) ?? "";
      const titleMatch = /^(?:#|##|###)\s+(.+)$/m.exec(md || "");
      const title = titleMatch?.[1] ?? f.split("/").pop()?.replace(/\.md$/i, "") ?? f;
      const plain = md
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
        .replace(/[#*_>`]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const excerpt = plain.slice(0, 160);
      return { path: f, title, excerpt };
    });
    indexCache.set(snapshotKey, { items: searchIndex });
  }

  return (
    <div className="">
      {/* Top Navigation */}
      <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-black/50 bg-[#121212]/70 border-b border-white/10">
        <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image src="/cogerpherelogoonly.jpg" alt="Cogerphere" width={28} height={28} className="rounded" />
            <span className="text-sm font-semibold tracking-wide">COGERPHERE Docs</span>
          </div>
          {/* Search */}
          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <SearchBox index={searchIndex} />
          </div>
          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/customDesigns/support" className="hidden sm:inline-flex h-9 items-center px-3 rounded-md border border-white/15 hover:bg-white/5 text-sm">
              Contact support
            </Link>
            <Link href="/" className="inline-flex h-9 items-center px-3 rounded-md bg-[#00AEEF] text-black font-medium hover:brightness-110">
              Open app
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_240px] gap-6 w-full">
      <aside className="hidden lg:flex flex-col sticky top-20 self-start h-[calc(100vh-6rem)] overflow-auto pr-2">
        <div className="rounded-xl p-3 bg-gradient-to-b from-[#1C1C1C] to-[#121212] border border-white/10 shadow-2xl shadow-black/30">
        <nav className="space-y-4 text-sm">
          {groups.map(({ folder, files }) => (
            <div key={folder}>
              <div className="text-xs uppercase text-muted-foreground tracking-wide mb-2">{folder}</div>
              <ul className="space-y-1">
                {files.map((f) => {
                  const isActive = selected === f;
                  const label = f.split("/").pop()?.replace(/\.md$/i, "") || f;
                  const icon = getIconFor(label);
                  return (
                    <li key={f}>
                      <Link
                        href={{ pathname: "/docs", query: { file: f } }}
                        className={`group relative flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
                          isActive
                            ? "bg-white/10 ring-1 ring-[#00AEEF]/40"
                            : "hover:bg-white/5"
                        }`}
                      >
                        {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00AEEF] rounded-r blur-[0.5px]" />}
                        <span className="shrink-0 text-white/70">{icon}</span>
                        <span className={`truncate ${isActive ? "font-medium" : ""}`}>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        </div>
      </aside>

      <main className="prose prose-neutral dark:prose-invert max-w-none prose-pre:p-0 prose-code:before:content-[''] prose-code:after:content-['']">
        <header className="mb-6 border-b pb-4">
          <div className="text-sm text-muted-foreground mb-2">{sectionLabel}</div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0 text-3xl font-semibold tracking-tight">{pageTitle}</h1>
            {/* Plan badge mimic */}
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white/5 border-white/10 text-white/80">
              <Info className="h-3.5 w-3.5" /> This feature is available on the Ultimate site plan.
            </span>
          </div>
        </header>
        {/* Subtitle and description */}
        <p className="mt-0 text-[15px] text-white/80">
          Deliver a tailored documentation experience based on who’s reading.
        </p>

        {/* Decorative illustration / gradient card */}
        <div className="my-6 rounded-xl border border-white/10 overflow-hidden shadow-lg bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-fuchsia-500/20">
          <div className="h-56 sm:h-72 w-full bg-[radial-gradient(700px_200px_at_50%_-20%,rgba(124,58,237,0.35),transparent),radial-gradient(400px_200px_at_80%_20%,rgba(0,174,239,0.35),transparent)]" />
        </div>
        {/* eslint-disable-next-line react/no-danger */}
        <div className="prose-headings:scroll-mt-24" dangerouslySetInnerHTML={{ __html: html }} />

        {/* Helpful feedback row */}
        <div className="mt-10 pt-6 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Was this helpful?</span>
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-md border hover:bg-accent/50" aria-label="Helpful">🙂</button>
            <button className="h-8 w-8 rounded-md border hover:bg-accent/50" aria-label="Neutral">😐</button>
            <button className="h-8 w-8 rounded-md border hover:bg-accent/50" aria-label="Not helpful">🙁</button>
          </div>
        </div>
      </main>

      {/* Right rail: actions and ToC */}
      <aside className="hidden xl:block sticky top-20 self-start h-[calc(100vh-6rem)] pl-2">
        <div className="flex items-center justify-end mb-4">
          <Link href="/customDesigns/support" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent/50 text-sm">Ask</Link>
        </div>
        <div className="rounded-md border bg-card/50 p-3 text-sm">
          <div className="mb-2">Was this helpful?</div>
          <FeedbackButtons pagePath={selected} alignment="row" />
        </div>
        {toc.length > 0 && (
          <div className="mt-6 text-sm">
            <div className="text-xs uppercase text-muted-foreground tracking-wide mb-2">On this page</div>
            <ul className="space-y-1">
              {toc.map((h) => (
                <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                  <a href={`#${h.id}`} className="text-muted-foreground hover:text-foreground">{h.text}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      </div>

      {/* Bottom-right theme toggle */}
      <ThemeToggle />
    </div>
  );
}

function getIconFor(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("guide") || lower.includes("docs")) return <BookOpen className="h-4 w-4" />;
  if (lower.includes("api") || lower.includes("schema")) return <Layers className="h-4 w-4" />;
  if (lower.includes("auth") || lower.includes("secure")) return <ShieldCheck className="h-4 w-4" />;
  if (lower.includes("collab") || lower.includes("team")) return <Users className="h-4 w-4" />;
  if (lower.includes("change") || lower.includes("changelog")) return <GitBranch className="h-4 w-4" />;
  if (lower.includes("config") || lower.includes("settings")) return <Settings2 className="h-4 w-4" />;
  if (lower.includes("ai") || lower.includes("assistant")) return <Sparkles className="h-4 w-4" />;
  if (lower.includes("server") || lower.includes("network")) return <Network className="h-4 w-4" />;
  if (lower.includes("repo") || lower.includes("git")) return <FolderGit2 className="h-4 w-4" />;
  if (lower.includes("magic") || lower.includes("auto")) return <Wand2 className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}


