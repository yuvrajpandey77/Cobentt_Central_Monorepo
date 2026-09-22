import type { PresentationPlan } from "./planner";

export interface ResolvedSlideAsset {
  slideIndex: number;
  url: string;
  kind: "upload" | "stock" | "url";
  label: string;
}

interface AttachmentRow {
  id: string;
  fileName: string;
  mimeType: string;
}

function scoreAttachment(fileName: string, query: string): number {
  const name = fileName.toLowerCase();
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  let score = 0;
  for (const w of words) if (name.includes(w)) score += 2;
  return score;
}

async function searchStock(query: string): Promise<{ url: string; label: string } | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      { headers: { Authorization: key }, signal: controller.signal }
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const body = (await res.json()) as { photos?: Array<{ src?: { large?: string }; alt?: string }> };
    const photo = body.photos?.[0];
    if (!photo?.src?.large) return null;
    return { url: photo.src.large, label: photo.alt || query };
  } catch {
    return null;
  }
}

/**
 * Asset resolution: visual need → candidates → relevance pick → url.
 * Graceful rule: unresolvable visuals return nothing (caller degrades the
 * slide to a typographic layout — NEVER a broken image).
 */
export async function resolveSlideAssets(
  plan: PresentationPlan,
  opts: {
    useSourceImages: boolean;
    attachments: AttachmentRow[];
  }
): Promise<ResolvedSlideAsset[]> {
  const out: ResolvedSlideAsset[] = [];
  const usedAttachments = new Set<string>();
  const images = opts.attachments.filter((a) => a.mimeType.startsWith("image/"));

  for (const slide of plan.slides) {
    if (slide.visual.need !== "photo") continue;
    const query = slide.visual.query || slide.message;

    if (opts.useSourceImages && images.length > 0) {
      const ranked = images
        .filter((a) => !usedAttachments.has(a.id))
        .map((a) => ({ a, s: scoreAttachment(a.fileName, query) }))
        .sort((x, y) => y.s - x.s);
      const pick = ranked[0]?.a ?? images.find((a) => !usedAttachments.has(a.id));
      if (pick) {
        usedAttachments.add(pick.id);
        out.push({ slideIndex: slide.index, url: `/api/attachments/${pick.id}`, kind: "upload", label: pick.fileName });
        continue;
      }
    }

    const stock = await searchStock(query);
    if (stock) {
      out.push({ slideIndex: slide.index, url: stock.url, kind: "stock", label: stock.label });
    }
    // else: no asset — composer must degrade to visual.need none.
  }
  return out;
}

/** Prompt fragment telling the composer which assets were resolved. */
export function assetPromptFragment(assets: ResolvedSlideAsset[]): string {
  if (assets.length === 0) {
    return `No external images were resolved. Set "visual".need to "none" on every slide and use typographic/chart/diagram layouts instead. NEVER invent image URLs.`;
  }
  const lines = assets.map((a) => `- Slide ${a.slideIndex}: ${a.url} (${a.kind}: ${a.label})`);
  return `Resolved image assets (use EXACTLY these URLs in "props".url for the matching slide; do not invent others):\n${lines.join("\n")}\nSlides without a listed asset MUST use visual.need "none" with a typographic layout.`;
}
