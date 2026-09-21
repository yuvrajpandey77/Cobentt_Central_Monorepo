/**
 * Web Search pipeline (first-class research capability):
 * Query Understanding → Query Generation → Search → Source Evaluation →
 * Filtering → Deduplication → Relevance Ranking → Evidence Extraction →
 * Answer-context generation.
 *
 * Providers (in order): Tavily (if key) → Serper (if key) → SearXNG (if
 * configured) → DuckDuckGo Instant Answer + html (no key, default).
 * Never throws for missing keys — degrades gracefully.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedAt?: string;
  score: number;
  sourceTier: number; // 1 (best) .. 6 (weakest)
  sourceLabel: string;
}

export interface SearchPipelineOutput {
  query: string;
  queries: string[];
  results: SearchResult[];
  evidence: string;
  answerContext: string;
  provider: string;
  durationMs: number;
  reformulated: boolean;
  failed: boolean;
  failReason?: string;
}

// ---------------------------------------------------------------------------
// Query understanding + generation
// ---------------------------------------------------------------------------

const STOP = new Set("what,whats,when,where,which,who,whom,whose,why,how,is,are,was,were,do,does,did,can,could,should,would,the,a,an,and,or,of,to,in,on,for,with,about,tell,explain,give,show,find,get,please".split(","));

export function generateQueries(message: string, historyText = ""): string[] {
  const clean = message.replace(/[?"'“”‘’]/g, "").replace(/\s+/g, " ").trim();
  const core = clean.length > 220 ? clean.slice(0, 220) : clean;
  const queries = [core];
  // Entity-preserving reformulation: strip question scaffolding.
  const stripped = core
    .replace(/^(what('s| is)?|who is|when did|where is|how (much|many)|tell me about|search for|find|look up|check)\b/i, "")
    .replace(/\b(today|right now|currently|latest|recent)\b/gi, "")
    .replace(/\s+/g, " ").trim();
  if (stripped && stripped.toLowerCase() !== core.toLowerCase() && stripped.length > 8) {
    queries.push(stripped);
  }
  // Freshness-anchored variant for temporal queries.
  if (/\blatest|current|today|recent|price|news|release\b/i.test(message)) {
    const year = new Date().getUTCFullYear();
    if (!stripped.includes(String(year))) queries.push(`${stripped} ${year}`.trim());
  }
  // Context-carrying variant for follow-ups ("that", "it").
  if (/\b(that|it|this)\b/i.test(message) && historyText) {
    const ctx = historyText.split(" ").filter((w) => !STOP.has(w.toLowerCase())).slice(-12).join(" ");
    if (ctx) queries.push(`${stripped} ${ctx}`.trim().slice(0, 200));
  }
  return [...new Set(queries)].slice(0, 3);
}

// ---------------------------------------------------------------------------
// Source evaluation — prefer official / primary / gov / academic
// ---------------------------------------------------------------------------

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

const OFFICIAL_HINTS = ["docs.", "developer.", "support.", "help.", "blog.", "github.com", "gitlab.com"];
const GOV = [".gov", ".mil", ".europa.eu", ".gov.uk", ".gc.ca"];
const ACADEMIC = [".edu", "arxiv.org", "nature.com", "science.org", "ieee.org", "acm.org", "pubmed", "scholar.google"];
const REPUTABLE = ["reuters.com", "apnews.com", "bbc.", "nytimes.com", "wsj.com", "bloomberg.com", "ft.com", "theverge.com", "techcrunch.com", "wired.com", "arstechnica.com", "forbes.com", "cnbc.com", "coindesk.com", "cointelegraph.com"];
const TECH = ["stackoverflow.com", "developer.mozilla.org", "medium.com", "dev.to", "docs.python.org", "nodejs.org", "react.dev", "nextjs.org", "typescriptlang.org", "kubernetes.io", "docker.com"];
const SEO_SPAM = ["content-farm", "top10", "best-deals", "clickbank", "ezine", "articlesbase"];

export function evaluateSource(url: string, title: string): { tier: number; label: string; boost: number } {
  const d = domainOf(url);
  if (!d) return { tier: 6, label: "Unknown", boost: 0 };
  if (SEO_SPAM.some((s) => d.includes(s))) return { tier: 6, label: "Low-quality", boost: -0.4 };
  if (GOV.some((s) => d.endsWith(s) || d.includes(s))) return { tier: 2, label: "Government", boost: 0.3 };
  if (ACADEMIC.some((s) => d.includes(s))) return { tier: 3, label: "Academic", boost: 0.3 };
  if (REPUTABLE.some((s) => d.includes(s))) return { tier: 4, label: "Reputable press", boost: 0.25 };
  if (TECH.some((s) => d.includes(s))) return { tier: 5, label: "Technical", boost: 0.2 };
  if (OFFICIAL_HINTS.some((s) => d.includes(s) || url.includes(s))) return { tier: 1, label: "Official docs", boost: 0.35 };
  // Company/product primary source heuristic: short domain + title mentions entity.
  if (d.split(".").length <= 2 && title.length > 10) return { tier: 2, label: "Primary source", boost: 0.15 };
  return { tier: 5, label: "Web", boost: 0 };
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally { clearTimeout(t); }
}

async function viaTavily(query: string): Promise<{ results: SearchResult[]; provider: string } | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetchWithTimeout("https://api.tavily.com/search", 12000, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, search_depth: "advanced", max_results: 8, include_answer: false }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results: SearchResult[] = (data.results ?? []).map((r: { title?: string; url?: string; content?: string; published_date?: string; score?: number }) => {
      const ev = evaluateSource(r.url ?? "", r.title ?? "");
      return {
        title: r.title ?? r.url ?? "Untitled", url: r.url ?? "", snippet: (r.content ?? "").slice(0, 400),
        domain: domainOf(r.url ?? ""), publishedAt: r.published_date, score: (r.score ?? 0.5) + ev.boost,
        sourceTier: ev.tier, sourceLabel: ev.label,
      };
    });
    return { results, provider: "tavily" };
  } catch { return null; }
}

async function viaSerper(query: string): Promise<{ results: SearchResult[]; provider: string } | null> {
  const key = process.env.SERPER_API_KEY ?? process.env.SERPER_KEY;
  if (!key) return null;
  try {
    const res = await fetchWithTimeout("https://google.serper.dev/search", 12000, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: query, num: 8 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const organic = data.organic ?? [];
    const results: SearchResult[] = organic.map((r: { title?: string; link?: string; snippet?: string; date?: string }) => {
      const ev = evaluateSource(r.link ?? "", r.title ?? "");
      return {
        title: r.title ?? r.link ?? "Untitled", url: r.link ?? "", snippet: (r.snippet ?? "").slice(0, 400),
        domain: domainOf(r.link ?? ""), publishedAt: r.date, score: 0.5 + ev.boost,
        sourceTier: ev.tier, sourceLabel: ev.label,
      };
    });
    return { results, provider: "serper" };
  } catch { return null; }
}

async function viaDuckDuckGo(query: string): Promise<{ results: SearchResult[]; provider: string }> {
  const results: SearchResult[] = [];
  // 1) Instant Answer API (no key, CORS-friendly server-side).
  try {
    const res = await fetchWithTimeout(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, 10000);
    if (res.ok) {
      const data = await res.json();
      const push = (title: string, url: string, snippet: string) => {
        if (!url || !url.startsWith("http")) return;
        const ev = evaluateSource(url, title);
        results.push({ title, url, snippet: snippet.slice(0, 400), domain: domainOf(url), score: 0.45 + ev.boost, sourceTier: ev.tier, sourceLabel: ev.label });
      };
      if (data.AbstractText && data.AbstractURL) push(data.Heading || data.AbstractSource || query, data.AbstractURL, data.AbstractText);
      for (const t of (data.Results ?? []).slice(0, 4)) push(t.Text ?? t.Result ?? query, t.FirstURL ?? "", t.Text ?? "");
      for (const cat of (data.RelatedTopics ?? []).slice(0, 6)) {
        if (cat.FirstURL) push(cat.Text ?? query, cat.FirstURL, cat.Text ?? "");
      }
    }
  } catch { /* fall through to html */ }
  // 2) HTML endpoint for real web hits.
  if (results.length < 4) {
    try {
      const res = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 12000, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Cobentt/1.0; research)" },
      });
      if (res.ok) {
        const html = await res.text();
        const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,600}?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>|<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m: RegExpExecArray | null;
        let count = 0;
        const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").trim().slice(0, 400);
        while ((m = re.exec(html)) && count < 8) {
          const href = m[1] || m[4] || "";
          const title = strip(m[2] || m[5] || "");
          if (!href.startsWith("http") || !title) continue;
          const ev = evaluateSource(href, title);
          results.push({ title, url: href, snippet: title, domain: domainOf(href), score: 0.4 + ev.boost, sourceTier: ev.tier, sourceLabel: ev.label });
          count++;
        }
      }
    } catch { /* graceful */ }
  }
  return { results, provider: "duckduckgo" };
}

