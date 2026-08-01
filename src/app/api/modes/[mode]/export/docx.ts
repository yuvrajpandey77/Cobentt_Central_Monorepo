import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildDocx(artifact: any): Promise<Buffer> {
  const blocks = Array.isArray(artifact.blocks) ? artifact.blocks : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];

  if (artifact.title) {
    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: artifact.title, bold: true, size: 40 })],
    }));
  }

  for (const block of blocks) {
    const p = block.props || {};
    switch (block.type) {
      case "heading":
        children.push(new Paragraph({
          heading: p.level === "h1" ? HeadingLevel.HEADING_1 : p.level === "h3" ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
          children: [new TextRun({ text: p.text || "", bold: true })],
        }));
        break;
      case "paragraph":
        children.push(new Paragraph({ children: [new TextRun({ text: p.text || "" })] }));
        break;
      case "bullets":
        (Array.isArray(p.items) ? p.items : []).forEach((item: string) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: item })],
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
          children: [new TextRun({ text: p.text || "", italics: true })],
          indent: { left: 720 },
          border: { left: { style: BorderStyle.SINGLE, size: 6, color: "8B5CF6" } },
        }));
        break;
      case "table": {
        const headers = Array.isArray(p.headers) ? p.headers : [];
        const rows = Array.isArray(p.rows) ? p.rows : [];
        const allRows = [headers, ...rows];
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: allRows.map((row, i) => new TableRow({
            children: row.map((cell: string) => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? ""), bold: i === 0 })] })],
            })),
          })),
        }));
        break;
      }
      default:
        children.push(new Paragraph({ children: [new TextRun({ text: String(p.text || "") })] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
