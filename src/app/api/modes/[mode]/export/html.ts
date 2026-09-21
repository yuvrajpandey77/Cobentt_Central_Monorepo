type Artifact = { title?: string; theme?: string; blocks?: Array<{ type?: string; props?: Record<string, unknown> }> };

const escapeHtml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const palettes: Record<string, { bg: string; accent: string; text: string; muted: string; chip: string }> = {
  midnight: { bg: "#0b1220", accent: "#38bdf8", text: "#f1f5f9", muted: "#94a3b8", chip: "#0ea5e9" },
  royal: { bg: "#1e1b4b", accent: "#a78bfa", text: "#faf5ff", muted: "#c4b5fd", chip: "#8b5cf6" },
  emerald: { bg: "#022c22", accent: "#34d399", text: "#ecfdf5", muted: "#6ee7b7", chip: "#10b981" },
  ocean: { bg: "#082f49", accent: "#22d3ee", text: "#ecfeff", muted: "#67e8f9", chip: "#06b6d4" },
  ink: { bg: "#fafafa", accent: "#171717", text: "#171717", muted: "#52525b", chip: "#404040" },
  crimson: { bg: "#2a0d0d", accent: "#f9a8d4", text: "#fff1f2", muted: "#fda4af", chip: "#f43f5e" },
  sunset: { bg: "#2a0a1a", accent: "#fb923c", text: "#fff7ed", muted: "#fdba74", chip: "#f97316" },
  berry: { bg: "#15002b", accent: "#22d3ee", text: "#fdf4ff", muted: "#d8b4fe", chip: "#d946ef" },
  "midnight-black": { bg: "#0a0a0a", accent: "#f5f5f5", text: "#ffffff", muted: "#a3a3a3", chip: "#d4d4d4" },
  forest: { bg: "#04130b", accent: "#fde047", text: "#ecfdf5", muted: "#86efac", chip: "#65a30d" },
  "slate-light": { bg: "#f8fafc", accent: "#1d4ed8", text: "#0f172a", muted: "#64748b", chip: "#3b82f6" },
  sand: { bg: "#1c1305", accent: "#fbbf24", text: "#fef3c7", muted: "#fde68a", chip: "#d97706" },
};

function list(items: unknown): string {
  if (!Array.isArray(items)) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
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
    default: return `<section class="slide"><h2>${escapeHtml(p.title || block.type)}</h2>${list(p.items || p.steps || p.bullets)}</section>`;
  }
}

export function buildDeckHtml(artifact: Artifact): string {
  const palette = palettes[artifact.theme ?? "midnight"] ?? palettes.midnight;
  const slides = (artifact.blocks ?? []).map(slide).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(artifact.title || "Cobentt deck")}</title><style>
:root{--bg:${palette.bg};--accent:${palette.accent};--text:${palette.text};--muted:${palette.muted};--chip:${palette.chip}}*{box-sizing:border-box}body{margin:0;background:#050505;color:var(--text);font-family:Inter,Arial,sans-serif;scroll-snap-type:y mandatory}.slide{scroll-snap-align:start;width:min(100vw,1280px);min-height:100vh;aspect-ratio:16/9;margin:auto;padding:9vw;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;background:radial-gradient(80% 100% at 0 0,color-mix(in srgb,var(--accent) 24%,transparent),transparent 55%),radial-gradient(80% 100% at 100% 100%,color-mix(in srgb,var(--chip) 28%,transparent),transparent 60%),var(--bg)}.slide:after{content:"";position:absolute;inset:18px;border:1px solid color-mix(in srgb,var(--text) 10%,transparent);pointer-events:none}h1{font-size:clamp(3rem,8vw,8rem);line-height:.93;letter-spacing:-.07em;margin:0;max-width:13ch}h2{font-size:clamp(2rem,4.6vw,5rem);line-height:.98;letter-spacing:-.055em;margin:0 0 3rem;max-width:17ch}h3{color:var(--accent);font-size:1rem;text-transform:uppercase;letter-spacing:.12em}p,li{font-size:clamp(1rem,1.7vw,1.5rem);line-height:1.45;color:var(--muted)}ul{padding-left:1.2em;max-width:35ch}li{margin:.7em 0}.rule{width:8rem;height:.45rem;background:linear-gradient(90deg,var(--accent),var(--chip));margin-bottom:3rem}.title small{margin-top:3rem;color:var(--muted);font-size:1rem}.columns{display:grid;grid-template-columns:1fr 1fr;gap:3rem;max-width:1000px}.columns>div{padding:2rem;border:1px solid color-mix(in srgb,var(--accent) 24%,transparent);background:color-mix(in srgb,var(--bg) 75%,transparent)}.quote{text-align:center;align-items:center}.quote blockquote{font-size:clamp(2.25rem,5vw,6rem);line-height:1.05;letter-spacing:-.06em;max-width:17ch;margin:0}.stat strong{font-size:clamp(5rem,15vw,15rem);line-height:.8;letter-spacing:-.1em}.stat em{font-size:.25em;font-style:normal;color:var(--accent);letter-spacing:-.03em;margin-left:.15em}@media(max-width:700px){.slide{padding:2rem;min-height:56.25vw}.columns{gap:1rem}.columns>div{padding:1rem}.slide:after{inset:8px}}
</style></head><body>${slides}</body></html>`;
}
