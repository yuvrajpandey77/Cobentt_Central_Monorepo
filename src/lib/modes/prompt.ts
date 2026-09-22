import { ModeDefinition, Artifact, ModeKey } from "./types";
import { MODE_DEFINITIONS, RESEARCH_MODE } from "./definitions";

function blockTypeNames(def: ModeDefinition): string {
  return def.blockTypes.map((b) => `  - "${b.type}" (${b.label})`).join("\n");
}

function blockTypeSchema(def: ModeDefinition): string {
  return def.blockTypes
    .map((b) => {
      const fields = b.properties
        .map((p) => {
          if (p.type === "number") return `    "${p.key}": <number>`;
          if (p.type === "list") return `    "${p.key}": <string[]>`;
          if (p.type === "object-list") {
            const inner = (p.itemFields ?? [{ key: "label", label: "Label" }])
              .map((f) => `"${f.key}": <string${f.key === "from" || f.key === "to" ? "|number" : ""}>`)
              .join(", ");
            return `    "${p.key}": <Array<{${inner}}>>`;
          }
          return `    "${p.key}": <string>`;
        })
        .join("\n");
      return `  {
    "type": "${b.type}",
    "props": {
${fields}
    }
  }`;
    })
    .join(",\n");
}

export function buildModePrompt(
  mode: ModeKey,
  userMessage: string,
  templateId?: string,
  currentArtifact?: Artifact,
  attachmentContext?: string,
  opts?: { slideCount?: number; themeBrief?: string; plan?: string }
): string {
  const def = MODE_DEFINITIONS[mode];
  if (!def) {
    throw new Error(`No definition for mode: ${mode}`);
  }
  const template = def.templates.find((t) => t.id === templateId);

  const attachmentSection = attachmentContext
    ? `
The user attached a file. Use its content as the source material for this task. Here is the extracted text from the attachment:
${attachmentContext}
`
    : "";

  const editSection = currentArtifact
    ? `
The user is EDITING an existing document. Apply the requested change to the current document. Here is its current JSON:

${JSON.stringify(currentArtifact, null, 2)}

Changes to make:
- If the user changes the title, update "title" accordingly.
- Update, add, or remove blocks to reflect the request.
- Keep all unrelated blocks and content intact unless the user asks to change them.
- Preserve every block's structure and only adjust what is requested.

Respond ONLY with the FULL updated JSON object (same shape as the current document).`
    : `
The user wants you to create a ${def.label.toLowerCase()} with this request:
"""${userMessage}"""`;

  const countHint = opts?.slideCount
    ? `The user explicitly asked for EXACTLY ${opts.slideCount} slides. Your "blocks" array MUST contain exactly ${opts.slideCount} items — no more, no fewer.`
    : "";
  const themeHint = opts?.themeBrief ? `Visual theme override from the user: ${opts.themeBrief}` : "";
  const planSection = opts?.plan
    ? `\nPRESENTATION PLAN (established by the presentation architect — FOLLOW IT EXACTLY):\n${opts.plan}\n\nRules for the plan:\n- The planner owns story, per-slide purpose, layout family, and visual need. Do NOT reinvent the structure.\n- You own copy, details, and structured slide content. Map each planned slide to blocks in order.\n- Each block MAY carry optional design-intent fields: "purpose", "message" (one-sentence takeaway), "density" (sparse|balanced|dense), "layout" {family, variant, shell, ratio}, "visual" {need, concept}.\n- Set "layout.family" to the planned family and "type" to the matching block type.\n`
    : "";

  const designerBrief =
    mode === "slides"
      ? `
You are the presentation DESIGNER, not a template filler. For every slide, decide how the information should be communicated visually:
- WHY does this slide exist (purpose)? WHAT is its single message? HOW MUCH information is required (density)?
- Does it need a visual, and what kind (photo / chart / diagram / icon / none)? What should dominate attention? What can be removed?
- Layout follows communication intent — NEVER pick a layout just because it is available.

ANTI-CARD RULES (hard):
- Cards/grids are NOT the default. Use them only for discrete items, comparable entities, grouped info, or modular features.
- Do NOT use cards for: single statements, emotional messages, timelines, processes, diagrams, quotes, hero moments, image-led storytelling.
- A slide with one message should be a statement/hero/bleed slide with large display typography — powerful with almost nothing on it.
- Prefer: statement for claims, metrics/chart for numbers, timeline for progression, process for flows, diagram for systems, compare variants (vs-split/before-after/pros-cons/table/migration) for relationships, media-split/bleed for image-led moments, editorial for ideas with authority.
- RHYTHM: never use the same layout family twice in a row unless the story justifies it. Alternate typographic moments, evidence, visuals, comparisons.
- DENSITY: sparse = large type, minimal copy. If content overflows, SHORTEN or RESTRUCTURE — never just shrink type. Dense content belongs in grids, tables, diagrams, or multi-column editorial.
- Charts: provide real structured labels+values. Diagrams: provide semantic nodes+edges (the renderer controls geometry).
`
      : "";

  return `You are an expert content designer for the "${def.label}" mode of the Cobentt app.
${designerBrief}
${attachmentSection}
${editSection}

${template ? `Use this visual system: ${template.label}. ${template.designDirection || template.description}` : ""}
${themeHint}
${countHint}
${planSection}

Respond ONLY with a valid JSON object, no markdown code fences, no commentary. The JSON must match exactly:

{
  "title": "<document title>",
  "theme": "<optional theme name>",
  "blocks": [
${blockTypeSchema(def)}
  ]
}

Allowed block types:
${blockTypeNames(def)}

Rules:
- Each block MUST have "type" and "props".
- "props" must only contain the fields listed for that block type.
- Every block that has a "text"/"title"/"quote" field must have meaningful, complete content based on the user request.
- ${currentArtifact ? "Apply the user's edit to the existing document and return the FULL updated document." : opts?.slideCount ? `Generate EXACTLY ${opts.slideCount} blocks.` : "Cover the user's topic thoroughly with 5-12 blocks."}
- Make content specific and concrete, never generic placeholders.
- For slides, create a visual rhythm: alternate hero, statement, comparison, proof, quote, metric, image-led (media-split/bleed), timeline/process/diagram, chart, and closing layouts where they serve the story. Avoid repeating the same layout more than twice in a row.
- For slides, use ${template?.theme ? `the "${template.theme}" theme` : "a theme that supports the topic"}; make the title and each slide's copy presentation-ready, not a document pasted onto slides.
- For slides, every block SHOULD include "purpose", "message", and "density" fields, and a "layout" object {family, variant, shell} matching its type (e.g. type "statement-slide" → layout.family "statement"). This is how the renderer understands design intent.`;
}

