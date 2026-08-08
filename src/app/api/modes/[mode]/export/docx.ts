import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";
import { SLIDE_THEMES } from "@/lib/modes/definitions";

type Palette = { bg: string; accent: string; text: string; muted: string; chip: string };

function resolveTheme(artifact: { theme?: string }): Palette {
  const t = SLIDE_THEMES.find((t) => t.id === artifact.theme);
  return t ?? SLIDE_THEMES[0];
}

const strip = (hex: string) => String(hex || "").replace("#", "").toUpperCase();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textColor(blockStyle: any, theme: Palette, fallback: string): string {
  if (blockStyle?.color) return strip(blockStyle.color);
  return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildDocx(artifact: any): Promise<Buffer> {
  const theme = resolveTheme(artifact);
  const isDark = parseInt(theme.bg.replace("#", ""), 16) < 0x777777;
  const titleCol = strip(theme.text);
  const bodyCol = isDark ? "E4E4E7" : "374151";
  const headingCol = strip(theme.accent);

  const blocks = Array.isArray(artifact.blocks) ? artifact.blocks : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];

  if (artifact.title) {
    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: artifact.title, bold: true, size: 40, color: titleCol })],
    }));
  }

  for (const block of blocks) {
    const p = block.props || {};
    const color = (fallback: string) => textColor(block.style, theme, fallback);
    switch (block.type) {
      case "heading":
        children.push(new Paragraph({
          heading: p.level === "h1" ? HeadingLevel.HEADING_1 : p.level === "h3" ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
          children: [new TextRun({ text: p.text || "", bold: true, color: color(headingCol) })],
        }));
        break;
      case "paragraph":
        children.push(new Paragraph({ children: [new TextRun({ text: p.text || "", color: color(bodyCol) })] }));
        break;
      case "bullets":
        (Array.isArray(p.items) ? p.items : []).forEach((item: string) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: item, color: color(bodyCol) })],
            bullet: { level: 0 },
          }));
        });
        break;
      case "code":
        (p.code || "").split("\n").forEach((line: string) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, font: "Consolas", size: 18, color: "00A67E" })],
          }));
        });
        break;
      case "quote":
        children.push(new Paragraph({
          children: [new TextRun({ text: p.text || "", italics: true, color: color(bodyCol) })],
          indent: { left: 720 },
          border: { left: { style: BorderStyle.SINGLE, size: 6, color: strip(theme.accent) } },
        }));
        break;
      case "table": {
        const headers = Array.isArray(p.headers) ? p.headers : [];
        const rows = Array.isArray(p.rows) ? p.rows : [];
        const allRows = [headers, ...rows];
        const accent = strip(p.accentColor || theme.accent);
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: allRows.map((row, i) => new TableRow({
            children: row.map((cell: string) => new TableCell({
              shading: i === 0 ? { type: "clear", fill: accent, color: "auto" } : undefined,
              children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? ""), bold: i === 0, color: i === 0 ? "#FFFFFF" : bodyCol })] })],
            })),
          })),
        }));
        break;
      }
      case "checklist":
        (Array.isArray(p.items) ? p.items : []).forEach((item: { text?: string; done?: boolean }) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: `${item.done ? "☑" : "☐"} ${item.text || ""}`, color: color(bodyCol) })],
          }));
        });
        break;
      case "callout": {
        const tone = p.tone || "info";
        const fallbackFill = tone === "danger" ? "DC2626" : tone === "warning" ? "D97706" : tone === "success" ? "16A34A" : strip(theme.accent);
        children.push(new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: `${fallbackFill}1A`, color: "auto" },
          border: { left: { style: BorderStyle.SINGLE, size: 6, color: fallbackFill } },
          children: [new TextRun({ text: p.text || "", color: color(bodyCol) })],
        }));
        break;
      }
      case "divider":
        children.push(new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: strip(theme.accent) } } }));
        break;
      default:
        children.push(new Paragraph({ children: [new TextRun({ text: String(p.text || ""), color: color(bodyCol) })] }));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { color: bodyCol, font: "Segoe UI" },
        },
      },
    },
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}