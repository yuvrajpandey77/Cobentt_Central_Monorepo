import * as XLSX from "xlsx";
import { SLIDE_THEMES } from "@/lib/modes/definitions";

const strip = (hex: string) => String(hex || "").replace("#", "");

// Write formula cells so they recalculate when opened.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cellToValue(v: any): any {
  if (typeof v === "string" && v.startsWith("=")) {
    return { f: v.slice(1) };
  }
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildXlsx(artifact: any): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  const blocks = Array.isArray(artifact.blocks) ? artifact.blocks : [];
  const theme = SLIDE_THEMES.find((t) => t.id === artifact.theme) ?? SLIDE_THEMES[0];
  const accent = strip(artifact.accentColor || theme.accent);

  let sheetIndex = 0;
  for (const block of blocks) {
    const p = block.props || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columns: any[] = Array.isArray(p.columns) ? p.columns : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[][] = Array.isArray(p.rows) ? p.rows : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aoa: any[][] = [];
    if (columns.length > 0) {
      aoa.push(columns.map((c) => c.header ?? c.key ?? ""));
    }
    for (const row of rows) {
      aoa.push(row.slice(0, Math.max(columns.length, 1)).map((c) => cellToValue(c)));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths (heuristic: header length + pad)
    const colWidths: { wch: number }[] = [];
    for (let i = 0; i < (columns.length || 1); i++) {
      let max = columns[i]?.header?.length || 10;
      for (const row of rows) {
        const cell = row[i];
        if (cell != null) max = Math.max(max, String(cell).length);
      }
      colWidths.push({ wch: Math.min(Math.max(max + 3, 12), 60) });
    }
    ws["!cols"] = colWidths;

    // Header row styling: fill with accent color + white bold text
    ws["!rows"] = [{ hpt: 22 }];
    for (let c = 0; c < Math.max(columns.length, 1); c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      const cell = ws[addr];
      if (!cell) continue;
      cell.s = {
        font: { bold: true, color: { rgb: lightText(accent) } },
        fill: { fgColor: { rgb: accent }, patternType: "solid" },
        alignment: { vertical: "center" },
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, String(p.name || `Sheet${sheetIndex + 1}`).slice(0, 31));
    sheetIndex++;
  }

  if (blocks.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["A1"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}

function lightText(hexBg: string): string {
  // pick black or white text depending on background luminance
  const h = strip(hexBg);
  const num = parseInt(h || "000000", 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 128 ? "FFFFFF" : "111827";
}