export function buildResearchPrompt(userMessage: string, templateId?: string): string {
  const template = RESEARCH_MODE.templates.find((t) => t.id === templateId);
  return `You are an expert research analyst. Conduct deep research on the topic below and produce a comprehensive, well-cited report.

Topic:
"""${userMessage}"""

${template ? `Style: ${template.label} — ${template.description}` : ""}

Respond ONLY with valid JSON, no markdown code fences. Shape:

{
  "title": "<report title>",
  "sections": [
    {
      "heading": "<section heading>",
      "content": "<markdown-formatted section content>"
    }
  ],
  "sources": [
    { "title": "<source title>", "url": "<source url>" }
  ],
  "summary": "<1-2 sentence executive summary>"
}

Rules:
- 4-8 sections covering background, key findings, analysis, and outlook.
- Include realistic, plausible sources in the "sources" array (authoritative domains).
- Content should be markdown with headings, bullets, and emphasis where useful.
- Never fabricate statistics; phrase uncertain data as estimates.`;
}

export function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return match[1].trim();
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

export function parseArtifact(text: string): Artifact {
  const json = JSON.parse(extractJson(text)) as Artifact;
  if (!json.title || !Array.isArray(json.blocks)) {
    throw new Error("Invalid artifact: missing title or blocks");
  }
  return json;
}
