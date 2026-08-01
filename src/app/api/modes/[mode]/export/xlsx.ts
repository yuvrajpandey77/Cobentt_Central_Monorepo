import * as XLSX from "xlsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildXlsx(artifact: any): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  const blocks = Array.isArray(artifact.blocks) ? artifact.blocks : [];

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
      aoa.push(row.slice(0, Math.max(columns.length, 1)));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, String(p.name || "Sheet1").slice(0, 31));
  }

  if (blocks.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["A1"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}
