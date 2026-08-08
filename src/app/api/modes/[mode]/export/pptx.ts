import PptxGenJS from "pptxgenjs";
import { SLIDE_THEMES } from "@/lib/modes/definitions";

type Palette = { bg: string; accent: string; text: string; muted: string; chip: string };

function resolveTheme(artifact: { theme?: string }): Palette {
  const t = SLIDE_THEMES.find((t) => t.id === artifact.theme);
  return t ?? SLIDE_THEMES[0];
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