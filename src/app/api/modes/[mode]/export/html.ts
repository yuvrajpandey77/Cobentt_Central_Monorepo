import { getSlideTheme, type DynamicSlideTheme } from "@/lib/modes/slide-themes";

type Artifact = { title?: string; theme?: string; themeConfig?: unknown; blocks?: Array<{ type?: string; props?: Record<string, unknown> }> };

const escapeHtml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function resolvePalette(artifact: Artifact): DynamicSlideTheme {
  const custom = (artifact.themeConfig && typeof artifact.themeConfig === "object"
    ? artifact.themeConfig
    : null) as Partial<DynamicSlideTheme> | null;
  return getSlideTheme(artifact.theme, custom);
}

function list(items: unknown): string {
  if (!Array.isArray(items)) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function listObj(items: unknown, pick: (o: Record<string, unknown>) => string): string {
  if (!Array.isArray(items)) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(typeof item === "string" ? item : pick((item ?? {}) as Record<string, unknown>))}</li>`).join("")}</ul>`;
}

function slide(block: NonNullable<Artifact["blocks"]>[number]): string {
  const p = block.props ?? {};
  switch (block.type) {
    case "title-slide": return `<section class="slide title"><div class="rule"></div><h1>${escapeHtml(p.title)}</h1><p>${escapeHtml(p.subtitle)}</p><small>${escapeHtml(p.author)}</small></section>`;
    case "content-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2>${list(p.bullets)}</section>`;
    case "quote-slide": return `<section class="slide quote"><blockquote>“${escapeHtml(p.quote)}”</blockquote><p>${escapeHtml(p.citation)}</p></section>`;
    case "two-column-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2><div class="columns"><div><h3>${escapeHtml(p.leftTitle)}</h3>${list(p.left)}</div><div><h3>${escapeHtml(p.rightTitle)}</h3>${list(p.right)}</div></div></section>`;
    case "stat-slide": return `<section class="slide stat"><h2>${escapeHtml(p.title)}</h2><strong>${escapeHtml(p.value)}<em>${escapeHtml(p.suffix)}</em></strong><p>${escapeHtml(p.note)}</p></section>`;
    case "agenda-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2>${list(p.items)}</section>`;
    case "closing-slide": return `<section class="slide title"><div class="rule"></div><h1>${escapeHtml(p.title)}</h1><p>${escapeHtml(p.subtitle)}</p><small>${escapeHtml(p.contact)}</small></section>`;
    case "statement-slide": return `<section class="slide"><p style="color:var(--accent);text-transform:uppercase;letter-spacing:.15em">${escapeHtml(p.overline)}</p><h1>${escapeHtml(p.headline)}</h1><p>${escapeHtml(p.sub)}</p></section>`;
    case "editorial-slide": return `<section class="slide"><p style="color:var(--accent);text-transform:uppercase;letter-spacing:.15em">${escapeHtml(p.overline)}</p><h2>${escapeHtml(p.headline)}</h2><p style="color:var(--text)">${escapeHtml(p.lede)}</p><p>${escapeHtml(p.body)}</p>${p.stat ? `<p><strong style="color:var(--accent);font-size:2em">${escapeHtml(p.stat)}</strong> ${escapeHtml(p.statLabel)}</p>` : ""}</section>`;
    case "media-split-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2><div class="columns"><div><p>${escapeHtml(p.body)}</p>${list(p.bullets)}</div><div>${p.url ? `<img src="${escapeHtml(p.url)}" alt="" style="width:100%;border-radius:12px"/>` : ""}</div></div></section>`;
    case "bleed-slide": return `<section class="slide" style="${p.url ? `background-image:url(${escapeHtml(p.url)});background-size:cover;background-position:center;` : ""}"><div class="rule"></div><h1>${escapeHtml(p.title)}</h1><p>${escapeHtml(p.subtitle)}</p></section>`;
    case "timeline-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2>${listObj(p.items, (o) => `${o.date ? `${o.date} — ` : ""}${o.label || ""}${o.detail ? `: ${o.detail}` : ""}`)}</section>`;
    case "process-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2>${listObj(p.steps, (o) => `${o.label || ""}${o.detail ? ` — ${o.detail}` : ""}`)}</section>`;
    case "compare-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2><div class="columns"><div><h3>${escapeHtml(p.leftTitle)}</h3>${list(p.left)}</div><div><h3>${escapeHtml(p.rightTitle)}</h3>${list(p.right)}</div></div><p>${escapeHtml(p.verdict)}</p></section>`;
    case "chart-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2>${listObj(p.labels, (o) => String(o))}<p>${escapeHtml(p.note)}</p></section>`;
    case "diagram-slide": return `<section class="slide"><h2>${escapeHtml(p.title)}</h2>${listObj(p.nodes, (o) => `${o.label || ""}${o.detail ? ` — ${o.detail}` : ""}`)}</section>`;
    default: return `<section class="slide"><h2>${escapeHtml(p.title || block.type)}</h2>${list(p.items || p.steps || p.bullets)}</section>`;
  }
}