// ---------------------------------------------------------------------------
// Filtering → dedup → ranking → evidence
// ---------------------------------------------------------------------------

function dedupe(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = r.url.replace(/[#?].*$/, "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function rank(query: string, results: SearchResult[]): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  return results
    .map((r) => {
      const hay = `${r.title} ${r.snippet}`.toLowerCase();
      const overlap = terms.filter((t) => hay.includes(t)).length / Math.max(1, terms.length);
      return { ...r, score: Math.round((r.score * 0.6 + overlap * 0.4 + (6 - r.sourceTier) * 0.03) * 100) / 100 };
    })
    .filter((r) => r.title && r.url)
    .sort((a, b) => a.sourceTier - b.sourceTier || b.score - a.score)
    .slice(0, 8);
}

export function buildEvidence(results: SearchResult[]): { evidence: string; answerContext: string } {
  const top = results.slice(0, 6);
  const evidence = top.map((r, i) => `[${i + 1}] ${r.title} — ${r.domain} (${r.sourceLabel})\n${r.url}\n${r.snippet}`).join("\n\n");
  const answerContext = [
    "Use the web sources below as ground truth for current/external facts. Cite them inline as [1], [2], etc.",
    "Prefer official/primary sources when they conflict with weaker ones. Do not invent facts beyond these sources;",
    "if the sources are insufficient, say what is unknown.",
    "",
    ...top.map((r, i) => `[${i + 1}] ${r.title} (${r.domain}): ${r.snippet} — ${r.url}`),
  ].join("\n");
  return { evidence, answerContext };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function runWebSearchPipeline(message: string, historyText = ""): Promise<SearchPipelineOutput> {
  const start = Date.now();
  const queries = generateQueries(message, historyText);
  let results: SearchResult[] = [];
  let provider = "none";

  for (const q of queries) {
    const t = await viaTavily(q);
    if (t && t.results.length > 0) { results = t.results; provider = t.provider; break; }
    const s = await viaSerper(q);
    if (s && s.results.length > 0) { results = s.results; provider = s.provider; break; }
    const d = await viaDuckDuckGo(q);
    if (d.results.length > 0) { results = [...results, ...d.results]; provider = d.provider; }
    if (results.length >= 5) break;
  }

  let reformulated = false;
  if (results.length < 3 && queries.length > 0) {
    // Reformulate once: broaden with synonyms, drop quoted phrases.
    const broad = queries[0].replace(/["']/g, "").split(" ").slice(0, 6).join(" ");
    if (broad && broad !== queries[0]) {
      const retry = await viaDuckDuckGo(broad);
      if (retry.results.length > results.length) { results = retry.results; provider = retry.provider; reformulated = true; }
    }
  }

  const ranked = rank(queries[0] ?? message, dedupe(results));
  if (ranked.length === 0) {
    return {
      query: queries[0] ?? message, queries, results: [], evidence: "", answerContext: "",
      provider, durationMs: Date.now() - start, reformulated, failed: true,
      failReason: "No usable web results from any provider.",
    };
  }
  const { evidence, answerContext } = buildEvidence(ranked);
  return {
    query: queries[0] ?? message, queries, results: ranked, evidence, answerContext,
    provider, durationMs: Date.now() - start, reformulated, failed: false,
  };
}
