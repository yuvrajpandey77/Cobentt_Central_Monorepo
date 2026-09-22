import PptxGenJS from "pptxgenjs";
import { getSlideTheme, type DynamicSlideTheme } from "@/lib/modes/slide-themes";

type Palette = { bg: string; accent: string; text: string; muted: string; chip: string; fontHeading?: string };

function resolveTheme(artifact: { theme?: string; themeConfig?: unknown }): Palette {
  const custom = (artifact.themeConfig && typeof artifact.themeConfig === "object"
    ? artifact.themeConfig
    : null) as Partial<DynamicSlideTheme> | null;
  const t = getSlideTheme(artifact.theme, custom);
  return { bg: t.bg, accent: t.accent, text: t.text, muted: t.muted, chip: t.chip, fontHeading: t.fontHeading };
}

// Resolve the effective text color for an element given optional per-block style.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textColor(blockStyle: any, theme: Palette, fallback: string): string {
  if (blockStyle?.color) return strip(blockStyle.color);
  return fallback;
}

function strip(hex: string): string {
  return String(hex || "").replace("#", "").toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildPptx(artifact: any): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";

  const theme = resolveTheme(artifact);
  const tAccent = strip(theme.accent);

  const blocks = Array.isArray(artifact.blocks) ? artifact.blocks : [];

  // Sane default text colors so light themes (ink, slate-light) stay readable.
  const isDark = isDarkHex(theme.bg);
  const titleCol = isDark ? "FFFFFF" : "111827";
  const bodyCol = isDark ? "E4E4E7" : "374151";
  const accentCol = isDark ? tAccent : tAccent;
  const dimCol = isDark ? "A1A1AA" : "6B7280";

  for (const block of blocks) {
    const p = block.props || {};
    const color = (fallback: string) => textColor(block.style, theme, fallback);
    const slide = pptx.addSlide();
    slide.background = { color: strip(theme.bg) };

    switch (block.type) {
      case "title-slide": {
        const accent = strip(p.accentColor || theme.accent);
        slide.addShape(pptx.ShapeType.rect, {
          x: 5.97, y: 2.35, w: 1.4, h: 0.08, fill: { color: accent }, line: { color: accent },
        });
        slide.addText(color(p.title) || "", {
          x: 0.5, y: 2.5, w: 12.3, h: 1.2,
          fontSize: 40, bold: true, color: color(titleCol), align: "center",
        });
        if (p.subtitle) {
          slide.addText(p.subtitle, { x: 0.5, y: 3.9, w: 12.3, h: 0.6, fontSize: 18, color: color(bodyCol), align: "center" });
        }
        if (p.author) {
          slide.addText(p.author, { x: 0.5, y: 4.7, w: 12.3, h: 0.4, fontSize: 12, color: color(dimCol), align: "center" });
        }
        break;
      }
      case "content-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        slide.addText(
          (Array.isArray(p.bullets) ? p.bullets : []).map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 16, color: color(bodyCol) }
        );
        break;
      case "quote-slide":
        slide.addText(`"${p.quote || ""}"`, { x: 0.7, y: 2.6, w: 12, h: 1.5, fontSize: 22, italic: true, color: color(titleCol), align: "center" });
        if (p.citation) {
          slide.addText(`— ${p.citation}`, { x: 0.7, y: 4.3, w: 12, h: 0.5, fontSize: 14, color: color(accentCol), align: "center" });
        }
        break;
      case "two-column-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        slide.addText(p.leftTitle || "Left", { x: 0.7, y: 1.6, w: 5.5, h: 0.5, fontSize: 14, bold: true, color: color(accentCol) });
        slide.addText(
          (Array.isArray(p.left) ? p.left : []).map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 0.7, y: 2.2, w: 5.5, h: 4.5, fontSize: 14, color: color(bodyCol) }
        );
        slide.addText(p.rightTitle || "Right", { x: 7, y: 1.6, w: 5.5, h: 0.5, fontSize: 14, bold: true, color: color(accentCol) });
        slide.addText(
          (Array.isArray(p.right) ? p.right : []).map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 7, y: 2.2, w: 5.5, h: 4.5, fontSize: 14, color: color(bodyCol) }
        );
        break;
      case "closing-slide":
        slide.addText(p.title || "", { x: 0.5, y: 2.6, w: 12.3, h: 1.2, fontSize: 40, bold: true, color: color(titleCol), align: "center" });
        if (p.subtitle) {
          slide.addText(p.subtitle, { x: 0.5, y: 4, w: 12.3, h: 0.6, fontSize: 18, color: color(bodyCol), align: "center" });
        }
        if (p.contact) {
          slide.addText(p.contact, { x: 0.5, y: 4.8, w: 12.3, h: 0.4, fontSize: 12, color: color(dimCol), align: "center" });
        }
        break;
      case "stat-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.7, w: 12, h: 0.8, fontSize: 26, bold: true, color: color(titleCol) });
        slide.addText(
          [
            { text: p.value || "", options: { bold: true, fontSize: 88, color: color(titleCol), align: "center" } },
            { text: p.suffix ? ` ${p.suffix}` : "", options: { bold: true, fontSize: 36, color: color(accentCol), align: "center" } },
          ],
          { x: 0.7, y: 2.6, w: 12, h: 1.8, align: "center", valign: "middle" }
        );
        if (p.note) {
          slide.addText(p.note, { x: 0.7, y: 4.8, w: 12, h: 0.6, fontSize: 14, color: color(bodyCol), align: "center" });
        }
        break;
      case "agenda-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        slide.addText(
          (Array.isArray(p.items) ? p.items : []).map((b: string, i: number) => ({ text: `${i + 1}.  ${b}`, options: {} })),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 16, color: color(bodyCol) }
        );
        break;
      case "image-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        if (p.url) {
          try {
            const base64 = await fetchImageAsBase64(p.url);
            slide.addImage({ data: base64, x: 0.7, y: 1.6, w: 11.9, h: 4.5, sizing: { type: "contain", w: 11.9, h: 4.5 } });
          } catch (err) {
            console.warn("[modes/export] skipping unloadable image:", err instanceof Error ? err.message : err);
            slide.addText("Image unavailable", { x: 0.7, y: 1.6, w: 11.9, h: 4.5, fontSize: 16, color: color(bodyCol), align: "center" });
          }
        }
        if (p.caption) {
          slide.addText(p.caption, { x: 0.7, y: 6.4, w: 11.9, h: 0.5, fontSize: 12, color: color(dimCol), align: "center" });
        }
        break;
      case "grid-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        slide.addText(
          (Array.isArray(p.items) ? p.items : []).map((c: { label?: string; detail?: string } | string) => {
            const label = typeof c === "string" ? c : c?.label;
            const detail = typeof c === "object" && c ? c.detail : "";
            return { text: detail ? `${label}\n${detail}` : label || "", options: { bullet: true } };
          }),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 14, color: color(bodyCol) }
        );
        break;
      case "numbered-steps":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        slide.addText(
          (Array.isArray(p.steps) ? p.steps : []).map((b: string, i: number) => ({ text: `${i + 1}.  ${b}`, options: {} })),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 16, color: color(bodyCol) }
        );
        break;
      case "statement-slide":
        if (p.overline) {
          slide.addText(p.overline, { x: 0.5, y: 1.6, w: 12.3, h: 0.4, fontSize: 13, bold: true, color: color(accentCol), align: "center" });
        }
        slide.addText(p.headline || "", { x: 0.5, y: 2.2, w: 12.3, h: 2.2, fontSize: 40, bold: true, color: color(titleCol), align: "center", valign: "middle" });
        if (p.sub) {
          slide.addText(p.sub, { x: 0.5, y: 4.6, w: 12.3, h: 0.8, fontSize: 18, color: color(bodyCol), align: "center" });
        }
        break;
      case "editorial-slide":
        if (p.overline) {
          slide.addText(p.overline, { x: 0.7, y: 0.6, w: 8, h: 0.4, fontSize: 12, bold: true, color: color(accentCol) });
        }
        slide.addText(p.headline || "", { x: 0.7, y: 1.1, w: 8, h: 1.4, fontSize: 30, bold: true, color: color(titleCol) });
        if (p.lede) {
          slide.addText(p.lede, { x: 0.7, y: 2.7, w: 8, h: 0.9, fontSize: 17, color: color(titleCol) });
        }
        if (p.body) {
          slide.addText(p.body, { x: 0.7, y: 3.8, w: 8, h: 2.8, fontSize: 13, color: color(bodyCol) });
        }
        if (p.stat) {
          slide.addText(
            [{ text: p.stat, options: { bold: true, fontSize: 44, color: color(accentCol) } }, { text: p.statLabel ? `\n${p.statLabel}` : "", options: { fontSize: 13, color: color(bodyCol) } }],
            { x: 9.3, y: 2.2, w: 3.3, h: 2.2, align: "left", valign: "middle" }
          );
        }
        break;
      case "media-split-slide": {
        const imgRight = (p.imageSide || "right") !== "left";
        const tx = imgRight ? 0.7 : 7;
        const ix = imgRight ? 7 : 0.7;
        slide.addText(p.title || "", { x: tx, y: 0.5, w: 5.8, h: 0.8, fontSize: 26, bold: true, color: color(titleCol) });
        const bodyParts: string[] = [];
        if (p.body) bodyParts.push(String(p.body));
        slide.addText(
          [...bodyParts.map((t) => ({ text: t, options: {} })), ...(Array.isArray(p.bullets) ? p.bullets : []).map((b: string) => ({ text: b, options: { bullet: true } }))],
          { x: tx, y: 1.5, w: 5.8, h: 5, fontSize: 15, color: color(bodyCol) }
        );
        if (p.url) {
          try {
            const base64 = await fetchImageAsBase64(p.url);
            slide.addImage({ data: base64, x: ix, y: 0.7, w: 5.8, h: 6, sizing: { type: "cover", w: 5.8, h: 6 } });
          } catch {
            slide.addText("Image unavailable", { x: ix, y: 0.7, w: 5.8, h: 6, fontSize: 14, color: color(dimCol), align: "center", valign: "middle" });
          }
        }
        break;
      }
      case "bleed-slide":
        if (p.url) {
          try {
            const base64 = await fetchImageAsBase64(p.url);
            slide.addImage({ data: base64, x: 0, y: 0, w: 13.33, h: 7.5, sizing: { type: "cover", w: 13.33, h: 7.5 } });
          } catch { /* flat background fallback below via overlay text */ }
        }
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 4.4, w: 13.33, h: 3.1, fill: { color: strip(theme.bg), transparency: 25 }, line: { color: strip(theme.bg) } });
        slide.addText(p.title || "", { x: 0.8, y: 4.8, w: 11.7, h: 1.2, fontSize: 36, bold: true, color: color(titleCol) });
        if (p.subtitle) {
          slide.addText(p.subtitle, { x: 0.8, y: 6.1, w: 11.7, h: 0.8, fontSize: 17, color: color(bodyCol) });
        }
        break;
      case "timeline-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        slide.addText(
          (Array.isArray(p.items) ? p.items : []).map((m: { date?: string; label?: string; detail?: string } | string) => {
            const o = typeof m === "string" ? { label: m } : m ?? {};
            return { text: `${o.date ? `${o.date} — ` : ""}${o.label || ""}${o.detail ? `: ${o.detail}` : ""}`, options: { bullet: true } };
          }),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 15, color: color(bodyCol) }
        );
        break;
      case "process-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        slide.addText(
          (Array.isArray(p.steps) ? p.steps : []).map((s: { label?: string; detail?: string } | string, i: number) => {
            const o = typeof s === "string" ? { label: s } : s ?? {};
            return { text: `${i + 1}.  ${o.label || ""}${o.detail ? ` — ${o.detail}` : ""}`, options: {} };
          }),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 15, color: color(bodyCol) }
        );
        break;
      case "compare-slide": {
        const variantLabel = p.variant && p.variant !== "vs-split" ? ` (${p.variant})` : "";
        slide.addText(`${p.title || ""}${variantLabel}`, { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        slide.addText(p.leftTitle || "Left", { x: 0.7, y: 1.6, w: 5.5, h: 0.5, fontSize: 14, bold: true, color: color(accentCol) });
        slide.addText(
          (Array.isArray(p.left) ? p.left : []).map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 0.7, y: 2.2, w: 5.5, h: 4, fontSize: 14, color: color(bodyCol) }
        );
        slide.addText(p.rightTitle || "Right", { x: 7, y: 1.6, w: 5.5, h: 0.5, fontSize: 14, bold: true, color: color(accentCol) });
        slide.addText(
          (Array.isArray(p.right) ? p.right : []).map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 7, y: 2.2, w: 5.5, h: 4, fontSize: 14, color: color(bodyCol) }
        );
        if (p.verdict) {
          slide.addText(p.verdict, { x: 0.7, y: 6.5, w: 11.9, h: 0.5, fontSize: 14, bold: true, color: color(accentCol), align: "center" });
        }
        break;
      }
      case "chart-slide": {
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        const labels = (Array.isArray(p.labels) ? p.labels : []).map(String);
        const values = (Array.isArray(p.values) ? p.values : []).map((v: unknown) => {
          const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
          return Number.isFinite(n) ? n : 0;
        });
        if (labels.length >= 2 && values.length >= 2) {
          const kind = p.chartType === "line" ? pptx.ChartType.line : p.chartType === "donut" ? pptx.ChartType.doughnut : pptx.ChartType.bar;
          slide.addChart(kind, [{ name: "Series", labels, values: values.slice(0, labels.length) }], {
            x: 0.7, y: 1.6, w: 11.9, h: 4.6,
            showLegend: false, showValue: true,
            chartColors: [strip(theme.accent), strip(theme.chip), "64748B", "A78BFA", "34D399", "FBBF24"],
          });
        }
        if (p.note) {
          slide.addText(p.note, { x: 0.7, y: 6.4, w: 11.9, h: 0.5, fontSize: 12, color: color(dimCol), align: "center" });
        }
        break;
      }
      case "diagram-slide": {
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: color(titleCol) });
        const nodes = (Array.isArray(p.nodes) ? p.nodes : []).slice(0, 6).map((n: { label?: string } | string) =>
          typeof n === "string" ? n : n?.label || "");
        const vertical = p.direction === "vertical";
        nodes.forEach((label: string, i: number) => {
          const x = vertical ? 5.4 : 0.7 + i * (11.9 / Math.max(nodes.length, 1));
          const y = vertical ? 1.7 + i * 0.95 : 3.2;
          const w = vertical ? 2.5 : Math.min(2.4, 11.9 / Math.max(nodes.length, 1) - 0.25);
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y, w, h: 0.75,
            fill: { color: strip(theme.bg) }, line: { color: strip(theme.accent), width: 1.5 },
            text: { text: label || `Step ${i + 1}`, options: { fontSize: 12, bold: true, color: color(titleCol), align: "center", valign: "middle" } },
          } as never);
        });
        break;
      }
      default:
        slide.addText(p.title || block.type, { x: 0.7, y: 2.8, w: 12, h: 1, fontSize: 28, bold: true, color: color(titleCol), align: "center" });
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" }) as unknown as Buffer;
  return Buffer.from(buffer);
}

function isDarkHex(hex: string): boolean {
  const { r, g, b } = parseHex6(strip(hex));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function parseHex6(hex: string): { r: number; g: number; b: number } {
  const num = parseInt(hex || "000000", 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

async function fetchImageAsBase64(url: string): Promise<string> {
  // In-app attachment assets resolve straight from the DB (relative URLs
  // can't be fetched server-side without an origin).
  if (url.startsWith("/api/attachments/")) {
    const id = url.split("/").pop()?.split("?")[0];
    if (!id) throw new Error("bad attachment url");
    const { default: prisma } = await import("@/lib/db");
    const att = await prisma.attachment.findFirst({
      where: { id },
      select: { blob: true, mimeType: true },
    });
    if (!att) throw new Error("attachment not found");
    return `data:${att.mimeType || "image/png"};base64,${Buffer.from(att.blob).toString("base64")}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/*" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type")?.split(";")[0] || "image/png";
    return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
  } finally {
    clearTimeout(timeoutId);
  }
}