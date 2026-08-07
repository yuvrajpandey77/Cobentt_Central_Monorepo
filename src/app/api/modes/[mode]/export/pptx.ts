import PptxGenJS from "pptxgenjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildPptx(artifact: any): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";

  const blocks = Array.isArray(artifact.blocks) ? artifact.blocks : [];

  for (const block of blocks) {
    const p = block.props || {};
    const slide = pptx.addSlide();
    slide.background = { color: "111418" };

    switch (block.type) {
      case "title-slide":
        slide.addText(p.title || "", {
          x: 0.5, y: 2.5, w: 12.3, h: 1.2,
          fontSize: 40, bold: true, color: "FFFFFF", align: "center",
        });
        if (p.subtitle) {
          slide.addText(p.subtitle, { x: 0.5, y: 3.9, w: 12.3, h: 0.6, fontSize: 18, color: "A1A1AA", align: "center" });
        }
        if (p.author) {
          slide.addText(p.author, { x: 0.5, y: 4.7, w: 12.3, h: 0.4, fontSize: 12, color: "71717A", align: "center" });
        }
        break;
      case "content-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
        slide.addText(
          (Array.isArray(p.bullets) ? p.bullets : []).map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 16, color: "E4E4E7" }
        );
        break;
      case "quote-slide":
        slide.addText(`"${p.quote || ""}"`, { x: 0.7, y: 2.6, w: 12, h: 1.5, fontSize: 22, italic: true, color: "FFFFFF", align: "center" });
        if (p.citation) {
          slide.addText(`— ${p.citation}`, { x: 0.7, y: 4.3, w: 12, h: 0.5, fontSize: 14, color: "A1A1AA", align: "center" });
        }
        break;
      case "two-column-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
        slide.addText(p.leftTitle || "Left", { x: 0.7, y: 1.6, w: 5.5, h: 0.5, fontSize: 14, bold: true, color: "A1A1AA" });
        slide.addText(
          (Array.isArray(p.left) ? p.left : []).map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 0.7, y: 2.2, w: 5.5, h: 4.5, fontSize: 14, color: "E4E4E7" }
        );
        slide.addText(p.rightTitle || "Right", { x: 7, y: 1.6, w: 5.5, h: 0.5, fontSize: 14, bold: true, color: "A1A1AA" });
        slide.addText(
          (Array.isArray(p.right) ? p.right : []).map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 7, y: 2.2, w: 5.5, h: 4.5, fontSize: 14, color: "E4E4E7" }
        );
        break;
      case "closing-slide":
        slide.addText(p.title || "", { x: 0.5, y: 2.6, w: 12.3, h: 1.2, fontSize: 40, bold: true, color: "FFFFFF", align: "center" });
        if (p.subtitle) {
          slide.addText(p.subtitle, { x: 0.5, y: 4, w: 12.3, h: 0.6, fontSize: 18, color: "A1A1AA", align: "center" });
        }
        if (p.contact) {
          slide.addText(p.contact, { x: 0.5, y: 4.8, w: 12.3, h: 0.4, fontSize: 12, color: "71717A", align: "center" });
        }
        break;
      case "agenda-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
        slide.addText(
          (Array.isArray(p.items) ? p.items : []).map((b: string, i: number) => ({ text: `${i + 1}.  ${b}`, options: {} })),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 16, color: "E4E4E7" }
        );
        break;
      case "image-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
        if (p.url) {
          slide.addImage({ path: p.url, x: 0.7, y: 1.6, w: 11.9, h: 4.5, sizing: { type: "contain", w: 11.9, h: 4.5 } });
        }
        if (p.caption) {
          slide.addText(p.caption, { x: 0.7, y: 6.4, w: 11.9, h: 0.5, fontSize: 12, color: "A1A1AA", align: "center" });
        }
        break;
      case "grid-slide":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
        slide.addText(
          (Array.isArray(p.items) ? p.items : []).map((c: { label?: string; detail?: string } | string) => {
            const label = typeof c === "string" ? c : c?.label;
            const detail = typeof c === "object" && c ? c.detail : "";
            return { text: detail ? `${label}\n${detail}` : label || "", options: { bullet: true } };
          }),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 14, color: "E4E4E7" }
        );
        break;
      case "numbered-steps":
        slide.addText(p.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
        slide.addText(
          (Array.isArray(p.steps) ? p.steps : []).map((b: string, i: number) => ({ text: `${i + 1}.  ${b}`, options: {} })),
          { x: 0.7, y: 1.6, w: 11.5, h: 5, fontSize: 16, color: "E4E4E7" }
        );
        break;
      default:
        slide.addText(p.title || block.type, { x: 0.7, y: 2.8, w: 12, h: 1, fontSize: 28, bold: true, color: "FFFFFF", align: "center" });
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" }) as unknown as Buffer;
  return Buffer.from(buffer);
}