/** Canvas-identical backdrop recipe, expressed in standalone CSS. */
function backdropCss(p: DynamicSlideTheme): string {
  const glowA = `color-mix(in srgb, ${p.accent} 22%, transparent)`;
  const glowB = `color-mix(in srgb, ${p.accent2} 22%, transparent)`;
  const base = `linear-gradient(135deg, ${p.bg} 0%, ${p.bg2} 100%)`;
  switch (p.backdrop) {
    case "aurora":
      return `background:radial-gradient(90% 70% at 50% -10%, ${glowA} 0%, transparent 60%),radial-gradient(70% 90% at 85% 110%, ${glowB} 0%, transparent 55%),${base};`;
    case "grid":
      return `background:${base};background-image:linear-gradient(color-mix(in srgb, ${p.accent} 10%, transparent) 1px, transparent 1px),linear-gradient(90deg, color-mix(in srgb, ${p.accent} 10%, transparent) 1px, transparent 1px);background-size:44px 44px,44px 44px;`;
    case "dots":
      return `background-image:radial-gradient(color-mix(in srgb, ${p.accent} 22%, transparent) 1.2px, transparent 1.2px),${base};background-size:22px 22px,cover;`;
    case "lines":
      return `background-image:repeating-linear-gradient(0deg, color-mix(in srgb, ${p.accent} 8%, transparent) 0 1px, transparent 1px 14px),${base};`;
    case "diagonal":
      return `background:linear-gradient(115deg, color-mix(in srgb, ${p.accent} 28%, transparent) 0%, transparent 32%),linear-gradient(115deg, transparent 62%, color-mix(in srgb, ${p.accent2} 25%, transparent) 100%),${base};`;
    case "paper":
      return `background:radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 60%),repeating-linear-gradient(0deg, rgba(127,127,127,0.08) 0 1px, transparent 1px 5px),${base};`;
    case "solid":
      return `background:${p.bg};`;
    case "mesh":
    default:
      return `background:radial-gradient(120% 120% at 12% 8%, ${glowA} 0%, transparent 46%),radial-gradient(100% 110% at 95% 95%, ${glowB} 0%, transparent 52%),${base};`;
  }
}

export function buildDeckHtml(artifact: Artifact): string {
  const palette = resolvePalette(artifact);
  const slides = (artifact.blocks ?? []).map(slide).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(artifact.title || "Cobentt deck")}</title><style>
:root{--bg:${palette.bg};--bg2:${palette.bg2};--accent:${palette.accent};--accent2:${palette.accent2};--text:${palette.text};--muted:${palette.muted};--chip:${palette.chip};--font-head:${palette.fontHeading},Inter,Arial,sans-serif;--font-body:${palette.fontBody},Inter,Arial,sans-serif;--radius:${palette.radius}px}*{box-sizing:border-box}body{margin:0;background:#050505;color:var(--text);font-family:var(--font-body);scroll-snap-type:y mandatory}.slide{scroll-snap-align:start;width:min(100vw,1280px);min-height:100vh;aspect-ratio:16/9;margin:auto;padding:9vw;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;${backdropCss(palette)}}.slide:after{content:"";position:absolute;inset:18px;border:1px solid color-mix(in srgb,var(--text) 10%,transparent);pointer-events:none}h1{font-family:var(--font-head);font-size:clamp(3rem,8vw,8rem);line-height:.93;letter-spacing:-.07em;margin:0;max-width:13ch}h2{font-family:var(--font-head);font-size:clamp(2rem,4.6vw,5rem);line-height:.98;letter-spacing:-.055em;margin:0 0 3rem;max-width:17ch}h3{color:var(--accent);font-size:1rem;text-transform:uppercase;letter-spacing:.12em}p,li{font-size:clamp(1rem,1.7vw,1.5rem);line-height:1.45;color:var(--muted)}ul{padding-left:1.2em;max-width:35ch}li{margin:.7em 0}.rule{width:8rem;height:.45rem;background:linear-gradient(90deg,var(--accent),var(--accent2));margin-bottom:3rem}.title small{margin-top:3rem;color:var(--muted);font-size:1rem}.columns{display:grid;grid-template-columns:1fr 1fr;gap:3rem;max-width:1000px}.columns>div{padding:2rem;border-radius:var(--radius);border:1px solid color-mix(in srgb,var(--accent) 24%,transparent);background:color-mix(in srgb,var(--bg) 75%,transparent)}.quote{text-align:center;align-items:center}.quote blockquote{font-family:var(--font-head);font-size:clamp(2.25rem,5vw,6rem);line-height:1.05;letter-spacing:-.06em;max-width:17ch;margin:0}.stat strong{font-family:var(--font-head);font-size:clamp(5rem,15vw,15rem);line-height:.8;letter-spacing:-.1em}.stat em{font-size:.25em;font-style:normal;color:var(--accent);letter-spacing:-.03em;margin-left:.15em}img{max-width:100%}
</style></head><body>${slides}</body></html>`;
}
