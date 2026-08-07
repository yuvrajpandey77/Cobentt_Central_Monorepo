import { ModeDefinition, Artifact, ModeKey } from "./types";
import { MODE_DEFINITIONS, RESEARCH_MODE } from "./definitions";

function blockTypeNames(def: ModeDefinition): string {
  return def.blockTypes.map((b) => `  - "${b.type}" (${b.label})`).join("\n");
}

function blockTypeSchema(def: ModeDefinition): string {
  return def.blockTypes
    .map((b) => {
      const fields = b.properties
        .map((p) => `    "${p.key}": <${p.type === "number" ? "number" : p.type === "list" ? "string[]" : "string"}>`)
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
  attachmentContext?: string
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

  return `You are an expert content designer for the "${def.label}" mode of the Cobentt app.

${attachmentSection}
${editSection}

${template ? `Use this template style: ${template.label}. ${template.description}` : ""}

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
- ${currentArtifact ? "Apply the user's edit to the existing document and return the FULL updated document." : "Cover the user's topic thoroughly with 5-12 blocks."}
- Make content specific and concrete, never generic placeholders.`;
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
