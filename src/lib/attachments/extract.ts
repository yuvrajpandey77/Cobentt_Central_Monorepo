import * as XLSX from "xlsx";
import JSZip from "jszip";

const MAX_EXTRACT_CHARS = 40_000;

function truncate(text: string): string {
  return text.trim().slice(0, MAX_EXTRACT_CHARS);
}

async function extractPdf(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(buffer) });
    try {
      const result = await parser.getText();
      const text = typeof result?.text === "string" ? result.text : "";
      return truncate(text) || null;
    } finally {
      await parser.destroy();
    }
  } catch (err) {
    console.warn("[attachment-extract] PDF parse failed:", err);
    return null;
  }
}

async function extractDocx(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return truncate(result.value) || null;
  } catch (err) {
    console.warn("[attachment-extract] DOCX parse failed:", err);
    return null;
  }
}

async function extractPptx(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const entries = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort(
        (a, b) =>
          Number(a.match(/slide(\d+)\.xml/)?.[1] ?? 0) -
          Number(b.match(/slide(\d+)\.xml/)?.[1] ?? 0)
      );
    const parts: string[] = [];
    for (const name of entries) {
      const xml = await zip.file(name)?.async("string");
      if (!xml) continue;
      const text = xml
        .replace(/<a:t>([^<]*)<\/a:t>/g, "$1\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, " ")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .join("\n");
      if (text) parts.push(text);
    }
    return truncate(parts.join("\n\n")) || null;
  } catch (err) {
    console.warn("[attachment-extract] PPTX parse failed:", err);
    return null;
  }
}

function extractXlsx(buffer: ArrayBuffer): string | null {
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      if (csv.trim()) parts.push(`--- ${sheetName} ---\n${csv}`);
    }
    return truncate(parts.join("\n\n")) || null;
  } catch (err) {
    console.warn("[attachment-extract] XLSX parse failed:", err);
    return null;
  }
}

/**
 * Extract human-readable text from a supported file so it can be fed to the
 * AI as context. Returns null when the type is unsupported or extraction fails.
 */
export async function extractAttachmentText(
  buffer: ArrayBuffer,
  mimeType: string,
  fileName?: string
): Promise<string | null> {
  const lower = fileName?.toLowerCase() ?? "";
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    return extractPdf(buffer);
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    return extractDocx(buffer);
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lower.endsWith(".pptx")
  ) {
    return extractPptx(buffer);
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls")
  ) {
    return extractXlsx(buffer);
  }
  return null;
}
