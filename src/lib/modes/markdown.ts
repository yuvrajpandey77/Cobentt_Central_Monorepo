import { Artifact, ArtifactBlock, makeId } from "./types";

export function blocksToMarkdown(artifact: Artifact): string {
  const out: string[] = [];
  if (artifact.title) {
    out.push(`# ${artifact.title}`, "");
  }
  for (const block of artifact.blocks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = block.props as any;
    switch (block.type) {
      case "heading":
        out.push(`${"#".repeat(p.level === "h1" ? 1 : p.level === "h3" ? 3 : 2)} ${p.text || ""}`, "");
        break;
      case "paragraph":
        out.push(p.text || "", "");
        break;
      case "bullets":
        (p.items || []).forEach((item: string) => out.push(`- ${item}`));
        out.push("");
        break;
      case "code":
        out.push("```" + (p.language || "") + "\n" + (p.code || "") + "\n```", "");
        break;
      case "quote":
        out.push(`> ${p.text || ""}`);
        if (p.attribution) out.push(`>\n> — ${p.attribution}`);
        out.push("");
        break;
      case "table":
        const headers = p.headers || [];
        const rows = p.rows || [];
        if (headers.length) {
          out.push(`| ${headers.join(" | ")} |`);
          out.push(`| ${headers.map(() => "---").join(" | ")} |`);
          rows.forEach((row: string[]) => out.push(`| ${row.join(" | ")} |`));
          out.push("");
        }
        break;
      default:
        if (p.text) out.push(p.text, "");
    }
  }
  return out.join("\n");
}

export function markdownToBlocks(md: string): ArtifactBlock[] {
  const blocks: ArtifactBlock[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const language = line.replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        id: makeId(),
        type: "code",
        props: { code: codeLines.join("\n"), language },
      });
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = (line.match(/^#+/) || [""])[0].length;
      blocks.push({
        id: makeId(),
        type: "heading",
        props: { text: line.replace(/^#+\s*/, ""), level: `h${level}` },
      });
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        id: makeId(),
        type: "quote",
        props: {
          text: quoteLines.filter((l) => !l.startsWith("—") && l.trim()).join(" "),
          attribution: quoteLines.find((l) => l.startsWith("—"))?.replace("—", "").trim() || "",
        },
      });
      continue;
    }

    if (/^[-*+]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && (/^[-*+]\s/.test(lines[i]) || /^\d+\.\s/.test(lines[i]))) {
        items.push(lines[i].replace(/^[-*+]\s/, "").replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ id: makeId(), type: "bullets", props: { items } });
      continue;
    }

    if (/^\|/.test(line) && lines[i + 1] && /^\|\s*:?-+\s*\|/.test(lines[i + 1])) {
      const headerRow = line.split("|").filter((s) => s.trim()).map((s) => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i].split("|").filter((s) => s.trim()).map((s) => s.trim()));
        i++;
      }
      blocks.push({ id: makeId(), type: "table", props: { headers: headerRow, rows } });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    blocks.push({ id: makeId(), type: "paragraph", props: { text: line.trim() } });
    i++;
  }

  return blocks;
}
